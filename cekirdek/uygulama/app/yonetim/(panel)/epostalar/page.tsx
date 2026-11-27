// E-postalar ekranı (kart 0279, karar 0197). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra veri
// okunur; değişiklik tarayıcıdan e-posta uçlarına gider.
import type { Metadata } from "next";
import { EpostalarEkrani } from "../../../../../yonetim-paneli/epostalar/ekran";
import { epostalarVerisi } from "../../../../../yonetim-paneli/epostalar/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("epostalar");

export default async function EpostalarSayfasi() {
  await panelSayfasiniAc("epostalar");
  const { yetkili } = await panelOturumu();
  const veri = await epostalarVerisi();
  return (
    <PanelSayfasi kod="epostalar">
      <EpostalarEkrani veri={veri} izinli={yetkili("magaza-ayarlari.degistir")} />
    </PanelSayfasi>
  );
}
