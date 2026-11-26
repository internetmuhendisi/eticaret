// Toplu düzenlemenin önizlemesi ekran için, sunucuda (kart 0314, karar 0189): tutarlar ve miktarlar sitenin
// biçimiyle yazılı gelir, tarayıcı biçimlemez. Görülen değerler olduğu gibi kalır: uygulama onlarla gönderilir.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { UrunTopluDuzenlemeNedeni } from "../../kayitlar/urun";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import type { Onizleme } from "../../moduller/urun/toplu-duzenleme";

export type OnizlemeSatiri = {
  // Birleşimin değerlerinin adları; basit üründe boş.
  degerler: string[];
  // Fiyatta birimin satış fiyatı (bağlam); stokta yok.
  satis: string | null;
  eski: string | null;
  yeni: string | null;
  neden?: UrunTopluDuzenlemeNedeni;
};

export type TopluOnizlemeVerisi = {
  urunler: {
    kimlik: string;
    ad: string;
    degisir: boolean;
    neden?: UrunTopluDuzenlemeNedeni;
    satirlar: OnizlemeSatiri[];
  }[];
  // Değişecek ürün ve birim (birleşim ya da basit ürünün birimi) sayısı.
  urunSayisi: number;
  birimSayisi: number;
  gorulen: Onizleme["gorulen"];
};

export const topluOnizlemeVerisi = (
  onizleme: Onizleme,
  tur: "fiyat" | "stok" | "kategori",
): TopluOnizlemeVerisi => {
  const b = siteninBicimleyicisi(calisanSite().ayarlar);
  const yaz = (deger: number | null) =>
    deger === null ? null : tur === "fiyat" ? b.para(deger) : b.sayi(deger);
  const urunler = onizleme.urunler.map((urun) => ({
    kimlik: urun.kimlik,
    ad: urun.ad,
    degisir: urun.degisir,
    ...(urun.neden === undefined ? {} : { neden: urun.neden }),
    satirlar: urun.birimler.map((birim) => ({
      degerler: birim.degerler,
      satis: tur === "fiyat" && birim.satis !== null ? b.para(birim.satis) : null,
      eski: yaz(birim.eski),
      yeni: yaz(birim.yeni),
      ...(birim.neden === undefined ? {} : { neden: birim.neden }),
    })),
  }));
  const degisenler = onizleme.urunler.filter((urun) => urun.degisir);
  return {
    urunler,
    urunSayisi: degisenler.length,
    birimSayisi: degisenler.reduce(
      (toplam, urun) => toplam + urun.birimler.filter((birim) => birim.degisir).length,
      0,
    ),
    gorulen: onizleme.gorulen,
  };
};
