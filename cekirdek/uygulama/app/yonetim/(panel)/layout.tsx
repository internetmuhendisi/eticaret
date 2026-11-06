// Girişli panel sayfalarının düzeni. Asıl kontrol ara katmandadır (proxy.ts); bu ikinci katmandır,
// adres eşleşmesi bir gün yanılsa bile panel açılmaz. Anahtarı değiştirmeden sorar: sayfa çizerken
// çerez yazılamaz (karar 0039, 0042).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { oturumCerezAdlari } from "../../../../kayitlar/oturum";
import { oturumAcikMi } from "../../../../moduller/oturum/servis";
import { siteninVeritabani } from "../../../../veritabani/baglanti";
import { girisAdresi } from "../../../../yonetim-paneli/adresler";

export default async function PanelDuzeni({ children }: { children: ReactNode }) {
  const cerezler = await cookies();
  const kisaAnahtar = cerezler.get(oturumCerezAdlari.yonetici.kisa)?.value;
  const yenilemeAnahtari = cerezler.get(oturumCerezAdlari.yonetici.yenileme)?.value;
  const acik = await oturumAcikMi(siteninVeritabani(), "yonetici", {
    ...(kisaAnahtar === undefined ? {} : { kisaAnahtar }),
    ...(yenilemeAnahtari === undefined ? {} : { yenilemeAnahtari }),
  });
  if (!acik) redirect(girisAdresi);
  return children;
}
