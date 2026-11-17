// Sipariş alındı sayfası (kart 0214): /siparis-alindi. Sipariş yalnız erişim çereziyle okunur.
import type { Metadata } from "next";
import {
  SiparisAlindiSayfasi,
  siparisAlindiSayfaBilgisi,
} from "../../../../vitrin/siparis/alindi-sayfasi";

export const generateMetadata = (): Promise<Metadata> => siparisAlindiSayfaBilgisi();

export default function SiparisAlindiAdresi() {
  return <SiparisAlindiSayfasi />;
}
