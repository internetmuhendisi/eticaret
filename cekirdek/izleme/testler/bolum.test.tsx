// @vitest-environment jsdom
// Bölüm hata sınırı (kart 0014): bir bölümde çıkan hata yalnız o bölümde görünür, sayfanın geri
// kalanı yerinde kalır.
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { Bolum } from "../bolum.tsx";
import { istemciHataIzlemeAraciniBagla } from "../istemci-hata-katmani.ts";

const metin = metinOkuyucu("tr");
const saglamBolumMetni = "sağlam bölüm";

function BozukBolum(): never {
  throw new Error("bölüm bilerek bozuldu");
}

const sayfaAgaci = () => (
  <MetinSaglayici dil="tr">
    <Bolum>
      <BozukBolum />
    </Bolum>
    <Bolum>
      <p>{saglamBolumMetni}</p>
    </Bolum>
  </MetinSaglayici>
);

const sayfa = () => render(sayfaAgaci());

describe("bölüm hata sınırı", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    istemciHataIzlemeAraciniBagla(undefined);
  });

  it("bozulan bölümde uyarı gösterir, öteki bölüm yerinde kalır", () => {
    // React yakalanan hatayı ayrıca konsola yazar; test çıktısını kirletmesin.
    vi.spyOn(console, "error").mockImplementation(() => {});
    sayfa();
    expect(screen.getByRole("alert").textContent).toBe(metin("ortak.hata.bolumGosterilemiyor"));
    expect(screen.getByText(saglamBolumMetni)).toBeDefined();
  });

  it("hatayı tarayıcının hata katmanına verir", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const hatalar: unknown[] = [];
    istemciHataIzlemeAraciniBagla((hata) => hatalar.push(hata));
    sayfa();
    expect(hatalar).toHaveLength(1);
    expect((hatalar[0] as Error).message).toBe("bölüm bilerek bozuldu");
  });

  // Sunucuda hata sınırı çalışmaz. Bölüm hatayı tutmazsa çizim hata fırlatır ve sayfa 500 olur.
  it("sunucuda çizilirken bozulan bölüm sayfayı düşürmez", () => {
    let html = "";
    expect(() => {
      html = renderToString(sayfaAgaci());
    }).not.toThrow();
    expect(html).toContain(saglamBolumMetni);
  });
});
