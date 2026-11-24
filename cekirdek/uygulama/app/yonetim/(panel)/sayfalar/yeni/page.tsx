// Yeni sabit sayfa (kart 0273): sayfa ekranı boş formla; kaydedilince sayfanın kendi ekranı açılır.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import { SayfaEkrani } from "../../../../../../yonetim-paneli/sayfalar/ekran";
import { sayfaEkraniVerisi } from "../../../../../../yonetim-paneli/sayfalar/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("yeni-sayfa");

export default async function YeniSayfaSayfasi() {
  await panelSayfasiniAc("yeni-sayfa");
  const { yetkili } = await panelOturumu();
  const veri = await sayfaEkraniVerisi(undefined, yetkili);
  if (veri === undefined) notFound();
  return (
    <PanelSayfasi kod="yeni-sayfa">
      <SayfaEkrani veri={veri} />
    </PanelSayfasi>
  );
}
