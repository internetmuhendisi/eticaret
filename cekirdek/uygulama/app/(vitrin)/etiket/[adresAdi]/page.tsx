// Vitrinin etiket sayfası: filtreli ürün listesi (kart 0136; iskelet, adres ve yönlendirme kart 0135, karar 0103).
import type { Metadata } from "next";
import type { AdresParametreleri, SorguParametreleri } from "../../../../../vitrin/kayit-sayfasi";
import {
  KayitListesiSayfasi,
  kayitListesiBilgisi,
} from "../../../../../vitrin/urun-listesi/kayit-listesi";

type Ozellikler = { params: AdresParametreleri; searchParams: SorguParametreleri };

export const generateMetadata = ({ params, searchParams }: Ozellikler): Promise<Metadata> =>
  kayitListesiBilgisi("etiket", params, searchParams);

export default function EtiketSayfasi({ params, searchParams }: Ozellikler) {
  return <KayitListesiSayfasi tur="etiket" parametreler={params} sorgu={searchParams} />;
}
