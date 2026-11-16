// Sepet gerçek tarayıcıda (kart 0212, karar 0135). Test kendi ürünlerini açar (fiyatlı ve stoklu), sonunda siler. Kargo
// paylaşılan veritabanında varsayılanıyla (ücretsiz) ölçülür: ayarı değiştirmek öteki testleri etkiler; kargonun öteki
// hâlleri sepet hesabının testindedir.
// - Ürün sayfasında adet klavyeyle artırılır, "Sepete ekle" ile sepet penceresi açılır (Örnek Mağaza'nın ayarı); pencere
//   taramadan geçer, Escape kapatır ve odak düğmeye döner; üst kısımdaki sayı artar.
// - Arama sonucundaki ürün kartının sepet düğmesi ürünü bir adet ekler.
// - Sepet sayfası: stoktan fazla adet düzeltilir ve söylenir, adet klavyeyle değişince toplam değişir, çıkarılan ürün
//   "Geri al" ile döner, sepet boşalınca boş hâl görünür. Dolu ve boş sayfa iki renkte ve üç genişlikte taramadan geçer,
//   yana kaymaz, konsolda hata yok; sayfa arama motorlarına kapalıdır.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { sepetDepoAnahtari } from "../../kayitlar/sepet";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";

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

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
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
    name: doldur(metin("vitrin.sepet.pencereBaslik"), { sayi: "1" }),
  });
  await expect(pencere).toBeVisible();
  await expect(pencere.getByRole("link", { name: urun(0).ad })).toBeVisible();
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
  await kart.getByRole("button", { name: metin("vitrin.urunKarti.sepeteEkle") }).click();
  const pencere = page.getByRole("dialog");
  await expect(pencere.getByRole("link", { name: urun(1).ad })).toBeVisible();
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
