// Birim ve entegrasyon testleri (karar 0018, .claude/rules/test.md).
// Tarayıcı testleri (uctan-uca/) Playwright'ındır, burada çalışmaz.
import { existsSync } from "node:fs";
import { configDefaults, defineConfig } from "vitest/config";

// Veritabanı testleri bağlantı bilgisini kökteki .env dosyasından alır (karar 0022).
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [...configDefaults.exclude, "**/uctan-uca/**", ".claude/**"],
    passWithNoTests: false,
  },
});
