// Ürün ekranı (kart 0263). Önce sayfanın izni denetlenir, sonra kimlik adresin sorgusundan okunur; kimlik yoksa,
// kalıba uymuyorsa ya da ürün yoksa (silinmişse) bulunamadı.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { kimlikMi } from "../../../../../../veritabani/kimlik";
import { EylemBaglantisi } from "../../../../../../yonetim-paneli/eylem-dugmesi";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import { UrunEkrani } from "../../../../../../yonetim-paneli/urunler/urun-ekrani";
import { urunEkraniVerisi } from "../../../../../../yonetim-paneli/urunler/urun-verisi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("urun");

export default async function UrunSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kimlik?: string | string[] }>;
}) {
  await panelSayfasiniAc("urun");
  const { kimlik } = await searchParams;
  if (typeof kimlik !== "string" || !kimlikMi(kimlik)) notFound();
  const { yetkili } = await panelOturumu();
  const veri = await urunEkraniVerisi(kimlik, yetkili);
  if (veri === undefined) notFound();
  return (
    <PanelSayfasi
      kod="urun"
      baslik={veri.form.ad}
      {...(veri.baslikAlti.length === 0 ? {} : { altBaslik: veri.baslikAlti.join(" · ") })}
      eylemler={
        veri.vitrinAdresi === undefined ? undefined : (
          <EylemBaglantisi eylem="vitrinde-gor" href={veri.vitrinAdresi} target="_blank" />
        )
      }
    >
      <UrunEkrani veri={veri} />
    </PanelSayfasi>
  );
}
