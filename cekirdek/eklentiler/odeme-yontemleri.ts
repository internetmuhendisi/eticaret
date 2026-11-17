// Ödeme yöntemi bağlantı noktası (kart 0215, karar 0142): eklentiyle gelen ödeme yöntemlerinin çekirdeğe bağlandığı
// tek nokta. Kayıttaki yöntem bir eklentiye bağlıdır (eklentiliOdemeYontemleri, cekirdek/kayitlar/odeme.ts); ödeme
// modülü eklentiyi tanımaz, yalnız buradan sorar:
// - yontemSitedeVarMi: eklenti sitede açık mı (kapalıysa yöntem ödeme adımında ve panelde yoktur).
// - yontemHazirMi: açık ve çalışabilir mi (ör. ödeme kuruluşunun anahtarları var); değilse müşteri yöntemi görmez.
// - baslat: "Siparişi onayla"dan sonra, oturum ve ayırma yazıldıktan sonra çağrılır; müşterinin gideceği adresi verir.
//   Başlatılamazsa BilinenHata("is-kurali", yontem-ulasilamadi) atar; ödeme servisi ayırmayı bırakır.
//
// Yeni eklentili yöntem bu listeye bir satır ekler; ödeme modülü değişmez.
import type { Site } from "../ayar-semasi/site-klasoru.ts";
import { eklentiliOdemeYontemleri, type OdemeYontemi } from "../kayitlar/odeme.ts";
import type { Fatura, Teslimat } from "../moduller/odeme/semalar.ts";
import type { SepetHesabi } from "../moduller/sepet/hesap.ts";
import type { Veritabani } from "../veritabani/baglanti.ts";
import { eklentiAcikMi } from "./acik.ts";
import { kartlaOdemeHazirMi, kartlaOdemeyiBaslat } from "./kartla-odeme/baslat.ts";

export type EklentiliOdemeYontemi = keyof typeof eklentiliOdemeYontemleri;

// Başlatılan ödemenin bilgisi: ödeme oturumu ve sunucunun hesabı (tutar yalnız buradan gelir).
export type EklentiliOdemeGirdisi = {
  oturum: string;
  eposta: string;
  musteri: string | null;
  teslimat: Teslimat;
  fatura: Fatura;
  hesap: SepetHesabi;
  // Müşterinin adresi (ödeme kuruluşu sahtecilik denetiminde kullanır); bilinmiyorsa yok.
  ip: string | undefined;
};

type SiteBilgisi = Pick<Site, "ayarlar" | "kimlik">;

const yontemler: Record<
  EklentiliOdemeYontemi,
  {
    hazirMi: (site: SiteBilgisi) => boolean;
    baslat: (
      vt: Veritabani,
      site: Site,
      girdi: EklentiliOdemeGirdisi,
    ) => Promise<{ adres: string }>;
  }
> = {
  kart: { hazirMi: kartlaOdemeHazirMi, baslat: kartlaOdemeyiBaslat },
};

export const eklentiliMi = (yontem: OdemeYontemi): yontem is EklentiliOdemeYontemi =>
  Object.hasOwn(eklentiliOdemeYontemleri, yontem);

// Yöntem sitede var mı: çekirdeğin yöntemi her zaman, eklentili yöntem eklentisi açıkken.
export const yontemSitedeVarMi = (site: SiteBilgisi, yontem: OdemeYontemi): boolean =>
  !eklentiliMi(yontem) || eklentiAcikMi(site, eklentiliOdemeYontemleri[yontem]);

// Müşteri yöntemi kullanabilir mi: sitede var ve eklenti çalışabilir.
export const yontemHazirMi = (site: SiteBilgisi, yontem: OdemeYontemi): boolean =>
  !eklentiliMi(yontem) || (yontemSitedeVarMi(site, yontem) && yontemler[yontem].hazirMi(site));

export const eklentiliOdemeyiBaslat = (
  vt: Veritabani,
  site: Site,
  yontem: EklentiliOdemeYontemi,
  girdi: EklentiliOdemeGirdisi,
): Promise<{ adres: string }> => yontemler[yontem].baslat(vt, site, girdi);
