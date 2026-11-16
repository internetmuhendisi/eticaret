// Kargo ekranı (kart 0212). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra ayarlar okunur; değişiklik
// tarayıcıdan kargo ayarları ucuna gider.
import type { Metadata } from "next";
import { KargoEkrani } from "../../../../../yonetim-paneli/kargo/ekran";
import { kargoEkraniVerisi } from "../../../../../yonetim-paneli/kargo/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("kargo");

export default async function KargoSayfasi() {
  await panelSayfasiniAc("kargo");
  const { yetkili } = await panelOturumu();
  const veri = await kargoEkraniVerisi();
  return (
    <PanelSayfasi kod="kargo">
      <KargoEkrani veri={veri} izinli={yetkili("magaza-ayarlari.degistir")} />
    </PanelSayfasi>
  );
}
