// Sayfalarda ara adımın okunması (kart 0028). Asıl kontrol ara katmandadır; sayfa ikinci kez sorar, adres
// eşleşmesi bir gün yanılsa bile kod ya da kurulum ekranı ara adımsız açılmaz. Çerez yazmaz.
import { cookies } from "next/headers";
import { girisAdimiCerezi } from "../kayitlar/oturum";
import { girisAdiminiOku } from "../moduller/oturum/iki-asamali-giris";
import { siteninVeritabani } from "../veritabani/baglanti";

export const sayfadakiGirisAdimi = async () => {
  const anahtar = (await cookies()).get(girisAdimiCerezi)?.value;
  const adim = await girisAdiminiOku(siteninVeritabani(), anahtar);
  return adim === null || anahtar === undefined ? null : { ...adim, anahtar };
};
