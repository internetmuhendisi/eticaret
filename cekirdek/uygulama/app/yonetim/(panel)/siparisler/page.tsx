// Siparişler ekranı (kart 0234). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra liste okunur. Durum
// sekmesi, "İade talepleri" süzgeci ve sayfa adresin sorgusundadır; tanınmayan durum yok sayılır, sayfa sınırlara
// çekilir.
import type { Metadata } from "next";
import { type SiparisDurumu, siparisDurumlari } from "../../../../../kayitlar/siparis";
import { panelAdresi } from "../../../../../yonetim-paneli/adresler";
import { EylemBaglantisi } from "../../../../../yonetim-paneli/eylem-dugmesi";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
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
  searchParams: Promise<{
    durum?: string | string[];
    sayfa?: string | string[];
    talep?: string | string[];
  }>;
}) {
  await panelSayfasiniAc("siparisler");
  const sorgu = await searchParams;
  const durum = siparisDurumlari.find((kod) => kod === sorgu.durum) as SiparisDurumu | undefined;
  const sayfa =
    typeof sorgu.sayfa === "string" && /^\d{1,5}$/.test(sorgu.sayfa)
      ? Math.max(1, Number(sorgu.sayfa))
      : 1;
  // "İade talepleri" sekmesi (kart 0239): yalnız bekleyen iade talebi olanlar.
  const talep = sorgu.talep === "evet";
  const veri = await siparisListesiVerisi({ durum, talep, sayfa });
  const { yetkili } = await panelOturumu();
  return (
    <PanelSayfasi
      kod="siparisler"
      eylemler={
        // Elle sipariş (kart 0236): yalnız izni olana; sayfanın asıl eylemi.
        yetkili("siparis.yonet") ? (
          <EylemBaglantisi eylem="elle-siparis" asil href={`${panelAdresi}/siparisler/elle`} />
        ) : null
      }
    >
      <SiparisListesi veri={veri} />
    </PanelSayfasi>
  );
}
