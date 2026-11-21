// Sepet gerçek tarayıcıda (kart 0212, karar 0135). Test kendi ürünlerini açar (fiyatlı ve stoklu), sonunda siler. Kargo
// paylaşılan veritabanında varsayılanıyla (ücretsiz) ölçülür: ayarı değiştirmek öteki testleri etkiler; kargonun öteki
// hâlleri sepet hesabının testindedir.
// - Ürün sayfasında adet klavyeyle artırılır, "Sepete ekle" ile sepet penceresi açılır (sitenin "Sepete ekleyince" ayarı varsayılanında); pencere
//   taramadan geçer, Escape kapatır ve odak düğmeye döner; üst kısımdaki sayı artar.
// - Arama sonucundaki ürün kartının sepet düğmesi ürünü bir adet ekler.
// - Sepet sayfası: stoktan fazla adet düzeltilir ve söylenir, adet klavyeyle değişince toplam değişir, çıkarılan ürün
//   "Geri al" ile döner, sepet boşalınca boş hâl görünür. Dolu ve boş sayfa iki renkte ve üç genişlikte taramadan geçer,
//   yana kaymaz, konsolda hata yok; sayfa arama motorlarına kapalıdır.
// - Panelin Kargo ekranı (aynı dosyada, öteki testlerden sonra sırayla: paylaşılan kargo ayarını değiştirir, sonunda
//   eski hâline döner): mağaza sahibi menüden klavyeyle gelir, okunamayan tutar alanın hatasıyla döner ve odak alana
//   gider, ücret ve sınır Enter ile kaydedilir; sepette sınırın altında kargo ücreti eklenir, üstünde kargo ücretsizdir.
//   Ekran (hatalı hâli de) iki renkte ve üç genişlikte taramadan geçer, yana kaymaz.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { sepetDepoAnahtari } from "../../kayitlar/sepet";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../../vitrin/adresler";
import { ozetOdaktaOlmali } from "./form-hatasi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = sistemIslemi("tarayici-testi");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
const bicim = () => siteninBicimleyicisi(calisanSite().ayarlar);

let vt: Veritabani;
const ek = randomUUID().slice(0, 8);
const urunler: { kimlik: string; birim: string; ad: string; adres: string; tutar: number }[] = [];
const temizlik: (() => Promise<unknown>)[] = [];

// Testten önceki kargo ayarları: Kargo ekranı testi sonunda onlara döner.
let ilkKargo: Exclude<
  Parameters<ReturnType<typeof magazaAyarlari>["degistir"]>[2],
  (...girdi: never[]) => unknown
> = {};
const magazaAyarlari = () => siteninServisi(calisanSite());

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const ayarlar = await magazaAyarlari().oku(vt);
  ilkKargo = {
    kargoUcreti: ayarlar.kargoUcreti,
    ucretsizKargoSiniri: ayarlar.ucretsizKargoSiniri,
    ucretsizKargoTutari: ayarlar.ucretsizKargoTutari,
    kargoyaVermeSuresi: ayarlar.kargoyaVermeSuresi,
  };
  temizlik.push(() => magazaAyarlari().degistir(vt, yapan, ilkKargo));
  const servis = calisanSiteninUrunServisi();
  for (const [sira, tutar, stok] of [
    [1, 12_000, 3],
    [2, 4_500, 10],
  ] as const) {
    const ad = `Sepet deneme ${sira} ${ek}`;
    const adresAdi = `sepet-deneme-${sira}-${ek}`;
    const kimlik = await servis.urunEkle(vt, yapan, {
      ad,
      adresAdi,
      vergiSinifi: null,
      durum: "yayinda",
    });
    temizlik.push(() => servis.urunSil(vt, yapan, kimlik));
    const birim = (await servis.urunuOku(vt, kimlik))?.birimler[0]?.kimlik ?? "";
    await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: tutar });
    await stokServisi().stokDuzelt(vt, yapan, birim, {
      yeniMiktar: stok,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    urunler.push({ kimlik, birim, ad, adres: kayitAdresleri.urun(adresAdi), tutar });
  }
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim();
  await vt.$client.end();
});

const urun = (sira: number) => {
  const kayit = urunler[sira];
  if (kayit === undefined) throw new Error("Ürün açılmadı.");
  return kayit;
};

// haric: taramanın dışında kalan öğe (kart 0217: üst üste binen bildirimlerin kapat düğmesi basılamıyor).
const tara = async (page: Page, ne: string, haric?: string) => {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const sonuc = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("nextjs-portal")
    .exclude(haric ?? "nextjs-portal")
    .analyze();
  expect(
    sonuc.violations.map((ihlal) => ({
      kural: ihlal.id,
      ogeler: ihlal.nodes.map((oge) => oge.target.join(" ")),
    })),
    ne,
  ).toEqual([]);
};

const yanaKaymaz = async (page: Page, ne: string) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ne,
  ).toBe(true);

const sepetiKur = async (page: Page, kalemler: { birim: string; adet: number }[]) => {
  await page.addInitScript(([anahtar, deger]) => window.localStorage.setItem(anahtar, deger), [
    sepetDepoAnahtari,
    JSON.stringify(kalemler),
  ] as const);
};

