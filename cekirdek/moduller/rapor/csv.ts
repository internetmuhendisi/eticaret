// Satış raporunun CSV dosyası (kart 0317, karar 0194 ve 0195): ekrandaki raporun aynı sayıları, ortak yazıcıyla
// (cekirdek/metinler/csv.ts). Tutarlar simgesiz ve binlik ayırıcısız, sitenin ondalık ayırıcısıyla sayıdır
// (csvTutari): tablo programı toplar. Günler "YYYY-AA-GG". Dosya dört bölümdür, aralarında boş satır: dönem, özet
// (önceki dönemle), oran oran vergi, seri.
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { type CsvHucresi, csvYazici, metinHucresi, sayiHucresi } from "../../metinler/csv.ts";
import { type MetinAnahtari, metinOkuyucu } from "../../metinler/metin.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { GunAraligi } from "./donem.ts";
import type { KuponOzeti, KuponRaporuSatiri } from "./kupon.ts";
import type { MusteriOzeti, MusteriRaporuSatiri } from "./musteri.ts";
import type { SatisOzeti, SatisRaporu } from "./satis.ts";
import type { UrunRaporuSatiri } from "./urun.ts";

// Özetin satırları, ekrandaki sırayla.
export const satisOzetiSatirlari = [
  "siparisSayisi",
  "satis",
  "kuponIndirimi",
  "iade",
  "iadeSayisi",
  "netSatis",
  "ortalamaSepet",
] as const satisfies readonly (keyof SatisOzeti)[];
const adetler: readonly string[] = ["siparisSayisi", "iadeSayisi"];

export const satisRaporuCsv = (site: Site, rapor: SatisRaporu): Buffer => {
  const b = siteninBicimleyicisi(site.ayarlar);
  const metin = metinOkuyucu(site.ayarlar.dil);
  const m = (ad: string) => metin(`yonetim.rapor.csv.${ad}` as MetinAnahtari);
  const tutar = (deger: number) => sayiHucresi(b.csvTutari(deger));
  const bos = (): CsvHucresi[] => [];
  const yazici = csvYazici(b.csvAyraci());

  yazici.satir([
    metinHucresi(m("donem")),
    metinHucresi(rapor.donem.baslangic),
    metinHucresi(rapor.donem.bitis),
  ]);
  if (rapor.onceki !== null) {
    yazici.satir([
      metinHucresi(m("oncekiDonem")),
      metinHucresi(rapor.onceki.donem.baslangic),
      metinHucresi(rapor.onceki.donem.bitis),
    ]);
  }
  yazici.satir(bos());

  yazici.satir(
    [m("gosterge"), m("buDonem"), ...(rapor.onceki === null ? [] : [m("oncekiDonem")])].map(
      metinHucresi,
    ),
  );
  const deger = (ozet: SatisOzeti, ad: (typeof satisOzetiSatirlari)[number]): CsvHucresi => {
    const sayi = ozet[ad];
    if (sayi === null) return metinHucresi("");
    return adetler.includes(ad) ? sayiHucresi(String(sayi)) : tutar(sayi);
  };
  for (const ad of satisOzetiSatirlari) {
    yazici.satir([
      metinHucresi(m(`satir.${ad}`)),
      deger(rapor.ozet, ad),
      ...(rapor.onceki === null ? [] : [deger(rapor.onceki.ozet, ad)]),
    ]);
  }
  yazici.satir(bos());

  yazici.satir([m("vergi"), m("matrah"), m("vergiTutari")].map(metinHucresi));
  for (const satir of rapor.ozet.vergiler) {
    yazici.satir([
      metinHucresi(`${satir.ad ?? m("vergi")} ${b.yuzde(satir.oran / 10_000)}`),
      tutar(satir.matrah),
      tutar(satir.vergi),
    ]);
  }
  yazici.satir(bos());

  yazici.satir([m("baslangic"), m("bitis"), m("satis"), m("siparisSayisi")].map(metinHucresi));
  for (const nokta of rapor.seri.noktalar) {
    yazici.satir([
      metinHucresi(nokta.baslangic),
      metinHucresi(nokta.bitis),
      tutar(nokta.satis),
      sayiHucresi(String(nokta.siparisSayisi)),
    ]);
  }
  return yazici.dosya();
};

// ——— Ürün, müşteri ve kupon raporları (kart 0318) ———
// Her dosya dönem satırıyla başlar, boş satırdan sonra tablonun başlığı ve satırları gelir. Tutarlar satış raporuyla
// aynı biçimde (csvTutari).

const donemSatirlari = (
  yazici: ReturnType<typeof csvYazici>,
  m: (ad: string) => string,
  donem: GunAraligi,
) => {
  yazici.satir([
    metinHucresi(m("donem")),
    metinHucresi(donem.baslangic),
    metinHucresi(donem.bitis),
  ]);
  yazici.satir([]);
};

