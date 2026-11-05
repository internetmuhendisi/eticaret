// Çekirdeğin Docker görüntüsünü üretir ve denetler (kart 0015, karar 0027).
// Etiket çekirdeğin sürümüdür (cekirdek/surum.ts), Node.js sürümü kökteki package.json'dan gelir.
// Görüntü denetimden geçmezse komut kırmızı biter.
// Çalıştırma: pnpm cekirdek-goruntusu

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cekirdekSurumu } from "../cekirdek/surum.ts";
import { goruntuEtiketi, goruntuyuDenetle, kayitEtiketi } from "./cekirdek-goruntusu-denetle.mts";

const kok = join(import.meta.dirname, "..");
const paket = JSON.parse(readFileSync(join(kok, "package.json"), "utf8")) as {
  engines: { node: string };
  packageManager: string;
};
const pnpmSurumu = paket.packageManager.replace(/^pnpm@/, "");

// Görüntüye hangi kayıttan üretildiği yazılır (kart 0021). Kaydedilmemiş değişiklik varsa kayıt
// "-kirli" ekini taşır; yayın komutu böyle bir görüntüyü yayınlamaz.
const git = (argumanlar: string[]) =>
  spawnSync("git", argumanlar, { cwd: kok, encoding: "utf8" }).stdout?.trim() ?? "";
const kayit = `${git(["rev-parse", "HEAD"]) || "bilinmiyor"}${git(["status", "--porcelain"]) ? "-kirli" : ""}`;

console.log(`Üretiliyor  ${goruntuEtiketi} (Node.js ${paket.engines.node}, pnpm ${pnpmSurumu})`);
const uretim = spawnSync(
  "docker",
  [
    "build",
    ...["-f", join(kok, "sunucu", "cekirdek", "Dockerfile")],
    ...["--build-arg", `NODE_SURUMU=${paket.engines.node}`],
    ...["--build-arg", `PNPM_SURUMU=${pnpmSurumu}`],
    ...["--build-arg", `CEKIRDEK_SURUMU=${cekirdekSurumu}`],
    ...["--label", `${kayitEtiketi}=${kayit}`],
    ...["-t", goruntuEtiketi],
    kok,
  ],
  { stdio: "inherit" },
);
if (uretim.status !== 0) {
  console.error("Görüntü üretilemedi.");
  process.exit(1);
}

const sorunlar = goruntuyuDenetle(goruntuEtiketi);
if (sorunlar.length > 0) {
  console.error(`Görüntü denetimden geçmedi: ${goruntuEtiketi}`);
  for (const sorun of sorunlar) console.error(`  ${sorun}`);
  process.exit(1);
}
console.log(`Hazır       ${goruntuEtiketi} (kayıt ${kayit.slice(0, 12)})`);
