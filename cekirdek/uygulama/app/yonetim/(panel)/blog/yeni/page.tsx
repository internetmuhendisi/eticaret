// Yeni blog yazısı (kart 0272): yazı ekranı boş formla; kaydedilince yazının kendi ekranı açılır.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogYazisiEkraniVerisi } from "../../../../../../yonetim-paneli/blog/veri";
import { BlogYazisiEkrani } from "../../../../../../yonetim-paneli/blog/yazi-ekrani";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("yeni-blog-yazisi");

export default async function YeniBlogYazisiSayfasi() {
  await panelSayfasiniAc("yeni-blog-yazisi");
  const { yetkili } = await panelOturumu();
  const veri = await blogYazisiEkraniVerisi(undefined, yetkili);
  if (veri === undefined) notFound();
  return (
    <PanelSayfasi kod="yeni-blog-yazisi">
      <BlogYazisiEkrani veri={veri} />
    </PanelSayfasi>
  );
}
