// Vitrinin sepet sayfası (kart 0212): /sepet.
import type { Metadata } from "next";
import { SepetSayfasi, sepetSayfaBilgisi } from "../../../../vitrin/sepet/sepet-sayfasi";

export const generateMetadata = (): Promise<Metadata> => sepetSayfaBilgisi();

export default function SepetAdresi() {
  return <SepetSayfasi />;
}
