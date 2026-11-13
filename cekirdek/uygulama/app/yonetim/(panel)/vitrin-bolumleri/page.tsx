// Vitrin bölümleri ekranı (kart 0142). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra düzen
// okunur; değişiklikler tarayıcıdan düzen uçlarına gider.
import type { Metadata } from "next";
import { Uyari } from "../../../../../../bilesenler/parcalar/uyari";
import { metin } from "../../../../../metinler/site-metni";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import {
  BolumlerEylemleri,
  BolumlerListesi,
  BolumlerSaglayici,
} from "../../../../../yonetim-paneli/vitrin-bolumleri/ekran";
import { bolumlerEkraniVerisi } from "../../../../../yonetim-paneli/vitrin-bolumleri/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("vitrin-bolumleri");

export default async function VitrinBolumleriSayfasi() {
  await panelSayfasiniAc("vitrin-bolumleri");
  const { yetkili } = await panelOturumu();
  const degistirebilir = yetkili("duzen.degistir");
  const veri = await bolumlerEkraniVerisi();
  if (veri.durum !== "hazir") {
    return (
      <PanelSayfasi kod="vitrin-bolumleri">
        <Uyari tur="bilgi">{metin("yonetim.bolumler.hata.katalog")}</Uyari>
      </PanelSayfasi>
    );
  }
  return (
    <BolumlerSaglayici veri={veri} degistirebilir={degistirebilir}>
      <PanelSayfasi
        kod="vitrin-bolumleri"
        {...(degistirebilir ? { eylemler: <BolumlerEylemleri /> } : {})}
      >
        <BolumlerListesi />
      </PanelSayfasi>
    </BolumlerSaglayici>
  );
}
