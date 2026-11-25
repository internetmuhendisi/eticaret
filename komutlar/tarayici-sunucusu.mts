// Tarayıcı testlerinin sunucusu (kart 0251, karar 0184): çekirdeği canlıdaki gibi derler (next build) ve Next.js'in
// canlı sunucusuyla açar (next start). Geliştirme sunucusu yolları istendikçe derler ve kendi derlemesini arada
// yeniden yapabilir. Hatta ısınmış bir sayfanın isteği 11,2 saniye derleme bekledi ve test sınırını aştı (hat
// 45665957128). Canlı sunucu çalışırken hiçbir şey derlemez.
//
// Ortam canlı kutudaki gibidir, tek farkı deneme ortamıdır (SITE_ORTAMI=deneme). Bileşen kataloğu deneme ortamında
// açıktır (cekirdek/katalog/acik-mi.ts); deneme sitesindeki kutu da böyle açılır (komutlar/yayin.mts). Yalnız
// geliştirme sunucusunda çalışan testler ayrı aşamadadır (playwright.gelistirme.config.ts).
//
// Derlemenin çıktısı hata akışına (hattın günlüğüne) gider. Sunucunun çıktısı standart çıktıdadır, ayar onu sunucu
// günlüğüne yönlendirir (komutlar/sunucu-gunlugu.mts). Ortam (site klasörü, dosya klasörü, kartla ödeme) Playwright
// ayarından, bağlantı bilgisi kökteki .env'den gelir (cekirdek/uygulama/next.config.ts).
// Çalıştırma: node komutlar/tarayici-sunucusu.mts (kendi başına da çalışır, Ctrl+C ile kapanır)

import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { siteOrtamiDegiskeni } from "../cekirdek/kayitlar/site.ts";

const kok = join(import.meta.dirname, "..");
const { TARAYICI_SUNUCUSU_PORTU: port = "3000" } = process.env;

const derleme = spawnSync("pnpm", ["--filter", "cekirdek-uygulama", "derle"], {
  cwd: kok,
  stdio: ["ignore", process.stderr, process.stderr],
});
if (derleme.status !== 0) {
  console.error("Tarayıcı testleri: çekirdek derlenemedi.");
  process.exit(1);
}

const sunucu = spawn("pnpm", ["--filter", "cekirdek-uygulama", "baslat", "--port", port], {
  cwd: kok,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", [siteOrtamiDegiskeni]: "deneme" },
});

for (const sinyal of ["SIGINT", "SIGTERM"] as const) process.on(sinyal, () => sunucu.kill(sinyal));
sunucu.on("exit", (kod) => process.exit(kod ?? 0));
