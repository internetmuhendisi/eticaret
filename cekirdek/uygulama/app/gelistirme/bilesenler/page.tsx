import type { Metadata } from "next";
import { katalogKapisi } from "../../../../katalog/kapi";
import { KatalogAnaSayfasi } from "../../../../katalog/katalog-sayfasi";
import { katalogSecimi } from "../../../../katalog/kayit";
import { metin } from "../../../../metinler/site-metni";

export const generateMetadata = (): Metadata => {
  katalogKapisi();
  return { title: metin("gelistirme.katalog.baslik") };
};

export default async function BilesenKatalogu({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  katalogKapisi();
  return <KatalogAnaSayfasi secim={katalogSecimi(await searchParams)} />;
}
