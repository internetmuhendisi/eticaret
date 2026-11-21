// Kategoriler ekranı (kart 0261). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra kategori ağacı
// okunur. Değişiklikler tarayıcıdan kategori uçlarına gider.
import type { Metadata } from "next";
import {
  KategorilerEylemleri,
  KategorilerIcerigi,
  KategorilerSaglayici,
} from "../../../../../yonetim-paneli/kategoriler/ekran";
import { kategorilerEkraniVerisi } from "../../../../../yonetim-paneli/kategoriler/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("kategoriler");

export default async function KategorilerSayfasi() {
  await panelSayfasiniAc("kategoriler");
  const { yetkili } = await panelOturumu();
  const degistirebilir = yetkili("kategori.degistir");
  const veri = await kategorilerEkraniVerisi(yetkili("dosya.gor"));
  return (
    <KategorilerSaglayici
      veri={veri}
      degistirebilir={degistirebilir}
      silebilir={yetkili("kategori.sil")}
    >
      <PanelSayfasi
        kod="kategoriler"
        {...(degistirebilir ? { eylemler: <KategorilerEylemleri /> } : {})}
      >
        <KategorilerIcerigi />
      </PanelSayfasi>
    </KategorilerSaglayici>
  );
}
