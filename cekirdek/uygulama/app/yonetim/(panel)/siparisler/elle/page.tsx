// Elle sipariş ekranı (kart 0236, karar 0148). Önce sayfanın izni denetlenir (siparis.yonet), sonra sitenin ödeme
// yöntemleri ve teslimat ülkeleri okunur; "ödeme alındı" yalnız izni olana sunulur.
import type { Metadata } from "next";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import { ElleSiparis } from "../../../../../../yonetim-paneli/siparisler/elle-siparis";
import { elleSiparisVerisi } from "../../../../../../yonetim-paneli/siparisler/elle-veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("elle-siparis");

export default async function ElleSiparisSayfasi() {
  await panelSayfasiniAc("elle-siparis");
  const { yetkili } = await panelOturumu();
  const veri = await elleSiparisVerisi(yetkili);
  return (
    <PanelSayfasi kod="elle-siparis">
      <ElleSiparis veri={veri} />
    </PanelSayfasi>
  );
}
