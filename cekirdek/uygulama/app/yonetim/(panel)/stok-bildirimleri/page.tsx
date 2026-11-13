// Stok bildirimleri ekranı (kart 0144, karar 0117): stoğa gelince haber ver eklentisinin bekleyen talepleri. Önce
// sayfanın izni ve eklentinin açıklığı denetlenir (yoksa bulunamadı), sonra liste servisle okunur.
import type { Metadata } from "next";
import { calisanSite } from "../../../../../ayar-semasi/calisan-site";
import { StokBildirimleriListesi } from "../../../../../eklentiler/stoga-gelince-haber-ver/panel";
import { stokBildirimiServisi } from "../../../../../eklentiler/stoga-gelince-haber-ver/servis";
import { siteninVeritabani } from "../../../../../veritabani/baglanti";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("stok-bildirimleri");

export default async function StokBildirimleriSayfasi() {
  await panelSayfasiniAc("stok-bildirimleri");
  const satirlar = await stokBildirimiServisi(calisanSite()).panelListesi(siteninVeritabani());
  return (
    <PanelSayfasi kod="stok-bildirimleri">
      <StokBildirimleriListesi satirlar={satirlar} />
    </PanelSayfasi>
  );
}
