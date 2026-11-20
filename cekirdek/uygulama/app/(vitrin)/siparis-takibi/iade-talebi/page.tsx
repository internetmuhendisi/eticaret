// Üye olmayanın iade talebi (kart 0239): /siparis-takibi/iade-talebi; sipariş takip çerezinden gelir.
import type { Metadata } from "next";
import {
  TakipIadeTalebiSayfasi,
  takipIadeTalebiSayfaBilgisi,
} from "../../../../../vitrin/siparis/iade-talebi-sayfasi";

export const generateMetadata = (): Promise<Metadata> => takipIadeTalebiSayfaBilgisi();

export default async function TakipIadeTalebiAdresi() {
  return <TakipIadeTalebiSayfasi />;
}
