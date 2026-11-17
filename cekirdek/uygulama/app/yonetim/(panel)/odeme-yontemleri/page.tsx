// Ödeme yöntemleri ekranı (kart 0214). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra ayarlar
// okunur; değişiklik tarayıcıdan ödeme yöntemleri ucuna gider.
import type { Metadata } from "next";
import { OdemeYontemleriEkrani } from "../../../../../yonetim-paneli/odeme-yontemleri/ekran";
import { odemeYontemleriEkraniVerisi } from "../../../../../yonetim-paneli/odeme-yontemleri/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("odeme-yontemleri");

export default async function OdemeYontemleriSayfasi() {
  await panelSayfasiniAc("odeme-yontemleri");
  const { yetkili } = await panelOturumu();
  const veri = await odemeYontemleriEkraniVerisi();
  return (
    <PanelSayfasi kod="odeme-yontemleri">
      <OdemeYontemleriEkrani veri={veri} izinli={yetkili("odeme-yontemi.degistir")} />
    </PanelSayfasi>
  );
}
