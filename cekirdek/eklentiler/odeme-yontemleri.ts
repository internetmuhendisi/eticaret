// Ödeme yöntemi bağlantı noktası (kart 0215, karar 0142): eklentiyle gelen ödeme yöntemlerinin çekirdeğe bağlandığı
// tek nokta. Kayıttaki yöntem bir eklentiye bağlıdır (eklentiliOdemeYontemleri, cekirdek/kayitlar/odeme.ts); ödeme
// modülü eklentiyi tanımaz, yalnız buradan sorar:
// - yontemSitedeVarMi: eklenti sitede açık mı (kapalıysa yöntem ödeme adımında ve panelde yoktur).
// - yontemHazirMi: açık ve çalışabilir mi (ör. ödeme kuruluşunun anahtarları var); değilse müşteri yöntemi görmez.
// - baslat: "Siparişi onayla"dan sonra, oturum ve ayırma yazıldıktan sonra çağrılır; müşterinin gideceği adresi verir.
//   Başlatılamazsa BilinenHata("is-kurali", yontem-ulasilamadi) atar; ödeme servisi ayırmayı bırakır.
// - iadeEt: siparişin iptali ya da iadesinde paranın kuruluştan geri dönmesi (kart 0235, karar 0147). Sipariş iadesi
//   "bekliyor" olarak yazıldıktan sonra, işlemin dışında çağrılır; aynı iade için ikinci çağrı kuruluşa ikinci kez
//   gitmez. Sonuç: tamam (para döndü), red (kuruluş açıkça reddetti, hiçbir şey dönmedi) ya da belirsiz (yanıt gelmedi;
//   eklentinin taraması sonucu bulunca siparis/iade.ts'in iadeSonucunuIsle'sini çağırır).
//
// Yeni eklentili yöntem bu listeye bir satır ekler; ödeme modülü değişmez.
import type { Site } from "../ayar-semasi/site-klasoru.ts";
import { eklentiliOdemeYontemleri, type OdemeYontemi } from "../kayitlar/odeme.ts";
import type { Fatura, Teslimat } from "../moduller/odeme/semalar.ts";
import type { SepetHesabi } from "../moduller/sepet/hesap.ts";
import type { Veritabani } from "../veritabani/baglanti.ts";
import { eklentiAcikMi } from "./acik.ts";
import { kartlaOdemeHazirMi, kartlaOdemeyiBaslat } from "./kartla-odeme/baslat.ts";
import { kartlaIadeEt } from "./kartla-odeme/iade.ts";

export type EklentiliOdemeYontemi = keyof typeof eklentiliOdemeYontemleri;

// Kuruluştan geri dönecek para: iadenin kimliği, siparişi, tutarı ve kalemlere dağılımı (birim başına tutar, kargo).
// Kalemlerin ve kargonun toplamı tutardan az olabilir (tam iadede taksit farkı, elle tutar): eklenti farkı dağıtır.
export type EklentiliIadeIstegi = {
  iade: string;
  siparis: string;
  tutar: number;
  kalemler: { birim: string; tutar: number }[];
  kargoTutari: number;
};
export type EklentiliIadeSonucu = "tamam" | "red" | "belirsiz";

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
    iadeEt: (
      vt: Veritabani,
      site: Site,
      istek: EklentiliIadeIstegi,
    ) => Promise<EklentiliIadeSonucu>;
  }
> = {
  kart: {
    hazirMi: kartlaOdemeHazirMi,
    baslat: kartlaOdemeyiBaslat,
    // Eklentinin iade taraması çekirdeğin iade servisini, o da bu dosyayı yükler (döngü): işlev çağrı anında okunur.
    iadeEt: (vt, site, istek) => kartlaIadeEt(vt, site, istek),
  },
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

// İade kuruluştan mı döner: yöntem eklentili ise (eklenti sonradan kapansa da para aynı yoldan döner).
export const eklentiliIadeEt = (
  vt: Veritabani,
  site: Site,
  yontem: EklentiliOdemeYontemi,
  istek: EklentiliIadeIstegi,
): Promise<EklentiliIadeSonucu> => yontemler[yontem].iadeEt(vt, site, istek);
