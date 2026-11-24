// Mağaza bilgileri ekranı (kart 0278, karar 0175). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra
// ayarlar okunur; değişiklik tarayıcıdan mağaza bilgileri ucuna gider.
import type { Metadata } from "next";
import { MagazaBilgileriEkrani } from "../../../../../yonetim-paneli/magaza-bilgileri/ekran";
import { magazaBilgileriVerisi } from "../../../../../yonetim-paneli/magaza-bilgileri/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("magaza-bilgileri");

export default async function MagazaBilgileriSayfasi() {
  await panelSayfasiniAc("magaza-bilgileri");
  const { yetkili } = await panelOturumu();
  const veri = await magazaBilgileriVerisi();
  return (
    <PanelSayfasi kod="magaza-bilgileri">
      <MagazaBilgileriEkrani veri={veri} izinli={yetkili("magaza-ayarlari.degistir")} />
    </PanelSayfasi>
  );
}
