// Vitrinin boş sayfası ve yönetim panelinin giriş sayfası tarayıcıda açılır (kartlar 0009, 0010, 0027).
// Vitrin, sitenin adını kimlik dosyasından gösterir; ayarı açıksa başlığın altında
// "Yakında açılıyoruz." yazısını da (kart 0041).
import { expect, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin } from "../../metinler/site-metni";

const sayfalar: { adres: string; baslik: string }[] = [
  { adres: "/", baslik: calisanSite().kimlik.gorunenAd },
  { adres: "/yonetim/giris", baslik: metin("yonetim.giris.baslik") },
];

for (const { adres, baslik } of sayfalar) {
  test(`${adres} adresi açılır ve başlığını gösterir`, async ({ page }) => {
    const yanit = await page.goto(adres);
    expect(yanit?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(baslik);
    await expect(page).toHaveTitle(baslik);
  });
}

test("ana sayfadaki yakında yazısı sitenin ayarına uyar", async ({ page }) => {
  await page.goto("/");
  const yazi = page.getByText(metin("vitrin.anasayfa.yakindaAciliyoruz"), { exact: true });
  if (calisanSite().ayarlar.yakindaYazisi) {
    // Başlığın hemen ardından gelir.
    await expect(page.locator("h1 + p")).toHaveText(metin("vitrin.anasayfa.yakindaAciliyoruz"));
    await expect(yazi).toBeVisible();
  } else {
    await expect(yazi).toHaveCount(0);
  }
});
