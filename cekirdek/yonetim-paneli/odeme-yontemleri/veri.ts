// Ödeme yöntemleri ve banka hesapları ekranlarının verisi (kart 0214, karar 0141): ayarlar sunucuda ödeme yöntemi
// servisiyle okunur. Havalenin iptal süresi forma yazı olarak gider (uç aynı yazıyı okur).
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { KapidaOdemeSecenegi } from "../../kayitlar/odeme";
import {
  type BankaHesabi,
  odemeYontemiServisi,
  type YontemAyari,
} from "../../moduller/odeme/yontemler";
import { siteninVeritabani } from "../../veritabani/baglanti";

export type OdemeYontemleriFormu = {
  yontemler: YontemAyari[];
  kapidaOdemeSecenekleri: KapidaOdemeSecenegi[];
  havaleIptalSuresi: string;
};

export type OdemeYontemleriEkraniVerisi = {
  form: OdemeYontemleriFormu;
  bankaHesabiSayisi: number;
};

export const odemeYontemleriEkraniVerisi = async (): Promise<OdemeYontemleriEkraniVerisi> => {
  const ayarlar = await odemeYontemiServisi(calisanSite()).oku(siteninVeritabani());
  return {
    form: {
      yontemler: ayarlar.yontemler,
      kapidaOdemeSecenekleri: ayarlar.kapidaOdemeSecenekleri,
      havaleIptalSuresi: String(ayarlar.havaleIptalSuresi),
    },
    bankaHesabiSayisi: ayarlar.bankaHesaplari.length,
  };
};

export const bankaHesaplariEkraniVerisi = async (): Promise<BankaHesabi[]> =>
  (await odemeYontemiServisi(calisanSite()).oku(siteninVeritabani())).bankaHesaplari;
