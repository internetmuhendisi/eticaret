// Panel adreslerinin girişi (kart 0027, karar 0042). Ara katmandan çağrılır: oturumu okur, gerekirse
// anahtarı yeniler, girişsiz isteği giriş sayfasına yönlendirir. Şifreden geçmiş ama kodu ya da kurulumu
// bitmemiş kişi panele değil o adıma gider (kart 0028). Çerezler yanıta yazılmalıdır.
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import { girisAdimiCerezi } from "../kayitlar/oturum.ts";
import { girisAdiminiOku } from "../moduller/oturum/iki-asamali-giris.ts";
import { siteninVeritabani } from "../veritabani/baglanti.ts";
import {
  adimAdresi,
  davetKabulAdresi,
  donusParametresi,
  girisAdresi,
  guvenliDonus,
  kodAdresi,
  kurulumAdresi,
  panelAdresi,
  sifremiUnuttumAdresi,
  sifreYenileAdresi,
} from "../yonetim-paneli/adresler.ts";
import {
  cerezOku,
  girisAdimiCereziniSil,
  istektenOturumAl,
  oturumSuresiSaniye,
} from "./oturum-cerezi.ts";

const donuslu = (adres: string, donus: string): string =>
  donus === panelAdresi ? adres : `${adres}?${donusParametresi}=${encodeURIComponent(donus)}`;

export const panelYoklamasi = async (
  istek: Request,
): Promise<{ yonlendir: string | null; cerezler: string[] }> => {
  const { pathname, search, searchParams } = new URL(istek.url);
  const vt = siteninVeritabani();
  const { hesapKimligi, cerezler } = await istektenOturumAl(
    vt,
    "yonetici",
    istek,
    oturumSuresiSaniye("yonetici", calisanSite().ayarlar),
  );
  // Şifre sıfırlama ve davet kabul sayfaları hesap ve adım gözetmeden açılır (kartlar 0034, 0275): yönlendirme
  // bağlantıdaki anahtarı kaybederdi, sayfaların kendisi panele girmez.
  if (
    pathname === sifremiUnuttumAdresi ||
    pathname === sifreYenileAdresi ||
    pathname === davetKabulAdresi
  ) {
    return { yonlendir: null, cerezler };
  }
  const girisSayfasi = pathname === girisAdresi;
  const adimSayfasi = pathname === kodAdresi || pathname === kurulumAdresi;
  const istenenDonus = guvenliDonus(searchParams.get(donusParametresi));

  if (hesapKimligi !== null) {
    if (girisSayfasi || adimSayfasi) return { yonlendir: istenenDonus, cerezler };
    return { yonlendir: null, cerezler };
  }

  const adimAnahtari = cerezOku(istek, girisAdimiCerezi);
  const adim = await girisAdiminiOku(vt, adimAnahtari);
  const bayatAdim = adim === null && adimAnahtari !== undefined;
  const tumCerezler = bayatAdim ? [...cerezler, girisAdimiCereziniSil()] : cerezler;
  // Giriş sayfası her zaman açılır: ara adımı olan kişi de baştan başka hesapla girebilir.
  if (girisSayfasi) return { yonlendir: null, cerezler: tumCerezler };

  const donus = adimSayfasi ? istenenDonus : guvenliDonus(`${pathname}${search}`);
  if (adim === null) return { yonlendir: donuslu(girisAdresi, donus), cerezler: tumCerezler };
  const hedef = adimAdresi(adim.durum);
  if (pathname === hedef) return { yonlendir: null, cerezler: tumCerezler };
  return { yonlendir: donuslu(hedef, donus), cerezler: tumCerezler };
};
