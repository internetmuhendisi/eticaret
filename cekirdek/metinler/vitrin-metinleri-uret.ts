// Vitrin metinlerinin üretimi (kart 0253): her dilin sözlüğünden yalnız vitrinMetinBolumleri. Komut
// (komutlar/vitrin-metinleri.mts) dosyayı yazar, test üretilenle dosyayı karşılaştırır.
import { sozlukler } from "./metin.ts";
import { vitrinMetinBolumleri, yalnizPaneldekiEklentiMetinleri } from "./vitrin-bolumleri.ts";

const panelde: readonly string[] = yalnizPaneldekiEklentiMetinleri;
const bolumu = (sozluk: Record<string, unknown>, bolum: string) =>
  bolum === "eklenti"
    ? Object.fromEntries(
        Object.entries(sozluk[bolum] as Record<string, unknown>).filter(
          ([ad]) => !panelde.includes(ad),
        ),
      )
    : sozluk[bolum];

export const vitrinMetinleriniUret = () =>
  Object.fromEntries(
    Object.entries(sozlukler).map(([dil, sozluk]) => [
      dil,
      Object.fromEntries(vitrinMetinBolumleri.map((bolum) => [bolum, bolumu(sozluk, bolum)])),
    ]),
  );
