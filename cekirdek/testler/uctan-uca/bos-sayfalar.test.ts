// Vitrinin boş sayfası ve yönetim panelinin giriş sayfası tarayıcıda açılır (kartlar 0009, 0010, 0027).
// Vitrin, sitenin adını kimlik dosyasından gösterir; ayarı açıksa başlığın altında
// "Yakında açılıyoruz." yazısını da (kart 0041). Yazı yalnız sade ana sayfadadır: ana sayfa alanında çizilecek
// bölüm varsa sayfa bölümleri çizer, yazı görünmez (kart 0110). Beklenen, sitenin gerçek düzeninden okunur (kart 0129).
import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin } from "../../metinler/site-metni";
import { duzenServisi } from "../../moduller/duzen/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { duzenKilidiniAl } from "./duzen-kilidi";

if (existsSync(".env")) process.loadEnvFile(".env");

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

test("ana sayfadaki yakında yazısı sitenin ayarına ve düzenine uyar", async ({ page }) => {
  const vt = baglan(veritabaniAdresi());
  // Düzeni okuyup sayfayı ona göre bekler: o arada öteki işçideki düzen testi ana sayfanın bölümlerini
  // değiştirmesin (kart 0293, duzen-kilidi.ts).
  const birak = await duzenKilidiniAl(vt);
  try {
    const bolumler = await duzenServisi(calisanSite).cizilecekBolumler(vt, "ana-sayfa");
    await page.goto("/");
    const yazi = page.getByText(metin("vitrin.anasayfa.yakindaAciliyoruz"), { exact: true });
    if (calisanSite().ayarlar.yakindaYazisi && bolumler.length === 0) {
      // Başlığın hemen ardından gelir.
      await expect(page.locator("h1 + p")).toHaveText(metin("vitrin.anasayfa.yakindaAciliyoruz"));
      await expect(yazi).toBeVisible();
    } else {
      await expect(yazi).toHaveCount(0);
    }
  } finally {
    await birak();
    await vt.$client.end();
  }
});
