// Vitrinin favoriler sayfası (kart 0140): /favoriler.
import type { Metadata } from "next";
import { FavorilerSayfasi, favorilerSayfaBilgisi } from "../../../../vitrin/favoriler-sayfasi";

export const generateMetadata = (): Promise<Metadata> => favorilerSayfaBilgisi();

export default function FavorilerAdresi() {
  return <FavorilerSayfasi />;
}
