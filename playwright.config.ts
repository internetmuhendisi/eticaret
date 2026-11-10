// Tarayıcı testleri (karar 0018, .claude/rules/test.md).
// Yalnız uctan-uca/ klasörlerindeki *.test.ts ve *.test.tsx dosyaları çalışır.
import { mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { dosyaKlasoruDegiskeni } from "./cekirdek/kayitlar/dosya";

// Testler başka bir site verilmezse demo site Örnek Mağaza'yla çalışır (karar 0007, 0021).
// Değişken hem uygulamaya hem testlere geçer.
const { SITE_KLASORU = join(import.meta.dirname, "siteler", "ornek-magaza") } = process.env;
// Sitenin dosya klasörü (karar 0058): hazırlığın kurduğu görseller buraya yazılır, uygulama buradan okur. Veritabanı
// gibi çalışmalar arasında kalır; kayıt dışıdır (sunucu/olusan/, karar 0028).
const {
  [dosyaKlasoruDegiskeni]: DOSYA_KLASORU = join(
    import.meta.dirname,
    "sunucu",
    "olusan",
    "dosyalar",
    basename(SITE_KLASORU),
  ),
} = process.env;
mkdirSync(DOSYA_KLASORU, { recursive: true, mode: 0o700 });
Object.assign(process.env, { SITE_KLASORU, [dosyaKlasoruDegiskeni]: DOSYA_KLASORU });

export default defineConfig({
  testDir: ".",
  testMatch: ["**/uctan-uca/**/*.test.ts", "**/uctan-uca/**/*.test.tsx"],
  // Kalıplar tam yola göre eşleşir. Çalışma kopyaları (.claude/worktrees/) bu klasörün
  // içinde durduğu için yalnız bu kopyanın kendi .claude klasörü dışarıda bırakılır.
  testIgnore: ["**/node_modules/**", `${import.meta.dirname}/.claude/**`],
  // Sitenin başlangıç kataloğu, menüleri ve düzeni testlerden önce kurulur (kart 0129).
  globalSetup: "./cekirdek/testler/uctan-uca/hazirlik.ts",
  // Bir testin süre sınırı (kart 0129). Playwright'ın 30 saniyesi kontrol hattında yetmiyor: hattın makinesi
  // bilgisayarın yüksüz hâlinin yaklaşık iki katı sürer (bütün takım 14,4 ve 3,8 dakika). Ölçüldü: iki renkte ve üç
  // genişlikte tarayan bölüm kütüphanesi testi bilgisayarda yüksüz 15, yük ortalaması 23'te 31 saniye sürdü, hatta
  // 30 saniyede sınıra takıldı; hattaki öteki en uzun testler 16–20 saniye. Beklentilerin kendi sınırı (5 saniye)
  // değişmez.
  timeout: 60_000,
  forbidOnly: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3000" },
  // Çekirdek uygulamasını testten önce açar; açıksa olanı kullanır.
  webServer: {
    command: "pnpm cekirdek",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
