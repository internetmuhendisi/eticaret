// Birim ve entegrasyon testleri (karar 0018, .claude/rules/test.md).
// Tarayıcı testleri (uctan-uca/) Playwright'ındır, burada çalışmaz.
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [...configDefaults.exclude, "**/uctan-uca/**", ".claude/**"],
    passWithNoTests: false,
  },
});
