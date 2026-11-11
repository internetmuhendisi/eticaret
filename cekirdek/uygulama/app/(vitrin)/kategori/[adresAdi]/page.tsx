// Vitrinin kategori sayfası; ürün listesi, filtre ve sıralama kart 0136 (kart 0135: iskelet, adres ve yönlendirme; karar 0103).
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
  kayitSayfasininBilgisi("kategori", params, searchParams);

export default async function KategoriSayfasi({ params, searchParams }: Ozellikler) {
  return (
    <KayitSayfasi tur="kategori" kayit={await sayfaninKaydi("kategori", params, searchParams)} />
  );
}
