// Sıralanabilir listenin metinleri (kart 0141): parça metni kullanandan alır, bütün listeler aynı cümleleri
// kullanır. Ekran okuyucu metinleri ortak.parca.siralama altındadır.
import type { SiralamaMetinleri } from "../../bilesenler/parcalar/siralanabilir-liste";
import { doldur } from "./doldur";
import type { MetinAnahtari } from "./metin";

// Izgarada (kart 0266) önceki ve sonraki yer "öne al" ve "arkaya al"dır.
export const siralamaMetinleri = (
  metin: (anahtar: MetinAnahtari) => string,
  { duzen = "liste" }: { duzen?: "liste" | "izgara" } = {},
): SiralamaMetinleri => {
  const sirali =
    (anahtar: MetinAnahtari) =>
    (ad: string, sira: number, toplam: number): string =>
      doldur(metin(anahtar), { ad, sira: String(sira), toplam: String(toplam) });
  return {
    tasi: (ad) => doldur(metin("ortak.parca.siralama.tasi"), { ad }),
    yukari: (ad) =>
      doldur(
        metin(duzen === "izgara" ? "ortak.parca.siralama.one" : "ortak.parca.siralama.yukari"),
        {
          ad,
        },
      ),
    asagi: (ad) =>
      doldur(
        metin(duzen === "izgara" ? "ortak.parca.siralama.arkaya" : "ortak.parca.siralama.asagi"),
        { ad },
      ),
    talimat: metin("ortak.parca.siralama.talimat"),
    alindi: sirali("ortak.parca.siralama.alindi"),
    tasindi: sirali("ortak.parca.siralama.tasindi"),
    birakildi: sirali("ortak.parca.siralama.birakildi"),
    vazgecildi: sirali("ortak.parca.siralama.vazgecildi"),
  };
};
