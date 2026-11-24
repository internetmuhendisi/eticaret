// Yöneticinin kendi hesabı (kart 0274 ve 0053, karar 0178): rolleri ve yedek kodlarını yenileme.
import type { Metadata } from "next";
import { ekipKisiVerisi } from "../../../../../yonetim-paneli/ekip/veri";
import { HesabimEkrani } from "../../../../../yonetim-paneli/hesabim/ekran";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("hesabim");

export default async function HesabimSayfasi() {
  await panelSayfasiniAc("hesabim");
  const oturum = await panelOturumu();
  const veri = await ekipKisiVerisi(oturum.kimlik, oturum.kimlik);
  return (
    <PanelSayfasi kod="hesabim">
      <HesabimEkrani
        eposta={oturum.eposta}
        roller={veri?.kisi.roller ?? []}
        ikiAsamaKurulu={veri?.kisi.ikiAsamaKurulu ?? false}
        yenileyebilir={oturum.yetkili("ekip.kendi-hesabi.degistir")}
      />
    </PanelSayfasi>
  );
}
