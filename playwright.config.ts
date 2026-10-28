// Tarayıcı testleri (karar 0018, .claude/rules/test.md).
// Yalnız uctan-uca/ klasörlerindeki *.test.ts ve *.test.tsx dosyaları çalışır.
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Testler başka bir site verilmezse demo site Örnek Mağaza'yla çalışır (karar 0007, 0021).
// Değişken hem uygulamaya hem testlere geçer.
const { SITE_KLASORU = join(import.meta.dirname, "siteler", "ornek-magaza") } = process.env;
Object.assign(process.env, { SITE_KLASORU });

export default defineConfig({
  testDir: ".",
  testMatch: ["**/uctan-uca/**/*.test.ts", "**/uctan-uca/**/*.test.tsx"],
  // Kalıplar tam yola göre eşleşir. Çalışma kopyaları (.claude/worktrees/) bu klasörün
  // içinde durduğu için yalnız bu kopyanın kendi .claude klasörü dışarıda bırakılır.
  testIgnore: ["**/node_modules/**", `${import.meta.dirname}/.claude/**`],
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
