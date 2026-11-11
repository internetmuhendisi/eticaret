// Vitrinin etiket sayfası; ürün listesi kart 0136 (kart 0135: iskelet, adres ve yönlendirme; karar 0103).
import type { Metadata } from "next";
import {
  type AdresParametreleri,
  KayitSayfasi,
  kayitSayfasininBilgisi,
  type SorguParametreleri,
  sayfaninKaydi,
} from "../../../../../vitrin/kayit-sayfasi";

type Ozellikler = { params: AdresParametreleri; searchParams: SorguParametreleri };

export const generateMetadata = ({ params, searchParams }: Ozellikler): Promise<Metadata> =>
  kayitSayfasininBilgisi("etiket", params, searchParams);

export default async function EtiketSayfasi({ params, searchParams }: Ozellikler) {
  return <KayitSayfasi tur="etiket" kayit={await sayfaninKaydi("etiket", params, searchParams)} />;
}
