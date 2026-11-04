// Yerelde tam ortamı açar (kart 0016, karar 0028): veritabanı, Caddy ve her sitenin kutusu.
// Çalıştırma: pnpm yerel-ortam-ac [siteler/<kod-adi> ...] [--goruntuyu-yenile]
//   Klasör verilmezse siteler/ altındaki bütün siteler ve açık deneme siteleri açılır.
//   --goruntuyu-yenile: çekirdeğin görüntüsünü şu anki kodla yeniden üretir.

import { ortamiAc, siteAdresi, varsayilanKlasorler } from "./yerel-ortam.mts";

const argumanlar = process.argv.slice(2);
const goruntuyuYenile = argumanlar.includes("--goruntuyu-yenile");
const verilenler = argumanlar.filter((arguman) => !arguman.startsWith("--"));

try {
  const siteler = await ortamiAc(verilenler.length > 0 ? verilenler : varsayilanKlasorler(), {
    goruntuyuYenile,
  });
  console.log("\nOrtam açık:");
  for (const { kimlik } of siteler) {
    console.log(`  ${kimlik.gorunenAd.padEnd(24)} ${siteAdresi(kimlik.kodAdi)}`);
  }
  console.log("Kapatmak: pnpm yerel-ortam-kapat");
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
