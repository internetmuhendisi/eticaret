// Sabit sayfanın ekranı (kart 0273). Önce sayfanın izni denetlenir, sonra kimlik adresin sorgusundan okunur; kimlik
// yoksa, kalıba uymuyorsa ya da sayfa yoksa (silinmişse) bulunamadı. Yayındaki sayfada "Vitrinde gör".
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { kimlikMi } from "../../../../../../veritabani/kimlik";
import { kayitAdresleri } from "../../../../../../vitrin/adresler";
import { EylemBaglantisi } from "../../../../../../yonetim-paneli/eylem-dugmesi";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import { SayfaEkrani } from "../../../../../../yonetim-paneli/sayfalar/ekran";
import { sayfaEkraniVerisi } from "../../../../../../yonetim-paneli/sayfalar/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("sabit-sayfa");

export default async function SabitSayfaEkraniSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kimlik?: string | string[] }>;
}) {
  await panelSayfasiniAc("sabit-sayfa");
  const { kimlik } = await searchParams;
  if (typeof kimlik !== "string" || !kimlikMi(kimlik)) notFound();
  const { yetkili } = await panelOturumu();
  const veri = await sayfaEkraniVerisi(kimlik, yetkili);
  if (veri === undefined) notFound();
  return (
    <PanelSayfasi
      kod="sabit-sayfa"
      baslik={veri.form.baslik}
      eylemler={
        // Taslak sayfanın vitrindeki adresi bulunamadı verir: bağlantı yalnız yayındaki sayfada.
        veri.form.durum === "yayinda" ? (
          <EylemBaglantisi
            eylem="vitrinde-gor"
            href={kayitAdresleri.sayfa(veri.form.adresAdi)}
            target="_blank"
          />
        ) : undefined
      }
    >
      <SayfaEkrani veri={veri} />
    </PanelSayfasi>
  );
}
