import type { Metadata } from "next";
import { katalogKapisi } from "../../../../../katalog/kapi";
import { KatalogUrunKartiSayfasi } from "../../../../../katalog/katalog-sayfasi";
import { katalogSecimi } from "../../../../../katalog/kayit";
import { metin } from "../../../../../metinler/site-metni";

// Ürün kartının katalog sayfası (kart 0109). Kataloğun öteki sayfaları gibi iki kapısı vardır.
export const generateMetadata = (): Metadata => {
  katalogKapisi();
  return { title: metin("gelistirme.urunKarti.baslik") };
};

export default async function UrunKartiSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  katalogKapisi();
  return <KatalogUrunKartiSayfasi secim={katalogSecimi(await searchParams)} />;
}
