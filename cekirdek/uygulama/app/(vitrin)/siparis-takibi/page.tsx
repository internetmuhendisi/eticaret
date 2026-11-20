// Üye olmayanın sipariş takibi (kart 0238): /siparis-takibi.
import type { Metadata } from "next";
import {
  SiparisTakibiSayfasi,
  siparisTakibiSayfaBilgisi,
} from "../../../../vitrin/siparis/takip-sayfasi";

export const generateMetadata = (): Promise<Metadata> => siparisTakibiSayfaBilgisi();

export default async function SiparisTakibiAdresi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { siparis, yeni } = await searchParams;
  return (
    <SiparisTakibiSayfasi
      siparis={typeof siparis === "string" ? siparis : undefined}
      yeni={yeni !== undefined}
    />
  );
}