const ustSayi = (page: Page, sayi: number) =>
  page.getByText(doldur(metin("vitrin.sepet.sayi"), { sayi: String(sayi) })).first();

test("ürün sayfasından klavyeyle sepete ekleme: pencere açılır, taramadan geçer, Escape odağı düğmeye verir", async ({
  page,
}) => {
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(urun(0).adres);
  await sayfaHazir(page);
  const artir = page.getByRole("button", {
    name: doldur(metin("vitrin.sepet.artir"), { urun: urun(0).ad }),
  });
  await artir.focus();
  await page.keyboard.press("Enter");
  const ekle = page.getByRole("button", { name: metin("vitrin.sepet.sepeteEkle") });
  await ekle.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", {
    // Başlıktaki sayı adetlerin toplamıdır: bir ürün, iki adet.
    name: doldur(metin("vitrin.sepet.pencereBaslik"), { sayi: "2" }),
  });
  await expect(pencere).toBeVisible();
  // Pencerenin üstünde eklenen ürünün bildirimi.
  await expect(
    pencere.getByText(doldur(metin("vitrin.sepet.eklendi"), { urun: urun(0).ad })),
  ).toBeVisible();
  await expect(
    pencere.getByRole("list", { name: metin("vitrin.sepet.satirlar") }).getByText(urun(0).ad),
  ).toBeVisible();
  await expect(pencere.getByText(bicim().para(24_000)).first()).toBeVisible();
  await tara(page, "sepet penceresi");
  await page.keyboard.press("Escape");
  await expect(pencere).toBeHidden();
  await expect(ekle).toBeFocused();
  await expect(ustSayi(page, 1)).toBeAttached();
  expect(
    await page.evaluate(
      (anahtar) => JSON.parse(window.localStorage.getItem(anahtar) ?? "[]"),
      sepetDepoAnahtari,
    ),
  ).toEqual([{ birim: urun(0).birim, adet: 2, gorulenTutar: 12_000 }]);
  expect(hatalar).toEqual([]);
});

