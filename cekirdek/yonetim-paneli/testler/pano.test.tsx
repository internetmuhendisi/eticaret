// @vitest-environment jsdom
// Panonun ekranı (kart 0186, karar 0199): satır bağlantı olarak eylem yazısıyla, bağlantısız satır düz; tamamlanan
// adım ekran okuyucuda "tamamlandı"; boş bakılacaklar yazısı; okunamayan kutu yalnız kendi yerinde hata söyler;
// izni olmayan kutu (null) çizilmez; sayı kutusunun adı bağlantıdır; kısayollar eylem kaydının adıyla, "Vitrine git"
// yeni sekmede.

import { join, resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { Pano } from "../pano/pano.tsx";
import type { PanoVerisi } from "../pano/veri.ts";

const metin = metinOkuyucu("tr");
const site = siteKlasorunuOku(
  join(resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler"), "gecerli"),
);
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
beforeEach(() => {
  ortak[siteAnahtari] = site;
});
afterEach(() => {
  cleanup();
  delete ortak[siteAnahtari];
});

const kutu = (kod: string, ad: string) => ({
  kod,
  ad,
  deger: "1",
  fark: null,
  yon: null,
  iyi: null,
  alt: null,
});

const veri = (degisiklik: Partial<PanoVerisi> = {}): PanoVerisi => ({
  baslik: "Günaydın",
  altBaslik: "27 Kasım 2026 Cuma",
  adimlar: {
    tamam: 1,
    toplam: 2,
    adimlar: [
      {
        kod: "urun",
        ikon: "onay",
        baslik: "İlk ürününüzü ekleyin",
        alt: null,
        adres: null,
        eylem: null,
        tamam: true,
      },
      {
        kod: "magaza",
        ikon: "magaza",
        baslik: "Mağaza bilgilerini doldurun",
        alt: "Açıklama",
        adres: "/yonetim/magaza-bilgileri",
        eylem: "Bilgileri gir",
        tamam: false,
      },
    ],
  },
  bakilacaklar: {
    eksik: false,
    satirlar: [
      {
        kod: "havale",
        ikon: "havale",
        baslik: "1 havale bildirimi onay bekliyor",
        alt: "ORN-1",
        adres: "/yonetim/siparisler/ayrinti?numara=ORN-1",
        eylem: "Siparişe git",
      },
      {
        kod: "yorum",
        ikon: "yorumlar",
        baslik: "2 yorum onay bekliyor",
        alt: null,
        adres: null,
        eylem: null,
      },
    ],
  },
  satis: null,
  sayilar: {
    eksik: false,
    kutular: [
      { ...kutu("hazirlanacak", "Hazırlanacak"), adres: "/yonetim/siparisler?durum=hazirlaniyor" },
    ],
  },
  kisayollar: [
    { kod: "yeni-urun", adres: "/yonetim/urunler/yeni", eylem: "urun-ekle" },
    { kod: "menuler", adres: "/yonetim/menuler", eylem: null, ad: "Menüler", ikon: "menuler" },
  ],
  ...degisiklik,
});

// Bölüm başlığıyla bulunur (Bolum: başlıklı kart).
const bolum = (ad: string): HTMLElement => {
  const kart = screen.getByRole("heading", { name: ad }).closest<HTMLElement>('[data-slot="kart"]');
  if (kart === null) throw new Error(`${ad} bölümü yok.`);
  return kart;
};
const bolumYok = (ad: string) => expect(screen.queryByRole("heading", { name: ad })).toBeNull();

const ciz = (v: PanoVerisi) =>
  render(
    <MetinSaglayici dil="tr">
      <Pano veri={v} />
    </MetinSaglayici>,
  );

describe("pano", () => {
  it("satırlar, adımlar, sayı kutusu ve kısayollar", () => {
    ciz(veri());
    const bakilacaklar = bolum(metin("yonetim.pano.bakilacaklar"));
    const havale = within(bakilacaklar).getByRole("link", { name: /havale bildirimi/ });
    expect(havale.getAttribute("href")).toBe("/yonetim/siparisler/ayrinti?numara=ORN-1");
    expect(havale.textContent).toContain("Siparişe git");
    // Bağlantısız satır düz.
    expect(within(bakilacaklar).queryByRole("link", { name: /yorum/ })).toBeNull();
    expect(within(bakilacaklar).getByText("2 yorum onay bekliyor")).toBeTruthy();
    const adimlar = bolum(metin("yonetim.pano.adimlar"));
    expect(within(adimlar).getByText("Tamamlanan: 1 / 2")).toBeTruthy();
    expect(within(adimlar).getAllByRole("listitem")[0]?.textContent).toBe(
      `İlk ürününüzü ekleyin${metin("yonetim.pano.adimTamam")}`,
    );
    expect(
      within(adimlar)
        .getByRole("link", { name: /Mağaza bilgilerini/ })
        .getAttribute("href"),
    ).toBe("/yonetim/magaza-bilgileri");
    expect(screen.getByRole("link", { name: "Hazırlanacak" }).getAttribute("href")).toBe(
      "/yonetim/siparisler?durum=hazirlaniyor",
    );
    const kisayollar = bolum(metin("yonetim.pano.kisayollar"));
    expect(
      within(kisayollar)
        .getAllByRole("link")
        .map((b) => b.textContent),
    ).toEqual([metin("yonetim.eylem.urunEkle"), "Menüler", metin("yonetim.eylem.vitrineGit")]);
    const vitrin = within(kisayollar).getByRole("link", {
      name: metin("yonetim.eylem.vitrineGitYeniSekme"),
    });
    expect(vitrin.getAttribute("target")).toBe("_blank");
  });

  it("boş bakılacaklar, hata hâli ve izni olmayan kutular", () => {
    ciz(
      veri({
        bakilacaklar: { satirlar: [], eksik: false },
        adimlar: "hata",
        sayilar: null,
        satis: null,
      }),
    );
    expect(screen.getByText(metin("yonetim.pano.bakilacakYok"))).toBeTruthy();
    const adimlar = bolum(metin("yonetim.pano.adimlar"));
    expect(within(adimlar).getByText(metin("yonetim.pano.hata"))).toBeTruthy();
    expect(screen.getAllByText(metin("yonetim.pano.hata"))).toHaveLength(1);
    expect(screen.queryByRole("region", { name: metin("yonetim.pano.sayilar") })).toBeNull();
    cleanup();
    ciz(veri({ adimlar: null, bakilacaklar: null, sayilar: "hata" }));
    bolumYok(metin("yonetim.pano.adimlar"));
    bolumYok(metin("yonetim.pano.bakilacaklar"));
    // Sayıların hatası kendi adlı bölgesinde: ekran okuyucu hangi bölümün yüklenmediğini söyler.
    const sayilar = screen.getByRole("region", { name: metin("yonetim.pano.sayilar") });
    expect(within(sayilar).getByText(metin("yonetim.pano.hata"))).toBeTruthy();
    cleanup();
    // Eksik kutu: okunan satırlar ve eksik uyarısı birlikte; boş hâl yazılmaz.
    ciz(veri({ bakilacaklar: { satirlar: [], eksik: true } }));
    const bakilacaklar = bolum(metin("yonetim.pano.bakilacaklar"));
    expect(within(bakilacaklar).getByText(metin("yonetim.pano.eksik"))).toBeTruthy();
    expect(screen.queryByText(metin("yonetim.pano.bakilacakYok"))).toBeNull();
  });
});
