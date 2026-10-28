// Vitrinin ana sayfası. Şimdilik yalnız sitenin adını gösterir (kartlar 0009, 0010).
import type { Metadata } from "next";
import { calisanSite } from "../../ayar-semasi/calisan-site";

const { kimlik } = calisanSite();

export const metadata: Metadata = { title: kimlik.gorunenAd };

export default function VitrinAnaSayfa() {
  return (
    <main>
      <h1>{kimlik.gorunenAd}</h1>
    </main>
  );
}
