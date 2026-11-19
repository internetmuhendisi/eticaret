// @vitest-environment jsdom
// Kayıt arama parçası (kart 0143, karar 0116): kutu yalnız öneriler görünürken "açık"tır (aria-expanded), istek yazma
// durunca gider, ok tuşu ve Enter seçer, Escape listeyi kapatır, seçimden sonra yazı değişince seçim bırakılır,
// yetkisi olmayana nedeni yazar. Uç sahte fetch ile verilir.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import type { BulunanKayit } from "../../moduller/urun/kayit-arama.ts";
import { KayitArama } from "../kayit-arama.tsx";

const metin = metinOkuyucu("tr");
const etiket = "Kategori";

let yanit: () => Response;
const istekler: string[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  istekler.length = 0;
  yanit = () =>
    Response.json({
      basarili: true,
      veri: {
        kayitlar: [
          { kimlik: "k1", ad: "Giyim" },
          { kimlik: "k2", ad: "Giyim › Kadın" },
        ],
        dahaVar: false,
      },
    });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string) => {
      istekler.push(adres);
      return yanit();
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const secilenler: (BulunanKayit | undefined)[] = [];
function Deneme() {
  const [secili, setSecili] = useState<BulunanKayit | undefined>(undefined);
  return (
    <KayitArama
      tur="kategori"
      etiket={etiket}
      secili={secili}
      sec={(kayit) => {
        secilenler.push(kayit);
        setSecili(kayit);
      }}
    />
  );
}

// Kendi aramasıyla kutu (kart 0236): çağrılar ve hata testten ayarlanır.
const cagrilar: string[] = [];
const durum = { hata: false };
function KendiAramasi() {
  return (
    <KayitArama
      ara={async (aranan) => {
        cagrilar.push(aranan);
        return durum.hata
          ? { tamam: false as const, kod: "dogrulama", ayrinti: [] }
          : {
              tamam: true as const,
              veri: { kayitlar: [{ kimlik: "u1", ad: "Termos" }], dahaVar: false },
            };
      }}
      etiket={etiket}
      secili={undefined}
      sec={() => {}}
      secinceBosalt
    />
  );
}

const ciz = () =>
  render(
    <MetinSaglayici dil="tr">
      <Deneme />
    </MetinSaglayici>,
  );

const yaz = async (kutu: HTMLElement, deger: string) => {
  fireEvent.change(kutu, { target: { value: deger } });
  // Yazma durduktan sonra istek gider, cevabı beklenir.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
};

describe("kayıt arama", () => {
  it("öneriler görünene kadar kapalıdır; ok ve Enter seçer; yazı değişince seçim bırakılır", async () => {
    secilenler.length = 0;
    ciz();
    const kutu = screen.getByRole("combobox", { name: etiket });
    fireEvent.focus(kutu);
    expect(kutu.getAttribute("aria-expanded")).toBe("false");
    await yaz(kutu, "giy");
    expect(istekler.at(-1)).toBe("/kapi/yonetici/kayit-ara?tur=kategori&ara=giy&sayfa=0");
    expect(kutu.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Giyim",
      "Giyim › Kadın",
    ]);
    fireEvent.keyDown(kutu, { key: "ArrowDown" });
    fireEvent.keyDown(kutu, { key: "ArrowDown" });
    expect(kutu.getAttribute("aria-activedescendant")).toBe(
      screen.getAllByRole("option")[1]?.getAttribute("id"),
    );
    fireEvent.keyDown(kutu, { key: "Enter" });
    expect(secilenler.at(-1)).toEqual({ kimlik: "k2", ad: "Giyim › Kadın" });
    expect((kutu as HTMLInputElement).value).toBe("Giyim › Kadın");
    expect(kutu.getAttribute("aria-expanded")).toBe("false");
    // Yazı seçili kaydın adından ayrılınca seçim bırakılır: form eski kaydı göndermez.
    await yaz(kutu, "Giyim › Kad");
    expect(secilenler.at(-1)).toBeUndefined();
  });

  it("Escape yalnız açık listeyi kapatır; sonuç yoksa liste açık sayılmaz", async () => {
    ciz();
    const kutu = screen.getByRole("combobox", { name: etiket });
    fireEvent.focus(kutu);
    await yaz(kutu, "giy");
    expect(kutu.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(kutu, { key: "Escape" });
    expect(kutu.getAttribute("aria-expanded")).toBe("false");
    yanit = () => Response.json({ basarili: true, veri: { kayitlar: [], dahaVar: false } });
    await yaz(kutu, "yok");
    expect(kutu.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("status").textContent).toBe(metin("yonetim.kayitArama.sonucYok"));
  });

  it("kendi araması boş yazıda çağrılmaz; hatada öneriler kalmaz (kart 0236)", async () => {
    cagrilar.length = 0;
    durum.hata = false;
    render(
      <MetinSaglayici dil="tr">
        <KendiAramasi />
      </MetinSaglayici>,
    );
    const kutu = screen.getByRole("combobox", { name: etiket });
    fireEvent.focus(kutu);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(cagrilar).toEqual([]);
    expect(screen.queryByText(metin("yonetim.kayitArama.hata"))).toBeNull();
    await yaz(kutu, "ter");
    expect(cagrilar).toEqual(["ter"]);
    expect(screen.getByRole("option", { name: "Termos" })).toBeTruthy();
    durum.hata = true;
    await yaz(kutu, "term");
    expect(screen.queryByRole("option", { name: "Termos" })).toBeNull();
    await yaz(kutu, "");
    expect(cagrilar).toEqual(["ter", "term"]);
    expect(istekler).toEqual([]);
  });

  it("yetkisi olmayana nedeni yazar", async () => {
    yanit = () =>
      Response.json({ basarili: false, hata: { kod: "yetki", ayrinti: [] } }, { status: 403 });
    ciz();
    const kutu = screen.getByRole("combobox", { name: etiket });
    fireEvent.focus(kutu);
    await yaz(kutu, "giy");
    expect(screen.getByRole("status").textContent).toBe(metin("yonetim.kayitArama.yetki"));
  });
});
