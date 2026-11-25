// Ekibe davetin kabul sayfası (kart 0275, karar 0179). Panel giriş sayfasının düzenindedir; ara katman hesap ve adım
// gözetmeden açar (bağlantının anahtarı adresin # sonrasındadır, yönlendirme onu kaybederdi). Tema demosunda davet
// uçları kapalıdır: sayfa açılır, bağlantı geçersiz görünür.
import type { Metadata } from "next";
import { metin } from "../../../../../metinler/site-metni";
import { magazaninAdi } from "../../../../../moduller/magaza-ayarlari/servis";
import { DavetKabulFormu } from "../../../../../yonetim-paneli/davet-kabul-formu";

export const generateMetadata = (): Metadata => ({ title: metin("yonetim.davet.baslik") });

export default async function DavetKabulSayfasi() {
  return (
    <main>
      <DavetKabulFormu magaza={await magazaninAdi()} />
    </main>
  );
}
