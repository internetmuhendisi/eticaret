// Ekibe davetin kabul sayfası (kart 0275, karar 0179). Panel giriş sayfasının düzenindedir; ara katman hesap ve adım
// gözetmeden açar (bağlantının anahtarı adresin # sonrasındadır, yönlendirme onu kaybederdi). Tema demosunda davet
// uçları kapalıdır: sayfa açılır, bağlantı geçersiz görünür.
//
// Bu tarayıcıda panele açık bir oturum varsa form çizilmez (bağımsız kontrolün bulgusu): kabulden sonra kurulum
// ekranı açık oturumu panele gönderir, yeni hesap kurulumsuz kalırdı. Kişiye önce çıkış yapması söylenir. Oturum
// anahtarı değiştirilmeden okunur (sayfa çizerken çerez yazılamaz).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Baglanti } from "../../../../../../bilesenler/parcalar/baglanti";
import { Uyari } from "../../../../../../bilesenler/parcalar/uyari";
import { oturumCerezAdlari } from "../../../../../kayitlar/oturum";
import { metin } from "../../../../../metinler/site-metni";
import { magazaninAdi } from "../../../../../moduller/magaza-ayarlari/servis";
import { oturumAcikMi } from "../../../../../moduller/oturum/servis";
import { siteninVeritabani } from "../../../../../veritabani/baglanti";
import { panelAdresi } from "../../../../../yonetim-paneli/adresler";
import { DavetKabulFormu } from "../../../../../yonetim-paneli/davet-kabul-formu";

export const generateMetadata = (): Metadata => ({ title: metin("yonetim.davet.baslik") });

export default async function DavetKabulSayfasi() {
  const cerezler = await cookies();
  const kisaAnahtar = cerezler.get(oturumCerezAdlari.yonetici.kisa)?.value;
  const yenilemeAnahtari = cerezler.get(oturumCerezAdlari.yonetici.yenileme)?.value;
  const acik = await oturumAcikMi(siteninVeritabani(), "yonetici", {
    ...(kisaAnahtar === undefined ? {} : { kisaAnahtar }),
    ...(yenilemeAnahtari === undefined ? {} : { yenilemeAnahtari }),
  });
  return (
    <main>
      {acik ? (
        <>
          <h1>{metin("yonetim.davet.baslik")}</h1>
          <Uyari tur="uyari">{metin("yonetim.davet.oturumAcik")}</Uyari>
          <Baglanti href={panelAdresi}>{metin("yonetim.davet.panelDon")}</Baglanti>
        </>
      ) : (
        <DavetKabulFormu magaza={await magazaninAdi()} />
      )}
    </main>
  );
}
