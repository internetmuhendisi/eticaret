// Tarayıcı testlerinin geliştirme aşaması (kart 0251, karar 0184). Tarayıcı testleri canlıdaki gibi derlenmiş
// sunucuda çalışır (playwright.config.ts). Bu aşama yalnız geliştirme sunucusunda görünenleri ölçer:
// - Geliştirme taraması (gelistirme-taramasi.test.ts): her sayfa geliştirme sunucusunda açılır, React'ın yalnız
//   geliştirmede yazdığı uyarılar (anahtar, iç içe öğe, hidrasyon farkı) dahil konsol temiz olmalıdır. Tarama
//   sayfaları derletir; ardından gelen testler derleme beklemez (eski ısınmanın tarayıcı turu, kart 0164).
// - Etiketli testler (cekirdek/testler/uctan-uca/gelistirme-etiketleri.ts): hidrasyon uyarısını ölçenler ve bilerek
//   hata veren deneme sayfası.
// Ortam, sunucu günlüğü ve kartla ödemenin sahte kuruluşu asıl ayardan gelir; asıl ayar içe aktarılınca kurulur.
// Çalıştırma: pnpm tarayici-testleri-gelistirme (asıl aşama bittikten sonra: ikisi de 3000 portunu kullanır).
import { defineConfig, devices } from "@playwright/test";
import {
  gelistirmeAsamasindakiler,
  yalnizGelistirmede,
} from "./cekirdek/testler/uctan-uca/gelistirme-etiketleri";
import asil from "./playwright.config";

// Asıl aşamanın etiket süzgeci, hazırlığı, sunucusu ve projeleri buraya geçmez.
const { grepInvert: _, globalSetup: __, webServer, projects: ___, ...ortak } = asil;
const [, sahteKurulus] = Array.isArray(webServer) ? webServer : [];
if (sahteKurulus === undefined) throw new Error("Asıl ayarda kartla ödemenin sahte kuruluşu yok.");
const tarama = "**/uctan-uca/gelistirme-taramasi.test.ts";
const dislananlar = [ortak.testIgnore ?? []].flat();

export default defineConfig({
  ...ortak,
  // Sitenin kurulumundan sonra yollar bir kez istenir (kart 0222): uçlar tarayıcı turunda açılmaz.
  globalSetup: [
    "./cekirdek/testler/uctan-uca/hazirlik.ts",
    "./cekirdek/testler/uctan-uca/isinma.ts",
  ],
  webServer: [
    {
      command: "pnpm cekirdek | node komutlar/sunucu-gunlugu.mts",
      url: "http://localhost:3000",
      reuseExistingServer: true,
    },
    sahteKurulus,
  ],
  projects: [
    {
      name: "gelistirme-taramasi",
      use: { ...devices["Desktop Chrome"] },
      testMatch: tarama,
      grep: yalnizGelistirmede,
    },
    {
      name: "gelistirme",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [...dislananlar, tarama],
      grep: gelistirmeAsamasindakiler,
      dependencies: ["gelistirme-taramasi"],
    },
  ],
});
