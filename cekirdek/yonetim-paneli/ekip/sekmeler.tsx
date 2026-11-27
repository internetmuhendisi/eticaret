// Ekip ekranının sekmeleri (kart 0274; taslak: Kullanıcılar ve Roller, sayılarıyla). Sekmeler iki ayrı sayfadır; şerit
// ortak kütüphanenin sekme bağlantılarıdır (kart 0318).
import { SekmeBaglantilari } from "../../../bilesenler/parcalar/sekme-baglantilari";
import { metin } from "../../metinler/site-metni";
import { ekipAdresi, ekipRolleriAdresi } from "../adresler";

export function EkipSekmeleri({
  secili,
  kullaniciSayisi,
  rolSayisi,
}: {
  secili: "kullanicilar" | "roller";
  kullaniciSayisi: number;
  rolSayisi: number;
}) {
  return (
    <SekmeBaglantilari
      etiket={metin("yonetim.ekip.sekmeler")}
      secili={secili}
      sekmeler={[
        {
          kod: "kullanicilar",
          ad: metin("yonetim.ekip.kullanicilar"),
          adres: ekipAdresi,
          sayi: kullaniciSayisi,
        },
        {
          kod: "roller",
          ad: metin("yonetim.ekip.roller"),
          adres: ekipRolleriAdresi,
          sayi: rolSayisi,
        },
      ]}
    />
  );
}
