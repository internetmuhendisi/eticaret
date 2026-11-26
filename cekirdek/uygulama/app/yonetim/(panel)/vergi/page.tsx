// Vergi ekranı (kart 0322). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra ayarlar ve vergi tablosu okunur;
// değişiklikler tarayıcıdan vergi uçlarına gider.
import type { Metadata } from "next";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import { VergiEkrani } from "../../../../../yonetim-paneli/vergi/ekran";
import { vergiEkraniVerisi } from "../../../../../yonetim-paneli/vergi/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("vergi");

export default async function VergiSayfasi() {
  await panelSayfasiniAc("vergi");
  const { yetkili } = await panelOturumu();
  const veri = await vergiEkraniVerisi();
  return (
    <PanelSayfasi kod="vergi">
      <VergiEkrani veri={veri} izinli={yetkili("vergi.degistir")} />
    </PanelSayfasi>
  );
}
