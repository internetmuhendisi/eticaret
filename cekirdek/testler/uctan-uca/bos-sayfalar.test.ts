// Vitrinin ve yönetim panelinin boş sayfaları tarayıcıda açılır (kart 0009).
import { expect, test } from "@playwright/test";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";

const sayfalar: { adres: string; baslik: MetinAnahtari }[] = [
  { adres: "/", baslik: "vitrin.anasayfa.baslik" },
  { adres: "/yonetim", baslik: "yonetim.anasayfa.baslik" },
];

for (const { adres, baslik } of sayfalar) {
  test(`${adres} adresi açılır ve başlığını gösterir`, async ({ page }) => {
    const yanit = await page.goto(adres);
    expect(yanit?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(metin(baslik));
    await expect(page).toHaveTitle(metin(baslik));
  });
}
