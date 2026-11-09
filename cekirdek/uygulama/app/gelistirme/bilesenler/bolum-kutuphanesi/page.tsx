import type { Metadata } from "next";
import { katalogKapisi } from "../../../../../katalog/kapi";
import { KatalogBolumKutuphanesiSayfasi } from "../../../../../katalog/katalog-sayfasi";
import { katalogSecimi } from "../../../../../katalog/kayit";
import { metin } from "../../../../../metinler/site-metni";

// Bölüm kütüphanesinin katalog sayfası (kart 0106). Kataloğun öteki sayfaları gibi iki kapısı vardır.
export const generateMetadata = (): Metadata => {
  katalogKapisi();
  return { title: metin("gelistirme.bolum.baslik") };
};

export default async function BolumKutuphanesi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  katalogKapisi();
  return <KatalogBolumKutuphanesiSayfasi secim={katalogSecimi(await searchParams)} />;
}
