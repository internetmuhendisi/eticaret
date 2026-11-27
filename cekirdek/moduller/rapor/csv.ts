// Satış raporunun CSV dosyası (kart 0317, karar 0194 ve 0195): ekrandaki raporun aynı sayıları, ortak yazıcıyla
// (cekirdek/metinler/csv.ts). Tutarlar simgesiz ve binlik ayırıcısız, sitenin ondalık ayırıcısıyla sayıdır
// (csvTutari): tablo programı toplar. Günler "YYYY-AA-GG". Dosya dört bölümdür, aralarında boş satır: dönem, özet
// (önceki dönemle), oran oran vergi, seri.
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { type CsvHucresi, csvYazici, metinHucresi, sayiHucresi } from "../../metinler/csv.ts";
import { type MetinAnahtari, metinOkuyucu } from "../../metinler/metin.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { SatisOzeti, SatisRaporu } from "./satis.ts";

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
