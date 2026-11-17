// Havale bildirimi sayfası (kart 0214): /havale-bildirimi.
import type { Metadata } from "next";
import {
  HavaleBildirimiSayfasi,
  havaleBildirimiSayfaBilgisi,
} from "../../../../vitrin/siparis/havale-bildirimi-sayfasi";

export const generateMetadata = (): Promise<Metadata> => havaleBildirimiSayfaBilgisi();

export default async function HavaleBildirimiAdresi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { siparis } = await searchParams;
  return <HavaleBildirimiSayfasi siparis={typeof siparis === "string" ? siparis : undefined} />;
}
