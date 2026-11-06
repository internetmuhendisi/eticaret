// Panel adreslerinin girişi (kart 0027, karar 0042). Ara katmandan çağrılır: oturumu okur, gerekirse
// anahtarı yeniler, girişsiz isteği giriş sayfasına yönlendirir. Çerezler yanıta yazılmalıdır.
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import { siteninVeritabani } from "../veritabani/baglanti.ts";
import {
  donusParametresi,
  girisAdresi,
  guvenliDonus,
  panelAdresi,
} from "../yonetim-paneli/adresler.ts";
import { istektenOturumAl, oturumSuresiSaniye } from "./oturum-cerezi.ts";

export const panelYoklamasi = async (
  istek: Request,
): Promise<{ yonlendir: string | null; cerezler: string[] }> => {
  const { pathname, search, searchParams } = new URL(istek.url);
  const { hesapKimligi, cerezler } = await istektenOturumAl(
    siteninVeritabani(),
    "yonetici",
    istek,
    oturumSuresiSaniye("yonetici", calisanSite().ayarlar),
  );
  const girisSayfasi = pathname === girisAdresi;
  if (hesapKimligi === null) {
    if (girisSayfasi) return { yonlendir: null, cerezler };
    const donus = guvenliDonus(`${pathname}${search}`);
    const sorgu = donus === panelAdresi ? "" : `?${donusParametresi}=${encodeURIComponent(donus)}`;
    return { yonlendir: `${girisAdresi}${sorgu}`, cerezler };
  }
  if (girisSayfasi) {
    return { yonlendir: guvenliDonus(searchParams.get(donusParametresi)), cerezler };
  }
  return { yonlendir: null, cerezler };
};
