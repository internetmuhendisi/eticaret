// Vitrinin sabit sayfası (kart 0273; adres karar 0157, yönlendirme karar 0103).
import type { Metadata } from "next";
import type { AdresParametreleri, SorguParametreleri } from "../../../../../vitrin/kayit-sayfasi";
import { SabitSayfa, sabitSayfaBilgisi } from "../../../../../vitrin/sayfa/sayfa";

type Ozellikler = { params: AdresParametreleri; searchParams: SorguParametreleri };

export const generateMetadata = ({ params, searchParams }: Ozellikler): Promise<Metadata> =>
  sabitSayfaBilgisi(params, searchParams);

export default function SabitSayfaAdresi({ params, searchParams }: Ozellikler) {
  return <SabitSayfa parametreler={params} sorgu={searchParams} />;
}
