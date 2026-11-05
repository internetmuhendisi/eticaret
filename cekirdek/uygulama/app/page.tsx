// Vitrinin ana sayfası. Şimdilik sitenin adını ve ayarı açıksa "Yakında açılıyoruz." yazısını
// gösterir (kartlar 0009, 0010, 0041).
import type { Metadata } from "next";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin } from "../../metinler/site-metni";

export const generateMetadata = (): Metadata => ({ title: calisanSite().kimlik.gorunenAd });

export default function VitrinAnaSayfa() {
  const { kimlik, ayarlar } = calisanSite();
  return (
    <main>
      <h1>{kimlik.gorunenAd}</h1>
      {ayarlar.yakindaYazisi ? <p>{metin("vitrin.anasayfa.yakindaAciliyoruz")}</p> : null}
    </main>
  );
}
