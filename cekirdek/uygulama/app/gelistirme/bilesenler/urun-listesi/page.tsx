import type { Metadata } from "next";
import { katalogKapisi } from "../../../../../katalog/kapi";
import { KatalogUrunListesiSayfasi } from "../../../../../katalog/katalog-sayfasi";
import { katalogSecimi } from "../../../../../katalog/kayit";
import { metin } from "../../../../../metinler/site-metni";

// Filtreli ürün listesinin katalog sayfası (kart 0136). Kataloğun öteki sayfaları gibi iki kapısı vardır.
export const generateMetadata = (): Metadata => {
  katalogKapisi();
  return { title: metin("gelistirme.urunListesi.baslik") };
};

export default async function UrunListesiSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  katalogKapisi();
  return <KatalogUrunListesiSayfasi secim={katalogSecimi(await searchParams)} />;
}
