// Sipariş ayarları ekranı (kart 0234): kargo firmaları. Önce sayfanın izni denetlenir, sonra ayar okunur; değişiklik
// tarayıcıdan sipariş ayarları ucuna gider.
import type { Metadata } from "next";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import { SiparisAyarlariEkrani } from "../../../../../yonetim-paneli/siparisler/ayarlar";
import { siparisAyarlariVerisi } from "../../../../../yonetim-paneli/siparisler/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("siparis-ayarlari");

export default async function SiparisAyarlariSayfasi() {
  await panelSayfasiniAc("siparis-ayarlari");
  const { yetkili } = await panelOturumu();
  const { kargoFirmalari } = await siparisAyarlariVerisi();
  return (
    <PanelSayfasi kod="siparis-ayarlari">
      <SiparisAyarlariEkrani
        firmalar={kargoFirmalari}
        izinli={yetkili("magaza-ayarlari.degistir")}
      />
    </PanelSayfasi>
  );
}
