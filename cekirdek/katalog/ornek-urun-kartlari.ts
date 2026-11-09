// Bileşen kataloğunun örnek ürün kartları (kart 0109). Vitrinde kartın verisi urunKartlari'ndan gelir
// (cekirdek/vitrin/urun-karti/veri.ts); katalog her durumu örnekle doldurur: indirimli, tükenmiş, varyantlı
// (aralık ve varan indirim), görselsiz, uzun adlı, büyük fiyatlı, puanlı, fiyatsız. Tutarlar sitenin para
// biçimiyle yazılır; örnek metinler metin dosyasındadır, hiçbir siteye ait değildir. Görseller yalın
// biçimlerdir, ürün fotoğrafı değildir.
import type { MetinAnahtari } from "../metinler/metin";
import { bicim, metin } from "../metinler/site-metni";
import type { GosterilecekFiyat } from "../moduller/fiyat/gosterim";
import type { UrunKartiGorseli, UrunKartiVerisi } from "../vitrin/urun-karti/tur";

const svg = (ic: string, genislik = 480, yukseklik = 480) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${genislik}' height='${yukseklik}' viewBox='0 0 100 100'>${ic}</svg>`,
  )}`;

const sekiller = [
  "<circle cx='50' cy='50' r='34' opacity='0.7'/>",
  "<rect x='20' y='20' width='60' height='60' rx='8' opacity='0.6'/>",
  "<polygon points='50,14 86,82 14,82' opacity='0.65'/>",
  "<rect x='14' y='34' width='72' height='32' rx='16' opacity='0.55'/>",
];

const gorsel = (sira: number): UrunKartiGorseli => {
  const adres = svg(sekiller[sira % sekiller.length] ?? "");
  return {
    alternatifMetin: metin("gelistirme.urunKarti.ornek.gorselMetni"),
    kaynaklar: [{ adres, genislik: 480 }],
    genislik: 480,
    yukseklik: 480,
  };
};

const fiyat = (tutar: number, eskiTutar?: number): GosterilecekFiyat => ({
  tutar,
  ...(eskiTutar === undefined ? {} : { eskiTutar }),
  indirimde: eskiTutar !== undefined,
  paraBirimi: "XTS",
  vergi: "vergi-dahil",
  ekMetin: metin("gelistirme.urunKarti.ornek.ekMetin"),
  yazili: {
    tutar: bicim().para(tutar),
    ...(eskiTutar === undefined ? {} : { eskiTutar: bicim().para(eskiTutar) }),
  },
});

const yazili = (enDusuk: number, enYuksek: number) =>
  bicim().paraAraligi(enDusuk, enYuksek, metin("vitrin.fiyat.aralikAyirici"));

const tek = (tutar: number, eskiTutar?: number) => ({
  enDusuk: fiyat(tutar, eskiTutar),
  enYuksek: fiyat(tutar, eskiTutar),
  tek: true,
  yaziliAralik: yazili(tutar, tutar),
});

const urun = (
  sira: number,
  ad: MetinAnahtari,
  degisiklik: Partial<UrunKartiVerisi> = {},
): UrunKartiVerisi => ({
  kimlik: `ornek-${sira}`,
  ad: metin(ad),
  adres: "#",
  marka: metin("gelistirme.urunKarti.ornek.marka"),
  gorsel: gorsel(sira),
  fiyat: tek(29_990),
  tukendi: false,
  ...degisiklik,
});

export const ornekUrunKartlari = (): UrunKartiVerisi[] => {
  const { gorsel: _gorsel, ...gorselsiz } = urun(4, "gelistirme.urunKarti.ornek.gorselsiz");
  const { fiyat: _fiyat, ...fiyatsiz } = urun(8, "gelistirme.urunKarti.ornek.fiyatsiz");
  return [
    urun(0, "gelistirme.urunKarti.ornek.indirimli", {
      // 299,90'dan 225,00'a: yüzde 24,97, rozet aşağı yuvarlanmış oranı yazar.
      fiyat: { ...tek(22_500, 29_990), indirim: { oran: 24, varan: false } },
    }),
    urun(1, "gelistirme.urunKarti.ornek.tukenmis", { tukendi: true }),
    urun(2, "gelistirme.urunKarti.ornek.varyantli", {
      fiyat: {
        enDusuk: fiyat(24_990),
        enYuksek: fiyat(27_990),
        tek: false,
        yaziliAralik: yazili(24_990, 27_990),
      },
    }),
    urun(3, "gelistirme.urunKarti.ornek.varanIndirimli", {
      fiyat: {
        enDusuk: fiyat(14_000, 20_000),
        enYuksek: fiyat(25_000),
        tek: false,
        yaziliAralik: yazili(14_000, 25_000),
        indirim: { oran: 30, varan: true },
      },
    }),
    gorselsiz,
    urun(5, "gelistirme.urunKarti.ornek.uzunAdli", {
      marka: metin("gelistirme.urunKarti.ornek.uzunMarka"),
    }),
    urun(6, "gelistirme.urunKarti.ornek.buyukFiyat", {
      fiyat: { ...tek(1_234_567_890, 1_456_789_000), indirim: { oran: 15, varan: false } },
    }),
    urun(7, "gelistirme.urunKarti.ornek.puanli", { puan: { ortalama: 4.6, sayi: 128 } }),
    fiyatsiz,
  ];
};
