// Site klasörlerini kimlik ve ayar şemasından geçirir (kart 0010).
// Bir hata varsa hepsini yazar ve kırmızı biter.
// Çalıştırma: pnpm site-dogrula siteler/<kod-adi>
//             pnpm site-dogrula            (siteler/ altındaki bütün siteler)

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";

z.config(z.locales.tr());

const verilenler = process.argv.slice(2);
const klasorler =
  verilenler.length > 0
    ? verilenler
    : readdirSync("siteler", { withFileTypes: true })
        .filter((girdi) => girdi.isDirectory())
        .map((girdi) => join("siteler", girdi.name));

if (klasorler.length === 0) {
  console.error("Doğrulanacak site klasörü bulunamadı.");
  process.exit(1);
}

let hataVar = false;
for (const klasor of klasorler) {
  const sonuc = siteKlasorunuDogrula(klasor);
  if (sonuc.gecerli) {
    console.log(`geçti       ${klasor}`);
  } else {
    hataVar = true;
    console.error(`GEÇMEDİ     ${klasor}`);
    for (const hata of sonuc.hatalar) console.error(`  ${hata}`);
  }
}

if (hataVar) process.exit(1);
