// Fiyat girişinin değişikliğinin ekran verisi ve 1 kuruş değişen fiyatların CSV listesi (kart 0326, karar 0201). Plan
// servisten gelir (cekirdek/moduller/fiyat/giris-degisikligi.ts); burada yalnız sitenin biçimiyle yazılır. Müşterinin
// gördüğü tutarı değişen birimler ürün adı ve seçimiyle, ekranda en çok `gosterilenEnCok` satır (fiyat-girisi-tanim.ts);
// fazlası CSV'dedir.
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { csvYazici, metinHucresi, sayiHucresi } from "../../metinler/csv.ts";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import {
  type CevrilenFiyat,
  fiyatGirisiServisi,
  type GirisPlani,
  gorunenDegisirMi,
  kayitliFiyatDegisirMi,
  kuponDegisirMi,
} from "../../moduller/fiyat/giris-degisikligi.ts";
import type { FiyatGirisi } from "../../moduller/vergi/semalar.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { type FiyatGirisiOnizlemesi, gosterilenEnCok } from "./fiyat-girisi-tanim.ts";

const degisenler = (plan: GirisPlani) => plan.fiyatlar.filter(gorunenDegisirMi);

// Satırın gösterilen tutarları: satış fiyatı değişiyorsa o, değilse indirimli fiyat.
const gorunenTutarlar = (fiyat: CevrilenFiyat) =>
  fiyat.satis.onceGorunen !== fiyat.satis.sonraGorunen || fiyat.indirimli === null
    ? fiyat.satis
    : fiyat.indirimli;

export const fiyatGirisiOnizlemesi = async (
  vt: Veritabani,
  site: Site,
  yeni: FiyatGirisi,
): Promise<FiyatGirisiOnizlemesi> => {
  const servis = fiyatGirisiServisi(site);
  const plan = await servis.onizle(vt, yeni);
  const b = siteninBicimleyicisi(site.ayarlar);
  const degisen = degisenler(plan);
  const ilkler = degisen.slice(0, gosterilenEnCok);
  const adlar = await servis.birimAdlari(vt, ilkler);
  const ad = (fiyat: CevrilenFiyat) => {
    const birim = adlar.get(fiyat.birim);
    return birim === undefined ? "" : [birim.urun, ...birim.secim].join(" / ");
  };
  return {
    eski: plan.eski,
    yeni: plan.yeni,
    surum: plan.surum,
    fiyatSayisi: plan.fiyatlar.filter(kayitliFiyatDegisirMi).length,
    degisenSayisi: degisen.length,
    degisenler: ilkler.map((fiyat) => {
      const tutar = gorunenTutarlar(fiyat);
      return {
        birim: fiyat.birim,
        ad: ad(fiyat),
        once: b.para(tutar.onceGorunen),
        sonra: b.para(tutar.sonraGorunen),
      };
    }),
    kargoUcreti: { once: b.para(plan.eskiKargoUcreti), sonra: b.para(plan.kargoUcreti.tutar) },
    ucretsizKargoSiniri:
      plan.eskiUcretsizKargoSiniri === null || plan.ucretsizKargoSiniri === null
        ? null
        : {
            once: b.para(plan.eskiUcretsizKargoSiniri),
            sonra: b.para(plan.ucretsizKargoSiniri.tutar),
          },
    kuponSayisi: plan.kuponlar.filter(kuponDegisirMi).length,
    sepetSinifi: plan.sepetSinifi?.ad ?? null,
  };
};

// Müşterinin gördüğü tutarı değişecek bütün birimler: ürün, seçim, önceki ve sonraki tutar (gösterim biçiminde).
export const fiyatGirisiCsv = async (
  vt: Veritabani,
  site: Site,
  yeni: FiyatGirisi,
): Promise<Buffer> => {
  const servis = fiyatGirisiServisi(site);
  const plan = await servis.onizle(vt, yeni);
  const b = siteninBicimleyicisi(site.ayarlar);
  const metin = metinOkuyucu(site.ayarlar.dil);
  const degisen = degisenler(plan);
  const adlar = await servis.birimAdlari(vt, degisen);
  const yazici = csvYazici(b.csvAyraci());
  yazici.satir(
    [
      metin("yonetim.vergi.giris.csv.urun"),
      metin("yonetim.vergi.giris.csv.secim"),
      metin("yonetim.vergi.giris.csv.once"),
      metin("yonetim.vergi.giris.csv.sonra"),
    ].map(metinHucresi),
  );
  for (const fiyat of degisen) {
    const birim = adlar.get(fiyat.birim);
    const tutar = gorunenTutarlar(fiyat);
    yazici.satir([
      metinHucresi(birim?.urun ?? ""),
      metinHucresi(birim?.secim.join(" / ") ?? ""),
      sayiHucresi(b.csvTutari(tutar.onceGorunen)),
      sayiHucresi(b.csvTutari(tutar.sonraGorunen)),
    ]);
  }
  return yazici.dosya();
};
