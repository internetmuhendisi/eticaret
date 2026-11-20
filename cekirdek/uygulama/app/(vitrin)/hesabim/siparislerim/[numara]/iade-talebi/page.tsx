// Hesabım: siparişin iade talebi (kart 0239): /hesabim/siparislerim/<numara>/iade-talebi.
import type { Metadata } from "next";
import {
  HesapIadeTalebiSayfasi,
  hesapIadeTalebiSayfaBilgisi,
} from "../../../../../../../vitrin/siparis/iade-talebi-sayfasi";

type Ozellikler = { params: Promise<{ numara: string }> };

// Adresteki numara kodlanmış gelir; büyük harfe çevrilir. Çözülemeyen yazılış hiçbir numaraya uymaz.
const numarayiOku = async ({ params }: Ozellikler): Promise<string> => {
  try {
    return decodeURIComponent((await params).numara).toUpperCase();
  } catch {
    return "";
  }
};

export const generateMetadata = async (ozellikler: Ozellikler): Promise<Metadata> =>
  hesapIadeTalebiSayfaBilgisi(await numarayiOku(ozellikler));

export default async function HesapIadeTalebiAdresi(ozellikler: Ozellikler) {
  return <HesapIadeTalebiSayfasi numara={await numarayiOku(ozellikler)} />;
}
