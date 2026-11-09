import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { katalogKapisi } from "../../../../../katalog/kapi";
import { KatalogParcaSayfasi } from "../../../../../katalog/katalog-sayfasi";
import { katalogParcasi, katalogSecimi } from "../../../../../katalog/kayit";
import { metin } from "../../../../../metinler/site-metni";

type Ozellikler = {
  params: Promise<{ parca: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const generateMetadata = async ({ params }: Ozellikler): Promise<Metadata> => {
  katalogKapisi();
  const parca = katalogParcasi((await params).parca);
  return parca === undefined ? {} : { title: metin(parca.baslik) };
};

export default async function KatalogParcasi({ params, searchParams }: Ozellikler) {
  katalogKapisi();
  const parca = katalogParcasi((await params).parca);
  if (parca === undefined) notFound();
  return <KatalogParcaSayfasi parca={parca} secim={katalogSecimi(await searchParams)} />;
}
