// Bir sitenin yedeğini elle alır (kart 0024, karar 0037). Güncellemeden önceki yedek budur.
//
//   pnpm yedek-al <site klasörü> <ortam>

import { sunucudaCalistir } from "./sunucu-veritabani.mts";
import { yedekAlmaBetigi } from "./yedek.mts";
import { yedekSitesi } from "./yedek-girdi.mts";

try {
  const { ipv4, ortam, kodAdi } = yedekSitesi("yedek-al");
  process.stdout.write(sunucudaCalistir(ipv4, yedekAlmaBetigi(ortam, kodAdi, "elle"), 900_000));
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
