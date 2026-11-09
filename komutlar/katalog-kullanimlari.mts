// Bileşen kataloğunun "kullanıldığı yerler" listesini yazar (kart 0104, karar 0078). Sayfa listeyi
// cekirdek/katalog/kullanimlar.json dosyasından okur: canlı görüntüde kaynak kod yoktur, sayfa kendisi
// hesaplayamaz. Listenin kodla aynı olduğunu bir test denetler (cekirdek/katalog/testler/kullanimlar.test.ts);
// bir parçayı kullanan dosya eklenince ya da kalkınca bu komut çalıştırılır.
// Çalıştırma: pnpm katalog-kullanimlari
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { kullanimlariBul } from "../cekirdek/katalog/tarama.ts";

const kok = join(import.meta.dirname, "..");
const dosya = join(kok, "cekirdek", "katalog", "kullanimlar.json");
writeFileSync(dosya, `${JSON.stringify(kullanimlariBul(kok), null, 2)}\n`);
// Dosya Biome'un biçimiyle kaydedilir, yoksa denetim kırmızıya düşer.
const bicim = spawnSync("pnpm", ["exec", "biome", "format", "--write", dosya], {
  stdio: "inherit",
});
process.exitCode = bicim.status ?? 1;
