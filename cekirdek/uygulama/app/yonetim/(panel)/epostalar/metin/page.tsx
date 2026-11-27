// Bir e-postanın metni (kart 0279, karar 0197). Önce sayfanın izni denetlenir, sonra birimin kodu adresin sorgusundan
// okunur; kod yoksa ya da kayıtta değilse bulunamadı. Başlık e-postanın adı, alt başlık ne zaman gittiğidir.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { metin } from "../../../../../../metinler/site-metni";
import { birimKoduMu } from "../../../../../../moduller/eposta/metin-birimleri";
import { EpostaMetniEkrani } from "../../../../../../yonetim-paneli/epostalar/metin-ekrani";
import { epostaMetniVerisi } from "../../../../../../yonetim-paneli/epostalar/veri";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("eposta-metni");

export default async function EpostaMetniSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kod?: string | string[] }>;
}) {
  await panelSayfasiniAc("eposta-metni");
  const { kod } = await searchParams;
  if (typeof kod !== "string" || !birimKoduMu(kod)) notFound();
  const { yetkili } = await panelOturumu();
  const veri = await epostaMetniVerisi(kod);
  return (
    <PanelSayfasi
      kod="eposta-metni"
      baslik={metin(`yonetim.epostalar.birim.${kod}.ad`)}
      altBaslik={metin(`yonetim.epostalar.birim.${kod}.aciklama`)}
    >
      {/* Başka e-postaya geçince form baştan kurulur. */}
      <EpostaMetniEkrani key={kod} veri={veri} izinli={yetkili("magaza-ayarlari.degistir")} />
    </PanelSayfasi>
  );
}
