// Vitrinin blog listesi (kart 0272, karar 0176): yayındaki yazılar en yeni önce, kategori ve sayfa adreste.
import type { Metadata } from "next";
import { BlogListesiSayfasi, blogListesiBilgisi } from "../../../../vitrin/blog/sayfa";
import type { SorguParametreleri } from "../../../../vitrin/kayit-sayfasi";

type Ozellikler = { searchParams: SorguParametreleri };

export const generateMetadata = ({ searchParams }: Ozellikler): Promise<Metadata> =>
  blogListesiBilgisi(searchParams);

export default function BlogSayfasi({ searchParams }: Ozellikler) {
  return <BlogListesiSayfasi sorgu={searchParams} />;
}
