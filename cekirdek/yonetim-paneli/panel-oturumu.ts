// Panel sayfasını çizen isteğin yöneticisi (kart 0141): kimliği, e-postası ve izinleri. Düzen ve sayfa aynı
// istekte bir kez okur (React cache). Anahtarı değiştirmeden sorar: sayfa çizerken çerez yazılamaz (karar 0039,
// 0042). Oturum yoksa giriş sayfasına yönlenir; asıl kontrol ara katmandadır, bu ikinci katmandır.
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { oturumCerezAdlari } from "../kayitlar/oturum";
import { yoneticiler } from "../moduller/ekip/model";
import { type YoneticiYetkileri, yoneticininYetkileri } from "../moduller/ekip/servis";
import { oturumunHesabi } from "../moduller/oturum/servis";
import { siteninVeritabani } from "../veritabani/baglanti";
import { girisAdresi } from "./adresler";

export type PanelOturumu = { kimlik: string; eposta: string; yetkili: YoneticiYetkileri };

export const panelOturumu = cache(async (): Promise<PanelOturumu> => {
  const cerezler = await cookies();
  const kisaAnahtar = cerezler.get(oturumCerezAdlari.yonetici.kisa)?.value;
  const yenilemeAnahtari = cerezler.get(oturumCerezAdlari.yonetici.yenileme)?.value;
  const vt = siteninVeritabani();
  const kimlik = await oturumunHesabi(vt, "yonetici", {
    ...(kisaAnahtar === undefined ? {} : { kisaAnahtar }),
    ...(yenilemeAnahtari === undefined ? {} : { yenilemeAnahtari }),
  });
  if (kimlik === null) redirect(girisAdresi);
  const [[hesap], yetkili] = await Promise.all([
    vt
      .select({ eposta: yoneticiler.eposta })
      .from(yoneticiler)
      .where(and(eq(yoneticiler.kimlik, kimlik), isNull(yoneticiler.silinme_zamani))),
    yoneticininYetkileri(vt, kimlik),
  ]);
  // Oturum ile bu okuma arasında hesap kapatılmış olabilir.
  if (hesap === undefined) redirect(girisAdresi);
  return { kimlik, eposta: hesap.eposta, yetkili };
});
