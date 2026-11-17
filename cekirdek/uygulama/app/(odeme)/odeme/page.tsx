// Ödeme sayfası (kart 0213): /odeme.
import type { Metadata } from "next";
import { OdemeSayfasi, odemeSayfaBilgisi } from "../../../../vitrin/odeme/odeme-sayfasi";

export const generateMetadata = (): Promise<Metadata> => odemeSayfaBilgisi();

export default function OdemeAdresi() {
  return <OdemeSayfasi />;
}
