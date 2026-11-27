// Panelin açılış sayfası: karşılama ve pano (kart 0141, 0186; karar 0199). Başlık günün selamı, altı bugünün tarihi;
// içerik yöneticinin izinlerine göre kurulan panodur (pano/veri.ts). Her kutu kendi okunur, okunamayan kutu yalnız
// kendi yerinde hata söyler.
import type { Metadata } from "next";
import { siteninVeritabani } from "../../../../veritabani/baglanti";
import { panelOturumu } from "../../../../yonetim-paneli/panel-oturumu";
import { PanelSayfasi, panelSayfaBilgisi } from "../../../../yonetim-paneli/panel-sayfasi";
import { Pano } from "../../../../yonetim-paneli/pano/pano";
import { panoVerisi } from "../../../../yonetim-paneli/pano/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("karsilama");

export default async function KarsilamaSayfasi() {
  const { yetkili } = await panelOturumu();
  const veri = await panoVerisi(siteninVeritabani(), yetkili);
  return (
    <PanelSayfasi kod="karsilama" baslik={veri.baslik} altBaslik={veri.altBaslik}>
      <Pano veri={veri} />
    </PanelSayfasi>
  );
}
