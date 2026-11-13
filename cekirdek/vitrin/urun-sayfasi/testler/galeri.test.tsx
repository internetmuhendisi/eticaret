// @vitest-environment jsdom
// Galerinin ilk konum betiği (kart 0173, karar 0122): seçili öğe ilk öğe değilse HTML'de şeridin hemen ardında
// küçük bir betik vardır; ilk öğede yoktur. Sayfa bağlanırken uyuşmazlık uyarısı çıkmaz. Tarayıcıda baştan çizimde
// (bağlantıyla gelinen sayfa) betik çizilmez, React konsola "script" hatası yazmaz (bağımsız kontrolün bulgusu).
import { act, cleanup, render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { UrunGalerisi } from "../galeri.tsx";
import type { SayfaGaleriOgesi } from "../veri.ts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const gorsel = (sira: number): SayfaGaleriOgesi => ({
  tur: "gorsel",
  kimlik: `g-${sira}`,
  alternatifMetin: `Görsel ${sira}`,
  kaynaklar: [{ adres: `/g-${sira}.webp`, genislik: 480 }],
  kucuk: `/g-${sira}-k.webp`,
  genislik: 480,
  yukseklik: 480,
});
const ogeler = [gorsel(0), gorsel(1), gorsel(2)];
const galeri = (aktif: number) => (
  <MetinSaglayici dil="tr">
    <UrunGalerisi ogeler={ogeler} aktif={aktif} onAktifDegisti={() => {}} urunAdi="Deneme" />
  </MetinSaglayici>
);

it("HTML'de seçili öğe ilk değilse şeridin ardında konum betiği var, ilk öğede yok", () => {
  const html = renderToString(galeri(2));
  expect(html).toMatch(/<\/section><script>\(function.*scrollLeft.*,2,0\)<\/script>/);
  expect(renderToString(galeri(0))).not.toContain("<script>");
});

it("sayfa bağlanırken uyuşmazlık uyarısı yok; tarayıcıda baştan çizimde betik yok, konsol hatası yok", async () => {
  const hata = vi.spyOn(console, "error").mockImplementation(() => {});
  const kap = document.createElement("div");
  kap.innerHTML = renderToString(galeri(2));
  document.body.append(kap);
  const kok = await act(async () => hydrateRoot(kap, galeri(2)));
  expect(hata).not.toHaveBeenCalled();
  await act(async () => kok.unmount());
  kap.remove();

  const { container } = render(galeri(2));
  expect(container.querySelector("script")).toBeNull();
  expect(hata).not.toHaveBeenCalled();
});
