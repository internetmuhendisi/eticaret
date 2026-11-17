// Tarayıcı testlerinin sahte ödeme kuruluşu (kart 0215): Playwright'ın sunucusu olarak ayrı süreçte açılır
// (playwright.config.ts). Anahtarlar ve port ortamdan gelir; uygulama aynı değerlerle kuruluşa bağlanır.
import { sahteKurulusAc } from "./sahte-kurulus.ts";

const anahtar = process.env["KARTLA_ODEME_ANAHTARI"] ?? "";
const gizli = process.env["KARTLA_ODEME_GIZLI_ANAHTARI"] ?? "";
const port = Number(
  new URL(process.env["KARTLA_ODEME_DENEME_ADRESI"] ?? "http://127.0.0.1:0").port,
);
await sahteKurulusAc({ anahtar, gizli, port });
