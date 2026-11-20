// Vitrinin tarayıcı koduna giden metin dosyasını tr.json'dan üretir (kart 0253, karar 0152): her dil için yalnız
// vitrinMetinBolumleri. Metinler yine yalnız tr.json'da yazılır; bu dosya elle değiştirilmez. tr.json değişince
// çalıştırılır; testi (cekirdek/metinler/testler/vitrin-metinleri.test.ts) eski kalan dosyayı yakalar.
// Çalıştırma: pnpm vitrin-metinleri
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { vitrinMetinleriniUret } from "../cekirdek/metinler/vitrin-metinleri-uret.ts";

const yol = join(import.meta.dirname, "..", "cekirdek", "metinler", "vitrin-metinleri.json");
writeFileSync(yol, `${JSON.stringify(vitrinMetinleriniUret(), null, 2)}\n`);
console.log(`yazıldı     ${yol}`);
