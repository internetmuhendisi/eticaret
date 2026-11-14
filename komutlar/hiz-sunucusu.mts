// Hız ölçümünün sunucusu (kart 0146): çekirdeği canlıdaki gibi derler (next build) ve Next.js'in canlı sunucusuyla
// açar (next start). Geliştirme sunucusu hızı ölçmeye uygun değildir: kodu sıkıştırmaz, her isteği yeniden derler.
// Kutu aynı derlemeyi standalone klasöründen çalıştırır (sunucu/cekirdek/Dockerfile); tarayıcıya giden kod ve sayfalar
// aynıdır. Standalone klasörü çalışma kopyasında (pnpm bağlantılarıyla) eksik toplanıyor, sunucu modülü
// yüklenemiyordu (ölçüldü): next start uyarı verir ama aynı derlemeyi sunar.
// Hız ölçümünün Playwright ayarı (playwright.hiz.config.ts) bunu sunucu olarak başlatır. Ortam (site klasörü,
// dosya klasörü, veritabanı adresi) ayardan ve kökteki .env'den gelir; port HIZ_PORTU'dur (varsayılan 3410).
// Çalıştırma: node komutlar/hiz-sunucusu.mts (kendi başına da çalışır, Ctrl+C ile kapanır)

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const kok = join(import.meta.dirname, "..");
if (existsSync(join(kok, ".env"))) process.loadEnvFile(join(kok, ".env"));

const derleme = spawnSync("pnpm", ["--filter", "cekirdek-uygulama", "derle"], {
  cwd: kok,
  stdio: "inherit",
});
if (derleme.status !== 0) {
  console.error("Hız ölçümü: çekirdek derlenemedi.");
  process.exit(1);
}

const { HIZ_PORTU: port = "3410" } = process.env;
const sunucu = spawn(
  "pnpm",
  ["--filter", "cekirdek-uygulama", "baslat", "--port", port, "--hostname", "127.0.0.1"],
  { cwd: kok, stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } },
);
for (const sinyal of ["SIGINT", "SIGTERM"] as const) {
  process.on(sinyal, () => sunucu.kill(sinyal));
}
sunucu.on("exit", (kod) => process.exit(kod ?? 0));
