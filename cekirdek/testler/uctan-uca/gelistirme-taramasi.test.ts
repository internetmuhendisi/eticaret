// Geliştirme taraması (kart 0251, karar 0184): uygulamanın her sayfası geliştirme sunucusunda gerçek tarayıcıda açılır.
// Konsolda hata, yakalanmamış hata ve hidrasyon uyarısı olmamalıdır. React'ın yalnız geliştirmede yazdığı uyarılar
// (eksik ya da yinelenen anahtar, geçersiz iç içe öğe, hidrasyon farkı) canlı derlemede yazılmaz; tarayıcı testleri
// canlıdaki gibi derlenmiş sunucuda çalıştığı için bu uyarılar bu taramayla yakalanır.
//
// Tarama aynı zamanda sayfaları derletir (eski ısınmanın tarayıcı turu, kart 0164): geliştirme aşamasının öteki
// testleri bundan sonra çalışır (playwright.gelistirme.config.ts). Önce girişsiz sayfalar; sonra deneme yöneticisi
// şifre ve iki aşamalı kurulumdan geçer (kurulum sayfası), panelin her sayfasını açar; sonra kurulumu bitmiş hesapla
// yeniden girer (giriş kodu sayfası). Sayfa listeleri uygulamanın klasöründen okunur (isinma.ts): yeni sayfa
// kendiliğinden taramaya girer.
//
// Yalnız sayfa açılışını ölçer: açılır pencere ya da form gibi etkileşimlerde yazılan geliştirme uyarıları yalnız
// geliştirme aşamasındaki etiketli testlerde ölçülür, öteki etkileşimlerde yalnız disiplindir.
import { expect, type Page, test } from "@playwright/test";
import { yalnizGelistirmedeEtiketi } from "./gelistirme-etiketleri";
import { girissizSayfalar, panelAdresleri } from "./isinma";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { paneleGir, sifreyleGir, yoneticiAc } from "./yonetici";

// İlk derleme hattın makinesinde 10 saniyeyi geçebilir (hat 45665957128); her adım derlemeyi bekleyecek kadar uzun.
const derlemeSuresi = 120_000;

// Taramanın istemci adresi testlerin kullanmadığı bloktadır (isinma.ts ile aynı kural): giriş ucunun sınırını
// testlerle paylaşmaz.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "192.0.2.8" } });

// Sayfayı açar, bağlanmasını bekler ve konsoldaki hataları sayfanın adresiyle döndürür. Bulunamadı ya da yönlendirme
// beklenen sayfalardır (değişken parçası örnek değer alan kayıt sayfaları, girişsiz hesap sayfaları): belge 404
// aldıysa yalnız 404 iletisi ayıklanır. Ayıklama sayfa açıldıktan sonra yapılır: ileti belgenin durumu bilinmeden
// gelir (ilk denemede bütün 404 sayfaları bu yüzden kırmızıydı).
const sayfayiTara = async (page: Page, adres: string): Promise<string[]> => {
  const hatalar = konsoluDinle(page);
  const yanit = await page.goto(adres, { timeout: derlemeSuresi });
  await sayfaHazir(page, { sure: derlemeSuresi });
  page.removeAllListeners("console");
  page.removeAllListeners("pageerror");
  const belgeBulunamadi = yanit?.status() === 404;
  return hatalar
    .filter(
      (hata) =>
        !(
          belgeBulunamadi &&
          hata.startsWith("Failed to load resource") &&
          hata.includes("status of 404")
        ),
    )
    .map((hata) => `${adres}: ${hata}`);
};

test("geliştirme sunucusunda her sayfa konsolda hata ve hidrasyon uyarısı olmadan açılır", {
  tag: yalnizGelistirmedeEtiketi,
}, async ({ page }) => {
  const sayfalar = girissizSayfalar();
  const yonetici = yoneticiAc();
  const panel = panelAdresleri();
  test.setTimeout(derlemeSuresi * (sayfalar.length + panel.length + 4));
  page.setDefaultTimeout(derlemeSuresi);

  const hatalar: string[] = [];
  for (const adres of sayfalar) hatalar.push(...(await sayfayiTara(page, adres)));

  await paneleGir(page, yonetici, { beklemeSuresi: derlemeSuresi });
  for (const adres of panel) hatalar.push(...(await sayfayiTara(page, adres)));

  await page.context().clearCookies();
  await page.goto("/yonetim/giris");
  await sifreyleGir(page, yonetici);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/, { timeout: derlemeSuresi });
  await sayfaHazir(page, { sure: derlemeSuresi });

  expect(hatalar).toEqual([]);
});
