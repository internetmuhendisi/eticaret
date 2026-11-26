// Yeni kupon (kart 0313, karar 0188): boş form; kaydedilince kuponun sayfası açılır.
import type { Metadata } from "next";
import { KuponFormuEkrani } from "../../../../../../yonetim-paneli/kuponlar/kupon-formu";
import { kuponEkraniVerisi } from "../../../../../../yonetim-paneli/kuponlar/veri";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("yeni-kupon");

export default async function YeniKuponSayfasi() {
  await panelSayfasiniAc("yeni-kupon");
  const veri = await kuponEkraniVerisi(undefined);
  return (
    <PanelSayfasi kod="yeni-kupon">
      {veri === undefined ? null : <KuponFormuEkrani veri={veri} />}
    </PanelSayfasi>
  );
}
