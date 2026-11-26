// Kuponu düzenleme (kart 0313, karar 0188). Önce sayfanın izni denetlenir, sonra kimlik adresin sorgusundan okunur;
// kimlik yoksa, kalıba uymuyorsa ya da kupon yoksa (silinmişse) bulunamadı. Başlık kuponun kodudur.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { kimlikMi } from "../../../../../../veritabani/kimlik";
import { KuponFormuEkrani } from "../../../../../../yonetim-paneli/kuponlar/kupon-formu";
import { kuponEkraniVerisi } from "../../../../../../yonetim-paneli/kuponlar/veri";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("kupon-duzenle");

export default async function KuponDuzenleSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kimlik?: string | string[] }>;
}) {
  await panelSayfasiniAc("kupon-duzenle");
  const { kimlik } = await searchParams;
  if (typeof kimlik !== "string" || !kimlikMi(kimlik)) notFound();
  const veri = await kuponEkraniVerisi(kimlik);
  if (veri === undefined) notFound();
  return (
    <PanelSayfasi kod="kupon-duzenle" baslik={veri.form.kod}>
      <KuponFormuEkrani veri={veri} />
    </PanelSayfasi>
  );
}
