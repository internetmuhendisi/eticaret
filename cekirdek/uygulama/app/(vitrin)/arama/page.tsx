// Vitrinin arama sayfası (kart 0137): /arama?ara=<metin>.
import type { Metadata } from "next";
import { AramaSayfasi, aramaSayfaBilgisi } from "../../../../vitrin/urun-listesi/arama-sayfasi";

type Ozellikler = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const generateMetadata = async ({ searchParams }: Ozellikler): Promise<Metadata> =>
  aramaSayfaBilgisi(await searchParams);

export default async function AramaAdresi({ searchParams }: Ozellikler) {
  return <AramaSayfasi parametreler={await searchParams} />;
}
