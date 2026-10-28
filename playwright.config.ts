// Tarayıcı testleri (karar 0018, .claude/rules/test.md).
// Yalnız uctan-uca/ klasörlerindeki *.test.ts ve *.test.tsx dosyaları çalışır.
import { defineConfig, devices } from "@playwright/test";

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
