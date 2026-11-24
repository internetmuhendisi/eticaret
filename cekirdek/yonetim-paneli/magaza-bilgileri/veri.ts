// Mağaza bilgileri ekranının verisi (kart 0278, karar 0175): ayarlar sunucuda okunur ve formun yazılarına çevrilir;
// adres alanları sitenin satış ülkeleriyle (il ve ilçe listeleri), satıcının ülkesi de onlardan. Tarayıcı ayar
// şemasını taşımaz.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { IsletmeTuru } from "../../kayitlar/satici";
import { type SosyalSite, sosyalSiteler } from "../../kayitlar/sosyal-siteler";
import { magazaAyarlariniOku, magazaninAdi } from "../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import type { Adres, BolgeUlkesi } from "../../vitrin/odeme/alanlar";
import { bolgeUlkeleri } from "../../vitrin/odeme/ulkeler";

export type SaticiFormu = {
  ulke: string;
  isletmeTuru: IsletmeTuru;
  unvan: string;
  vergiDairesi: string;
  vergiNumarasi: string;
  mersisNumarasi: string;
  ticaretSicilNumarasi: string;
  kepAdresi: string;
};

export type MagazaBilgileriFormu = {
  magazaAdi: string;
  iletisimEpostasi: string;
  iletisimTelefonu: string;
  magazaAdresi: Adres;
  // Her sitenin hesapları formdaki sırasıyla; boş site tek boş alanla görünür.
  sosyal: Record<SosyalSite, string[]>;
  saticiBilgileri: SaticiFormu;
};

export type MagazaBilgileriVerisi = {
  form: MagazaBilgileriFormu;
  ulkeler: BolgeUlkesi[];
};

export const magazaBilgileriVerisi = async (): Promise<MagazaBilgileriVerisi> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const [ayarlar, ad] = await Promise.all([magazaAyarlariniOku(vt), magazaninAdi(vt, site)]);
  const ilkUlke = site.ayarlar.satisUlkeleri[0] ?? "";
  const adres = ayarlar.magazaAdresi;
  const satici = ayarlar.saticiBilgileri;
  const sosyal = Object.fromEntries(
    sosyalSiteler.map((kod) => {
      const hesaplar = ayarlar.sosyalHesaplar.filter((h) => h.site === kod).map((h) => h.hesap);
      return [kod, hesaplar.length === 0 ? [""] : hesaplar];
    }),
  ) as Record<SosyalSite, string[]>;
  return {
    ulkeler: bolgeUlkeleri(site, site.ayarlar.satisUlkeleri),
    form: {
      magazaAdi: ad,
      iletisimEpostasi: ayarlar.iletisimEpostasi ?? "",
      iletisimTelefonu: ayarlar.iletisimTelefonu ?? "",
      magazaAdresi: {
        ulke: adres?.ulke ?? ilkUlke,
        il: adres?.il ?? "",
        ilce: adres?.ilce ?? "",
        adres: adres?.adres ?? "",
        postaKodu: adres?.postaKodu ?? "",
      },
      sosyal,
      saticiBilgileri: {
        ulke: satici?.ulke ?? ilkUlke,
        isletmeTuru: satici?.isletmeTuru ?? "sirket",
        unvan: satici?.unvan ?? "",
        vergiDairesi: satici?.vergiDairesi ?? "",
        vergiNumarasi: satici?.vergiNumarasi ?? "",
        mersisNumarasi: satici?.mersisNumarasi ?? "",
        ticaretSicilNumarasi: satici?.ticaretSicilNumarasi ?? "",
        kepAdresi: satici?.kepAdresi ?? "",
      },
    },
  };
};
