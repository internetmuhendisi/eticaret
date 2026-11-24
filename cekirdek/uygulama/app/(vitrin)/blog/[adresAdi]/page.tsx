// Vitrinin blog yazısı sayfası (kart 0272, karar 0176; adres ve yönlendirme karar 0103).
import type { Metadata } from "next";
import { BlogYazisiSayfasi, blogYazisiBilgisi } from "../../../../../vitrin/blog/sayfa";
import type { AdresParametreleri, SorguParametreleri } from "../../../../../vitrin/kayit-sayfasi";

type Ozellikler = { params: AdresParametreleri; searchParams: SorguParametreleri };

export const generateMetadata = ({ params, searchParams }: Ozellikler): Promise<Metadata> =>
  blogYazisiBilgisi(params, searchParams);

export default function BlogYazisiAdresi({ params, searchParams }: Ozellikler) {
  return <BlogYazisiSayfasi parametreler={params} sorgu={searchParams} />;
}
