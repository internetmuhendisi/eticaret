// Özellikler ekranı (kart 0261). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra özellikler
// kullanımlarıyla okunur. Değişiklikler tarayıcıdan özellik uçlarına gider.
import type { Metadata } from "next";
import {
  OzelliklerEylemleri,
  OzelliklerIcerigi,
  OzelliklerSaglayici,
} from "../../../../../yonetim-paneli/ozellikler/ekran";
import { ozelliklerEkraniVerisi } from "../../../../../yonetim-paneli/ozellikler/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("ozellikler");

export default async function OzelliklerSayfasi() {
  await panelSayfasiniAc("ozellikler");
  const { yetkili } = await panelOturumu();
  const degistirebilir = yetkili("ozellik.degistir");
  const ozellikler = await ozelliklerEkraniVerisi();
  return (
    <OzelliklerSaglayici
      ozellikler={ozellikler}
      degistirebilir={degistirebilir}
      silebilir={yetkili("ozellik.sil")}
    >
      <PanelSayfasi
        kod="ozellikler"
        {...(degistirebilir ? { eylemler: <OzelliklerEylemleri /> } : {})}
      >
        <OzelliklerIcerigi />
      </PanelSayfasi>
    </OzelliklerSaglayici>
  );
}
