// Hesabım (kart 0237, karar 0149): /hesabim. Hesabın açılış sayfasına gider (hesapIlkSayfasi); girişsiz müşteri önce
// girişe gider, girişten sonra buraya döner.
import { redirect } from "next/navigation";
import { hesapIlkSayfasi, vitrinAdresleri } from "../../../../vitrin/adresler";
import { hesapSayfasiniAc } from "../../../../vitrin/hesap/oturum";

export default async function HesabimAdresi() {
  await hesapSayfasiniAc(vitrinAdresleri.hesabim);
  redirect(hesapIlkSayfasi);
}
