// Vitrinin ve yönetim panelinin boş sayfaları tarayıcıda açılır (kartlar 0009, 0010).
// Vitrin, sitenin adını kimlik dosyasından gösterir.
import { expect, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin } from "../../metinler/site-metni";

const sayfalar: { adres: string; baslik: string }[] = [
  { adres: "/", baslik: calisanSite().kimlik.gorunenAd },
  { adres: "/yonetim", baslik: metin("yonetim.anasayfa.baslik") },
];

for (const { adres, baslik } of sayfalar) {
  test(`${adres} adresi açılır ve başlığını gösterir`, async ({ page }) => {
    const yanit = await page.goto(adres);
    expect(yanit?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(baslik);
    await expect(page).toHaveTitle(baslik);
  });
}
