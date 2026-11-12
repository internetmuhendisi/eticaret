// Panelin açılış sayfası: karşılama (kart 0141). Pano bugün yoktur, on dördüncü bölümde bu sayfaya gelir.
import type { Metadata } from "next";
import { PanelSayfasi, panelSayfaBilgisi } from "../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("karsilama");

export default function KarsilamaSayfasi() {
  return <PanelSayfasi kod="karsilama" />;
}
