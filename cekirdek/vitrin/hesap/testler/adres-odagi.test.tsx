// @vitest-environment jsdom
// Adres defterinde işlemden sonra odak (kart 0307). Sıra kurulur: bir sonraki kare (requestAnimationFrame) React'ın
// çizimi bitmeden gelir. Son adres silinince "Yeni adres ekle" düğmesi boş hâlin düğmesiyle değişir; odak yeni
// düğmeye geçer. "Varsayılan yap"tan sonra odak başa taşınan kartın "Düzenle"sindedir. Eski kod (odak bir sonraki
// karede) silmede bu sırayla kırmızıdır.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doldur } from "../../../metinler/doldur.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import type { KayitliAdres } from "../../../moduller/musteri/adres-semalari.ts";
import { AdresDefteri } from "../adres-defteri.tsx";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const metin = metinOkuyucu("tr");

const adres = (kimlik: string, baslik: string, varsayilan: boolean): KayitliAdres => ({
  kimlik,
  baslik,
  teslimat: { ad: "Ada", soyad: "Deneme", adres: { ulke: "TR", adres: "Deneme sokak 1" } },
  varsayilanTeslimat: varsayilan,
  varsayilanFatura: varsayilan,
});

let yanit: KayitliAdres[] = [];
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ basarili: true, veri: { adresler: yanit } })),
  );
  // Kare çizimden önce gelir: geri çağırma hemen çalışır.
  vi.stubGlobal("requestAnimationFrame", (geri: FrameRequestCallback) => {
    geri(0);
    return 0;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ciz = (adresler: KayitliAdres[]) =>
  render(
    <MetinSaglayici dil="tr">
      <AdresDefteri veri={{ adresler, ulkeler: [], telefonZorunlu: false, sinir: 10 }} />
    </MetinSaglayici>,
  );

describe("adres defterinde odak", () => {
  it("son adres silinince odak boş hâlin 'Yeni adres ekle'sine geçer", async () => {
    ciz([adres("a", "Ev", true)]);
    fireEvent.click(
      screen.getByRole("button", {
        name: doldur(metin("vitrin.hesap.adresler.silEtiket"), { baslik: "Ev" }),
      }),
    );
    yanit = [];
    const onay = await screen.findByRole("alertdialog");
    await act(async () => {
      fireEvent.click(
        within(onay).getByRole("button", { name: metin("vitrin.hesap.adresler.silOnay") }),
      );
    });
    const ekle = await screen.findByRole("button", { name: metin("vitrin.hesap.adresler.ekle") });
    expect(document.activeElement).toBe(ekle);
  });

  it("'Varsayılan yap'tan sonra odak başa taşınan kartın 'Düzenle'sindedir", async () => {
    ciz([adres("a", "Ev", true), adres("b", "İş", false)]);
    yanit = [adres("b", "İş", true), adres("a", "Ev", false)];
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: doldur(metin("vitrin.hesap.adresler.varsayilanYapEtiket"), { baslik: "İş" }),
        }),
      );
    });
    const duzenle = screen.getByRole("button", {
      name: doldur(metin("vitrin.hesap.adresler.duzenleEtiket"), { baslik: "İş" }),
    });
    expect(document.activeElement).toBe(duzenle);
  });
});
