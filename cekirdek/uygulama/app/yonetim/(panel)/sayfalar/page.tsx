// Sabit sayfalar ekranı (kart 0273): sayfaların kısa listesi. Önce sayfanın izni denetlenir, sonra liste servisle okunur.
import type { Metadata } from "next";
import { yeniSayfaAdresi } from "../../../../../yonetim-paneli/adresler";
import { EylemBaglantisi } from "../../../../../yonetim-paneli/eylem-dugmesi";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import { SayfalarListesi } from "../../../../../yonetim-paneli/sayfalar/liste";
import { sayfalarListesiVerisi } from "../../../../../yonetim-paneli/sayfalar/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("sayfalar");

export default async function SayfalarSayfasi() {
  await panelSayfasiniAc("sayfalar");
  const { yetkili } = await panelOturumu();
  const sayfalar = await sayfalarListesiVerisi();
  const degistir = yetkili("icerik.degistir");
  return (
    <PanelSayfasi
      kod="sayfalar"
      {...(degistir && sayfalar.length > 0
        ? { eylemler: <EylemBaglantisi eylem="sayfa-ekle" asil href={yeniSayfaAdresi} /> }
        : {})}
    >
      <SayfalarListesi sayfalar={sayfalar} izinler={{ degistir, sil: yetkili("icerik.sil") }} />
    </PanelSayfasi>
  );
}
