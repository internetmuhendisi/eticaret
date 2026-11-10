// @vitest-environment jsdom
// Düzen alanının çizimi (kart 0106): bölümler sırasıyla ve seçilen görünümle çizilir, aynı türden iki bölüm
// ayrı ayrı çizilir, bozulan bölüm sayfanın geri kalanını düşürmez (tarayıcıda ve sunucuda), görünüşü olmayan
// tür çizilmez.
import { randomUUID } from "node:crypto";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { denemeGorunumleri } from "../../../katalog/deneme-bolumu/gorunum.tsx";
import { yazilanIslevler } from "../../../kayitlar/islevler.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import { DuzenAlaniCizimi } from "../../duzen-alani.tsx";
import type { VitrinBaglami } from "../baglam.ts";
import type { BolumOrnegi } from "../duzen.ts";
import type { BolumGorunumleri } from "../gorunumler.tsx";

const metin = metinOkuyucu("tr");

const bolum = (tur: string, degerler: Record<string, unknown>, gorunum = "genis"): BolumOrnegi => ({
  kimlik: randomUUID(),
  tur,
  gorunum,
  gizli: false,
  degerler,
});

function BozukGorunum(): never {
  throw new Error("bölüm bilerek bozuldu");
}
const bozukluGorunumler: BolumGorunumleri = { ...denemeGorunumleri, "bozuk-bolum": BozukGorunum };

// Deneme bölümleri bağlamı kullanmaz; üst ve alt kısım bölümlerinin bağlamı ust-alt-bolumler.test.tsx'tedir.
const baglam: VitrinBaglami = {
  magazaAdi: "Deneme",
  musteriOturumu: "ornek",
  iletisim: {},
  sosyalHesaplar: [],
  odemeIsaretleri: [],
  menuler: {},
  islevler: yazilanIslevler,
  gorseller: {},
  kategoriler: {},
  markalar: {},
  urunler: {},
  an: new Date("2026-01-01T00:00:00Z"),
  yerTutucular: {},
  parcaGorunumleri: { "urun-karti": "dikey" },
  sayilar: {},
  yil: "2026",
};

const agac = (bolumler: BolumOrnegi[], gorunumler = bozukluGorunumler) => (
  <MetinSaglayici dil="tr">
    <DuzenAlaniCizimi bolumler={bolumler} gorunumler={gorunumler} baglam={baglam} />
  </MetinSaglayici>
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("düzen alanının çizimi", () => {
  it("aynı türden iki bölüm sırasıyla ve kendi görünümüyle çizilir", () => {
    render(
      agac([
        bolum("deneme-bolumu", { baslik: "Birinci", zemin: "kutu-2" }),
        bolum("deneme-bolumu", { baslik: "İkinci" }, "dar"),
      ]),
    );
    const basliklar = screen.getAllByRole("heading", { level: 2 });
    expect(basliklar.map((baslik) => baslik.textContent)).toEqual(["Birinci", "İkinci"]);
    const kartlar = basliklar.map((baslik) => baslik.closest("[data-slot=kart]"));
    expect(kartlar[0]?.className).toContain("bg-kutu-2");
    expect(kartlar[1]?.className).toContain("max-w-form");
  });

  it("bozulan bölüm yalnız kendi yerinde uyarı gösterir, ötekiler çizilir", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      agac([
        bolum("deneme-bolumu", { baslik: "Önce" }),
        bolum("bozuk-bolum", {}),
        bolum("deneme-seridi", { metin: "Sonra" }),
      ]),
    );
    expect(screen.getByRole("alert").textContent).toBe(metin("ortak.hata.bolumGosterilemiyor"));
    expect(screen.getByText("Önce")).toBeDefined();
    expect(screen.getByText("Sonra")).toBeDefined();
  });

  it("sunucuda çizilirken bozulan bölüm sayfayı düşürmez", () => {
    let html = "";
    expect(() => {
      html = renderToString(
        agac([bolum("bozuk-bolum", {}), bolum("deneme-seridi", { metin: "Sağlam" })]),
      );
    }).not.toThrow();
    expect(html).toContain("Sağlam");
  });

  it("görünüşü olmayan tür çizilmez", () => {
    render(agac([bolum("gorunussuz", {}), bolum("deneme-seridi", { metin: "Var" })]));
    expect(screen.getByText("Var")).toBeDefined();
    expect(document.body.textContent).toBe("Var");
  });
});
