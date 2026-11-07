// Vitrinin ana sayfası. Şimdilik sitenin adını ve ayarı açıksa "Yakında açılıyoruz." yazısını
// gösterir (kartlar 0009, 0010, 0041). Hesap alanı başlığın üstündedir (kart 0033).
import type { Metadata } from "next";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin } from "../../metinler/site-metni";
import { HesapAlani } from "../../vitrin/hesap-alani";

export const generateMetadata = (): Metadata => ({ title: calisanSite().kimlik.gorunenAd });

export default function VitrinAnaSayfa() {
  const { kimlik, ayarlar } = calisanSite();
  return (
    <>
      <HesapAlani />
      <main>
        <h1>{kimlik.gorunenAd}</h1>
        {ayarlar.yakindaYazisi ? <p>{metin("vitrin.anasayfa.yakindaAciliyoruz")}</p> : null}
      </main>
    </>
  );
}
