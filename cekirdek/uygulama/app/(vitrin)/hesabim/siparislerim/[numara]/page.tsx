// Hesabım: sipariş ayrıntısı (kart 0238): /hesabim/siparislerim/<numara>.
import type { Metadata } from "next";
import {
  SiparisAyrintisiSayfasi,
  siparisAyrintisiSayfaBilgisi,
} from "../../../../../../vitrin/hesap/siparisler";

type Ozellikler = { params: Promise<{ numara: string }> };

// Adresteki numara kodlanmış gelir; büyük harfe çevrilir (numara büyük harfle saklanır). Çözülemeyen yazılış hiçbir
// numaraya uymaz: sayfa bulunamadıdır.
const numarayiOku = async ({ params }: Ozellikler): Promise<string> => {
  try {
    return decodeURIComponent((await params).numara).toUpperCase();
  } catch {
    return "";
  }
};

export const generateMetadata = async (ozellikler: Ozellikler): Promise<Metadata> =>
  siparisAyrintisiSayfaBilgisi(await numarayiOku(ozellikler));

export default async function SiparisAyrintisiAdresi(ozellikler: Ozellikler) {
  return <SiparisAyrintisiSayfasi numara={await numarayiOku(ozellikler)} />;
}
