// Siparişler ekranı (kart 0234). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra liste okunur. Durum
// sekmesi ve sayfa adresin sorgusundadır; tanınmayan durum yok sayılır, sayfa sınırlara çekilir.
import type { Metadata } from "next";
import { type SiparisDurumu, siparisDurumlari } from "../../../../../kayitlar/siparis";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import { SiparisListesi } from "../../../../../yonetim-paneli/siparisler/liste";
import { siparisListesiVerisi } from "../../../../../yonetim-paneli/siparisler/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("siparisler");

export default async function SiparislerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string | string[]; sayfa?: string | string[] }>;
}) {
  await panelSayfasiniAc("siparisler");
  const sorgu = await searchParams;
  const durum = siparisDurumlari.find((kod) => kod === sorgu.durum) as SiparisDurumu | undefined;
  const sayfa =
    typeof sorgu.sayfa === "string" && /^\d{1,5}$/.test(sorgu.sayfa)
      ? Math.max(1, Number(sorgu.sayfa))
      : 1;
  const veri = await siparisListesiVerisi({ durum, sayfa });
  return (
    <PanelSayfasi kod="siparisler">
      <SiparisListesi veri={veri} />
    </PanelSayfasi>
  );
}
