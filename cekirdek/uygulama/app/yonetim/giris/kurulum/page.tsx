// İki aşamalı girişin kurulum ekranı (kart 0028). Şifreden geçmemiş kişi giriş sayfasına, kurulumu
// bitmiş kişi kod ekranına döner: gizli bir daha gösterilmez.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { metin } from "../../../../../metinler/site-metni";
import { magazaninAdi } from "../../../../../moduller/magaza-ayarlari/servis";
import { kurulumuHazirla } from "../../../../../moduller/oturum/iki-asamali-giris";
import { siteninVeritabani } from "../../../../../veritabani/baglanti";
import {
  donusParametresi,
  girisAdresi,
  guvenliDonus,
  kodAdresi,
} from "../../../../../yonetim-paneli/adresler";
import { sayfadakiGirisAdimi } from "../../../../../yonetim-paneli/giris-adimi";
import { Karekod } from "../../../../../yonetim-paneli/karekod";
import { KurulumAkisi } from "../../../../../yonetim-paneli/kurulum-akisi";
import { stil } from "../../../../../yonetim-paneli/stil";

export const generateMetadata = (): Metadata => ({ title: metin("yonetim.kurulum.baslik") });

export default async function KurulumSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const adim = await sayfadakiGirisAdimi();
  if (adim === null) redirect(girisAdresi);
  if (adim.durum === "kod") redirect(kodAdresi);
  const kurulum = await kurulumuHazirla(
    siteninVeritabani(),
    adim.anahtar,
    adim,
    await magazaninAdi(),
  );
  if (kurulum === null) redirect(kodAdresi);
  const donus = (await searchParams)[donusParametresi];
  return (
    <main>
      <h1>{metin("yonetim.kurulum.baslik")}</h1>
      <p>{metin("yonetim.kurulum.aciklama")}</p>
      <KurulumAkisi
        donus={guvenliDonus(typeof donus === "string" ? donus : null)}
        hazirlik={
          <>
            <p>{metin("yonetim.kurulum.adim1")}</p>
            <p>{metin("yonetim.kurulum.adim2")}</p>
            <Karekod deger={kurulum.adres} etiket={metin("yonetim.kurulum.karekod")} />
            <p>{metin("yonetim.kurulum.metinAnahtar")}</p>
            <p className={stil.metinAnahtar}>{kurulum.gizli}</p>
          </>
        }
      />
    </main>
  );
}