test("arama sonucundaki ürün kartının sepet düğmesi bir adet ekler", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${vitrinAdresleri.arama}?ara=${encodeURIComponent(`Sepet deneme 2 ${ek}`)}`);
  await sayfaHazir(page);
  const kart = page.locator("article", { hasText: urun(1).ad });
  await kart
    .getByRole("button", {
      name: doldur(metin("vitrin.urunKarti.sepeteEkle"), { urun: urun(1).ad }),
    })
    .click();
  const pencere = page.getByRole("dialog");
  await expect(
    pencere.getByRole("list", { name: metin("vitrin.sepet.satirlar") }).getByText(urun(1).ad),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ustSayi(page, 1)).toBeAttached();
});

test("sepet sayfası: stok düzeltmesi, klavyeyle adet, çıkarma ve geri alma, boş hâl", async ({
  page,
}) => {
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  await sepetiKur(page, [
    { birim: urun(0).birim, adet: 5 },
    { birim: urun(1).birim, adet: 1 },
  ]);
  await page.setViewportSize({ width: 1280, height: 900 });
  const yanit = await page.goto(vitrinAdresleri.sepet);
  expect(yanit?.status()).toBe(200);
  await sayfaHazir(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const satirlar = page
    .getByRole("list", { name: metin("vitrin.sepet.satirlar") })
    .getByRole("listitem");
  await expect(satirlar).toHaveCount(2);
  // Stok 3: istenen 5 adet 3'e iner ve söylenir.
  await expect(
    satirlar.first().getByText(doldur(metin("vitrin.sepet.uyari.stokAzaldi"), { sayi: "3" })),
  ).toBeVisible();
  await expect(page.getByText(metin("vitrin.sepet.degisiklikVar"))).toBeVisible();
  // 3 × 120,00 + 45,00 = 405,00.
  const toplam = page.getByRole("region", { name: metin("vitrin.sepet.ozet") });
  await expect(toplam.getByText(bicim().para(40_500)).first()).toBeVisible();
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `dolu sepet ${renk} ${boyut.width}`);
      await yanaKaymaz(page, `dolu sepet ${renk} ${boyut.width}`);
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  // Klavyeyle azaltınca adet 2 olur, toplam 285,00'a iner, stok uyarısı kalkar.
  const azalt = page.getByRole("button", {
    name: doldur(metin("vitrin.sepet.azalt"), { urun: urun(0).ad }),
  });
  await azalt.focus();
  await page.keyboard.press("Enter");
  await expect(toplam.getByText(bicim().para(28_500)).first()).toBeVisible();
  await expect(
    satirlar.first().getByText(doldur(metin("vitrin.sepet.uyari.stokAzaldi"), { sayi: "3" })),
  ).toBeHidden();
  // Çıkarılan ürün "Geri al" ile eski yerine döner.
  await page
    .getByRole("button", { name: doldur(metin("vitrin.sepet.cikar"), { urun: urun(1).ad }) })
    .click();
  await expect(satirlar).toHaveCount(1);
  await page.getByRole("button", { name: metin("vitrin.sepet.geriAl") }).click();
  await expect(satirlar).toHaveCount(2);
  await expect(satirlar.nth(1)).toContainText(urun(1).ad);
  // Hepsi çıkınca boş hâl.
  for (const ad of [urun(0).ad, urun(1).ad]) {
    await page
      .getByRole("button", { name: doldur(metin("vitrin.sepet.cikar"), { urun: ad }) })
      .click();
  }
  await expect(page.getByRole("heading", { name: metin("vitrin.sepet.bosBaslik") })).toBeVisible();
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      // Çıkarılan ürünlerin "Geri al" bildirimleri üst üste duruyor (kart 0217).
      await tara(page, `boş sepet ${renk} ${boyut.width}`, "[data-sonner-toaster]");
      await yanaKaymaz(page, `boş sepet ${renk} ${boyut.width}`);
    }
  }
  expect(hatalar).toEqual([]);
});

test("panelin Kargo ekranı: klavyeyle hata ve kayıt; sepette kargo ücreti ve ücretsiz kargo sınırı", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, {
    // Okunamayan tutarın kaydı bilerek gönderilir: uç 400 (dogrulama) döner, tarayıcı bunu konsola yazar.
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  const menudeki = page
    .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
    .getByRole("link", { name: metin("yonetim.sayfa.kargo.ad") });
  await menudeki.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/kargo$/);
  await sayfaHazir(page);
  await expect(page).toHaveTitle(new RegExp(`^${metin("yonetim.sayfa.kargo.ad")} \\|`));
  const ucret = page.getByLabel(metin("yonetim.kargo.ucret"));
  const sinir = page.getByLabel(metin("yonetim.kargo.sinir"));
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `kargo ekranı ${renk} ${boyut.width}`);
      await yanaKaymaz(page, `kargo ekranı ${renk} ${boyut.width}`);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
  // Okunamayan tutar: alanın hatası, odak alanda, hiçbir şey kaydedilmez.
  await ucret.fill("59,90 x");
  await ucret.press("Enter");
  await expect(page.getByText(metin("yonetim.kargo.hata.tutarOkunamadi"))).toBeVisible();
  await expect(ucret).toBeFocused();
  await expect(ucret).toHaveAttribute("aria-invalid", "true");
  await tara(page, "kargo ekranı hatalı");
  expect((await magazaAyarlari().oku(vt)).kargoUcreti).toBe(ilkKargo.kargoUcreti);
  // İki okunamayan tutar (kart 0259): odak özette, satırlar ekrandaki sırayla, satır alana götürür.
  await sinir.fill("abc");
  await sinir.press("Enter");
  const satirlar = await ozetOdaktaOlmali(
    page,
    [
      `${metin("yonetim.kargo.ucret")}: ${metin("yonetim.kargo.hata.tutarOkunamadi")}`,
      `${metin("yonetim.kargo.sinir")}: ${metin("yonetim.kargo.hata.tutarOkunamadi")}`,
    ],
    2,
  );
  await expect(sinir).toHaveAttribute("aria-invalid", "true");
  await tara(page, "kargo ekranı özetli");
  await satirlar.nth(1).getByRole("button").press("Enter");
  await expect(sinir).toBeFocused();
  // Ücret 59,90, sınır 200,00: kaydedilir, sayfa yenilenince alanlar sunucunun yazdığı hâlle gelir.
  await ucret.fill("59,9");
  await sinir.fill("200");
  await sinir.press("Enter");
  await expect(page.getByText(metin("yonetim.kargo.kaydedildi"))).toBeVisible();
  await expect(ucret).toHaveValue(bicim().paraYazisi(5_990));
  await expect(sinir).toHaveValue(bicim().paraYazisi(20_000));
  const ayarlar = await magazaAyarlari().oku(vt);
  expect([ayarlar.kargoUcreti, ayarlar.ucretsizKargoSiniri]).toEqual([5_990, 20_000]);

  // Sepet: 45,00 sınırın altında, kargo eklenir; 5 adet (225,00) sınırın üstünde, kargo ücretsiz.
  await page.evaluate(([anahtar, deger]) => window.localStorage.setItem(anahtar, deger), [
    sepetDepoAnahtari,
    JSON.stringify([{ birim: urun(1).birim, adet: 1 }]),
  ] as const);
  await page.goto(vitrinAdresleri.sepet);
  await sayfaHazir(page);
  const ozet = page.getByRole("region", { name: metin("vitrin.sepet.ozet") });
  await expect(ozet.getByText(bicim().para(5_990)).first()).toBeVisible();
  await expect(ozet.getByText(bicim().para(4_500 + 5_990)).first()).toBeVisible();
  const artir = page.getByRole("button", {
    name: doldur(metin("vitrin.sepet.artir"), { urun: urun(1).ad }),
  });
  for (let i = 0; i < 4; i += 1) {
    await artir.focus();
    await page.keyboard.press("Enter");
  }
  await expect(ozet.getByText(metin("vitrin.sepet.kargoUcretsiz"))).toBeVisible();
  await expect(ozet.getByText(bicim().para(22_500)).first()).toBeVisible();
  expect(hatalar).toEqual([]);
});
