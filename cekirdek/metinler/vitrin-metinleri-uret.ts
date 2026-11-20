// Vitrin metinlerinin üretimi (kart 0253): her dilin sözlüğünden yalnız vitrinMetinBolumleri. Komut
// (komutlar/vitrin-metinleri.mts) dosyayı yazar, test üretilenle dosyayı karşılaştırır.
import { sozlukler } from "./metin.ts";
import { vitrinMetinBolumleri } from "./vitrin-bolumleri.ts";

export const vitrinMetinleriniUret = () =>
  Object.fromEntries(
    Object.entries(sozlukler).map(([dil, sozluk]) => [
      dil,
      Object.fromEntries(vitrinMetinBolumleri.map((bolum) => [bolum, sozluk[bolum]])),
    ]),
  );
