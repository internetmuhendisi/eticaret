// Birim ve entegrasyon testleri (karar 0018, .claude/rules/test.md).
// Tarayıcı testleri (uctan-uca/) Playwright'ındır, burada çalışmaz.
import { existsSync } from "node:fs";
import { configDefaults, defineConfig } from "vitest/config";

// Veritabanı testleri bağlantı bilgisini kökteki .env dosyasından alır (karar 0022).
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  // tsconfig JSX'i Next.js'e bırakır (preserve); bileşen testlerinde JSX'i Vite çevirir.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [...configDefaults.exclude, "**/uctan-uca/**", ".claude/**"],
    passWithNoTests: false,
  },
});
