// Kargo ekranının verisi (kart 0212): ayarlar sunucuda okunur, tutarlar sitenin para biçimiyle yazıya çevrilir
// (simgesiz; uç aynı biçimi paraOku ile okur). Tarayıcı biçim kuralı taşımaz.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { UcretsizKargoTutari } from "../../kayitlar/sepet";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { kargoAyarlariniOku } from "../../moduller/kargo/servis";
import { magazaAyarlariniOku } from "../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";

export type KargoFormu = {
  kargoUcreti: string;
  ucretsizKargoSiniri: string;
  ucretsizKargoTutari: UcretsizKargoTutari;
  kargoyaVermeSuresi: string;
};

export type KargoEkraniVerisi = {
  // Teslimat bölgesinin başlığı: teslimat ülkelerinin adları (başlangıçta tek bölge).
  bolge: string;
  // Alanın yanında duran para simgesi ve yeri.
  simge: string;
  simgeYeri: "basta" | "sonda";
  // Tutarlar fiyatlar gibi girilir: vergi dahil ya da hariç (açıklama metni buna göre seçilir).
  fiyatGirisi: "vergi-dahil" | "vergi-haric";
  form: KargoFormu;
};

export const kargoEkraniVerisi = async (): Promise<KargoEkraniVerisi> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const [kargo, magaza] = await Promise.all([
    kargoAyarlariniOku(vt, site),
    magazaAyarlariniOku(vt),
  ]);
  const tutar = bicim.paraYazisi;
  const { simge, yer } = bicim.paraSimgesi();
  return {
    bolge: site.ayarlar.teslimatUlkeleri.map((kod) => bicim.ulkeAdi(kod)).join(", "),
    simge,
    simgeYeri: yer,
    fiyatGirisi: magaza.fiyatGirisi,
    form: {
      kargoUcreti: tutar(kargo.kargoUcreti),
      ucretsizKargoSiniri:
        kargo.ucretsizKargoSiniri === undefined ? "" : tutar(kargo.ucretsizKargoSiniri),
      ucretsizKargoTutari: kargo.ucretsizKargoTutari,
      kargoyaVermeSuresi: String(kargo.kargoyaVermeSuresi),
    },
  };
};
