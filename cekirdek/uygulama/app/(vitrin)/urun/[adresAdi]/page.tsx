// Vitrinin ürün sayfası; galeri, seçenekler, fiyat ve stok kart 0138 (kart 0135: iskelet, adres ve yönlendirme; karar 0103).
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
  kayitSayfasininBilgisi("urun", params, searchParams);

export default async function UrunSayfasi({ params, searchParams }: Ozellikler) {
  return <KayitSayfasi tur="urun" kayit={await sayfaninKaydi("urun", params, searchParams)} />;
}
