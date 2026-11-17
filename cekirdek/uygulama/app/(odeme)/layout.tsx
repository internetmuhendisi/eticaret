// Ödeme adımının çerçevesi (kart 0213, karar 0132): vitrinin üst ve alt kısmı yerine sade üst ve alt kısım. Adres
// değişmez, (odeme) yalnız klasör grubudur.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { vitrinSayfaKalibi } from "../../../moduller/gorunurluk/sayfa-bilgisi";
import { OdemeCercevesi } from "../../../vitrin/odeme/cerceve";

export const generateMetadata = (): Promise<Metadata> => vitrinSayfaKalibi();

export default function OdemeDuzeni({ children }: { children: ReactNode }) {
  return <OdemeCercevesi>{children}</OdemeCercevesi>;
}
