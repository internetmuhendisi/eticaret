// Vitrinin ürün sayfası (kart 0138, karar 0108; iskelet, adres ve yönlendirme kart 0135, karar 0103).
import type { Metadata } from "next";
import type { AdresParametreleri, SorguParametreleri } from "../../../../../vitrin/kayit-sayfasi";
import { UrunSayfasi, urunSayfasininBilgisi } from "../../../../../vitrin/urun-sayfasi/sayfa";

type Ozellikler = { params: AdresParametreleri; searchParams: SorguParametreleri };

export const generateMetadata = ({ params, searchParams }: Ozellikler): Promise<Metadata> =>
  urunSayfasininBilgisi(params, searchParams);

export default function UrunSayfasiAdresi({ params, searchParams }: Ozellikler) {
  return <UrunSayfasi parametreler={params} sorgu={searchParams} />;
}
