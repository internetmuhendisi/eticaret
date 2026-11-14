// Hız ölçümü (kart 0146, karar 0124, .claude/rules/performans.md). Tarayıcı testlerinden ayrıdır: çekirdeği canlıdaki
// gibi derleyip şifreli HTTP/2 vekilin arkasında açar (komutlar/hiz-sunucusu.mts) ve vitrin sayfalarını yavaş
// telefon koşuluyla ölçer. Yalnız hiz/ klasörlerindeki *.test.ts dosyaları çalışır.
// Çalıştırma: pnpm hiz-olcumu
import { mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { defineConfig } from "@playwright/test";
import { dosyaKlasoruDegiskeni } from "./cekirdek/kayitlar/dosya";

// Site ve dosya klasörü tarayıcı testleriyle aynı kuralla seçilir (playwright.config.ts).
const { SITE_KLASORU = join(import.meta.dirname, "siteler", "ornek-magaza") } = process.env;
const {
  [dosyaKlasoruDegiskeni]: DOSYA_KLASORU = join(
    import.meta.dirname,
    "sunucu",
    "olusan",
    "dosyalar",
    basename(SITE_KLASORU),
  ),
  HIZ_PORTU = "3410",
} = process.env;
mkdirSync(DOSYA_KLASORU, { recursive: true, mode: 0o700 });
Object.assign(process.env, { SITE_KLASORU, [dosyaKlasoruDegiskeni]: DOSYA_KLASORU, HIZ_PORTU });

export default defineConfig({
  testDir: ".",
  testMatch: ["**/hiz/**/*.test.ts"],
  testIgnore: ["**/node_modules/**", `${import.meta.dirname}/.claude/**`],
  // Katalog, menüler ve düzen tarayıcı testlerinin hazırlığıyla kurulur (kart 0129).
  globalSetup: "./cekirdek/testler/uctan-uca/hazirlik.ts",
  // Ölçümler sırayla yapılır: aynı anda açılan sayfalar birbirinin işlemcisini ve ağını paylaşırdı.
  workers: 1,
  fullyParallel: false,
  timeout: 300_000,
  forbidOnly: true,
  reporter: "list",
  use: { baseURL: `https://127.0.0.1:${HIZ_PORTU}`, ignoreHTTPSErrors: true },
  webServer: {
    command: "node komutlar/hiz-sunucusu.mts",
    url: `https://127.0.0.1:${HIZ_PORTU}`,
    ignoreHTTPSErrors: true,
    // Derleme hattın makinesinde birkaç dakika sürer.
    timeout: 600_000,
    reuseExistingServer: false,
    // Sunucu SIGTERM ile kapanır: vekil kapanır, sertifika klasörü silinir. Kapanış belirtilmezse Playwright süreç
    // grubunu öldürür ve klasör geçici dizinde kalırdı (bağımsız kontrolün bulgusu).
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    stdout: "pipe",
  },
});
