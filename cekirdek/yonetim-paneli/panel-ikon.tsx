// Panelin ikonu (kart 0295, karar 0172): ortak sözlükteki ya da panelin sözlüğündeki ikon. Panelin menü sayfaları ve
// eylemleri yalnız panelin sözlüğündedir; vitrin onları indirmez. Kütüphane parçasına (boş hâl, düğme) panel ikonu
// `panelIkonu(ad)` ile verilir.
import { Ikon } from "../../bilesenler/ikonlar/ikon";
import { type PanelIkonAdi, panelIkonlari } from "../../bilesenler/ikonlar/panel-sozlugu";
import { type IkonBileseni, ikonlar } from "../../bilesenler/ikonlar/sozluk";

export const panelIkonu = (ad: PanelIkonAdi): IkonBileseni =>
  ad in panelIkonlari
    ? panelIkonlari[ad as keyof typeof panelIkonlari]
    : ikonlar[ad as keyof typeof ikonlar];

export function PanelIkon({ ad, className }: { ad: PanelIkonAdi; className?: string }) {
  return <Ikon ad={panelIkonu(ad)} {...(className === undefined ? {} : { className })} />;
}