const yardimci = (site: Site) => {
  const b = siteninBicimleyicisi(site.ayarlar);
  const metin = metinOkuyucu(site.ayarlar.dil);
  return {
    b,
    m: (ad: string) => metin(`yonetim.rapor.csv.${ad}` as MetinAnahtari),
    tutar: (deger: number) => sayiHucresi(b.csvTutari(deger)),
    adet: (deger: number) => sayiHucresi(String(deger)),
    yazici: csvYazici(b.csvAyraci()),
  };
};

// Ürün ve birleşim başına bir satır: basit ürünün tek satırı, seçenekli ürünün her birleşimi (seçimiyle).
export const urunRaporuCsv = (
  site: Site,
  donem: GunAraligi,
  satirlar: UrunRaporuSatiri[],
): Buffer => {
  const { m, tutar, adet, yazici } = yardimci(site);
  donemSatirlari(yazici, m, donem);
  yazici.satir(
    [
      m("urun.urun"),
      m("urun.secim"),
      m("urun.adet"),
      m("urun.tutar"),
      m("urun.iade"),
      m("urun.silindi"),
    ].map(metinHucresi),
  );
  for (const urun of satirlar) {
    const silindi = metinHucresi(urun.silindi ? m("evet") : "");
    if (urun.birlesimler.length === 0) {
      yazici.satir([
        metinHucresi(urun.ad),
        metinHucresi(""),
        adet(urun.adet),
        tutar(urun.tutar),
        adet(urun.iadeAdedi),
        silindi,
      ]);
      continue;
    }
    for (const birlesim of urun.birlesimler) {
      yazici.satir([
        metinHucresi(urun.ad),
        metinHucresi(
          birlesim.secim.map(({ secenek, deger }) => `${secenek}: ${deger}`).join(" · "),
        ),
        adet(birlesim.adet),
        tutar(birlesim.tutar),
        adet(birlesim.iadeAdedi),
        silindi,
      ]);
    }
  }
  return yazici.dosya();
};

// Özet (yeni, dönen, üye ve üye olmayan siparişleri) ve üyelerin listesi: ad (kişisel bilgisi silinmişse boş),
// sipariş sayısı, tutar.
export const musteriRaporuCsv = (
  site: Site,
  donem: GunAraligi,
  ozet: MusteriOzeti,
  satirlar: MusteriRaporuSatiri[],
): Buffer => {
  const { m, tutar, adet, yazici } = yardimci(site);
  donemSatirlari(yazici, m, donem);
  for (const ad of ["yeni", "donen", "uyeSiparisi", "misafirSiparisi"] as const) {
    yazici.satir([metinHucresi(m(`musteri.${ad}`)), adet(ozet[ad])]);
  }
  yazici.satir([]);
  yazici.satir([m("musteri.ad"), m("musteri.siparisSayisi"), m("musteri.tutar")].map(metinHucresi));
  for (const satir of satirlar) {
    yazici.satir([metinHucresi(satir.ad ?? ""), adet(satir.siparisSayisi), tutar(satir.tutar)]);
  }
  return yazici.dosya();
};

// Özet ve kupon başına satır.
export const kuponRaporuCsv = (
  site: Site,
  donem: GunAraligi,
  ozet: KuponOzeti,
  satirlar: KuponRaporuSatiri[],
): Buffer => {
  const { m, tutar, adet, yazici } = yardimci(site);
  donemSatirlari(yazici, m, donem);
  yazici.satir([metinHucresi(m("kupon.kuponluSiparis")), adet(ozet.kuponluSiparis)]);
  yazici.satir([metinHucresi(m("kupon.butunSiparis")), adet(ozet.butunSiparis)]);
  yazici.satir([metinHucresi(m("kupon.indirim")), tutar(ozet.indirim)]);
  yazici.satir([metinHucresi(m("kupon.satis")), tutar(ozet.satis)]);
  yazici.satir([metinHucresi(m("kupon.iadeSonrasi")), tutar(ozet.iadeSonrasi)]);
  yazici.satir([]);
  yazici.satir(
    [
      m("kupon.kod"),
      m("kupon.kullanim"),
      m("kupon.indirim"),
      m("kupon.satis"),
      m("kupon.iadeSonrasi"),
    ].map(metinHucresi),
  );
  for (const satir of satirlar) {
    yazici.satir([
      metinHucresi(satir.kod),
      adet(satir.kullanim),
      tutar(satir.indirim),
      tutar(satir.satis),
      tutar(satir.iadeSonrasi),
    ]);
  }
  return yazici.dosya();
};
