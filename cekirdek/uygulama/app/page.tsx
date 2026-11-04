// Vitrinin ana sayfası. Şimdilik yalnız sitenin adını gösterir (kartlar 0009, 0010).
import type { Metadata } from "next";
import { calisanSite } from "../../ayar-semasi/calisan-site";

export const generateMetadata = (): Metadata => ({ title: calisanSite().kimlik.gorunenAd });

export default function VitrinAnaSayfa() {
  const { kimlik } = calisanSite();
  return (
    <main>
      <h1>{kimlik.gorunenAd}</h1>
    </main>
  );
}
