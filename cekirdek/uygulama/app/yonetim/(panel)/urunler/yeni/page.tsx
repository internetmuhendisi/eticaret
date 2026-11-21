// Yeni ürün (kart 0263): ürün ekranı boş formla; kaydedilince ürünün kendi ekranı açılır.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import { UrunEkrani } from "../../../../../../yonetim-paneli/urunler/urun-ekrani";
import { urunEkraniVerisi } from "../../../../../../yonetim-paneli/urunler/urun-verisi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("yeni-urun");

export default async function YeniUrunSayfasi() {
  await panelSayfasiniAc("yeni-urun");
  const { yetkili } = await panelOturumu();
  const veri = await urunEkraniVerisi(undefined, yetkili);
  if (veri === undefined) notFound();
  return (
    <PanelSayfasi kod="yeni-urun">
      <UrunEkrani veri={veri} />
    </PanelSayfasi>
  );
}
