// Panelin çerçevesi gerçek tarayıcıda (kart 0141, karar 0111): girişten sonra karşılama sayfası komut çubuğuyla,
// yan menü klavyeyle gezilir, vitrine git yeni sekmede açılır; telefonda menü yan pencerede açılır ve kapanınca
// odağı düğmeye verir; panel iki renkte ve üç genişlikte erişilebilirlik taramasından geçer, yana kaymaz,
// konsolda hata yoktur. Rol başına menü gerçek veritabanıyla birim testindedir (panel-yetkisi.test.tsx).
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { altyapiAdi } from "../../kayitlar/altyapi";
import { metin } from "../../metinler/site-metni";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, type DenemeYoneticisi, paneleGir, yoneticiAc } from "./yonetici";

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

let yonetici: DenemeYoneticisi;

test.beforeEach(({ page }) => {
  yonetici = yoneticiAc();
  return ayriBaglanti(page);
});

const tara = async (page: Page, ne: string) => {
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
    .analyze();
  expect(
    sonuc.violations.map((ihlal) => ({
      kural: ihlal.id,
      ogeler: ihlal.nodes.map((oge) => oge.target.join(" ")),
    })),
    ne,
  ).toEqual([]);
};

const yanaKayma = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const menuAdi = () => metin("yonetim.cerceve.menu");
const karsilama = () => metin("yonetim.sayfa.karsilama.ad");

test("masaüstünde karşılama komut çubuğuyla açılır, yan menü klavyeyle gezilir, vitrine git yeni sekmede", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yonetici);
  await sayfaHazir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(karsilama());
  await expect(page.getByText(metin("yonetim.sayfa.karsilama.aciklama"))).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(`^${karsilama()} \\| `));

  const menu = page.getByRole("navigation", { name: menuAdi() });
  await expect(menu).toBeVisible();
  const bag = menu.getByRole("link", { name: karsilama() });
  await expect(bag).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(yonetici.eposta)).toBeVisible();
  await expect(page.getByText(altyapiAdi, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: metin("yonetim.cerceve.menuyuAc") })).toBeHidden();

  // Klavye sırası: menünün sayfaları (kart 0142'den beri Vitrin grubu da), vitrine git, çıkış.
  await page.locator("body").focus();
  await page.keyboard.press("Tab");
  await expect(bag).toBeFocused();
  const sayfalar = menu.getByRole("link");
  for (let sira = 1; sira < (await sayfalar.count()); sira += 1) {
    await page.keyboard.press("Tab");
    await expect(sayfalar.nth(sira)).toBeFocused();
  }
  const vitrine = page.getByRole("link", { name: metin("yonetim.eylem.vitrineGitYeniSekme") });
  await page.keyboard.press("Tab");
  await expect(vitrine).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: metin("yonetim.cikis.dugme") })).toBeFocused();

  // Odak çerçevesi görünür.
  await page.keyboard.press("Shift+Tab");
  expect(await vitrine.evaluate((oge) => getComputedStyle(oge).outlineStyle)).not.toBe("none");

  const [yeniSekme] = await Promise.all([
    context.waitForEvent("page"),
    page.keyboard.press("Enter"),
  ]);
  await yeniSekme.waitForLoadState();
  expect(new URL(yeniSekme.url()).pathname).toBe("/");
  await yeniSekme.close();
  await expect(page).toHaveURL(/\/yonetim$/);

  // Menüdeki sayfaya Enter ile gidilir.
  await bag.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim$/);
});

test("telefonda menü yan pencerede açılır, Escape odağı düğmeye verir, bağlantıya basınca kapanır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await paneleGir(page, yonetici);
  await sayfaHazir(page);
  await expect(page.getByRole("navigation", { name: menuAdi() })).toBeHidden();
  const dugme = page.getByRole("button", { name: metin("yonetim.cerceve.menuyuAc") });
  await dugme.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: menuAdi() });
  await expect(pencere).toBeVisible();
  await expect(pencere.getByRole("link", { name: karsilama() })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(pencere.getByText(yonetici.eposta)).toBeVisible();
  await expect(pencere.getByRole("button", { name: metin("yonetim.cikis.dugme") })).toBeVisible();
  await tara(page, "telefonda açık menü");
  expect(await yanaKayma(page)).toBe(0);

  await page.keyboard.press("Escape");
  await expect(pencere).toHaveCount(0);
  await expect(dugme).toBeFocused();

  await dugme.click();
  await pencere.getByRole("link", { name: karsilama() }).click();
  await expect(pencere).toHaveCount(0);
  await expect(page).toHaveURL(/\/yonetim$/);
});

// Geniş logo (10:1) yan menüden ve telefonun üst çubuğundan taşmaz, oranını korur, mağaza adı görünür kalır
// (bağımsız kontrolün bulgusu). Logo testte tarayıcıda geniş bir görselle değiştirilir: sitenin logosu kaydedilmez.
test("geniş logo yan menüden ve üst çubuktan taşmaz, oranını korur, ad görünür kalır", async ({
  page,
}) => {
  await paneleGir(page, yonetici);
  const genisLogo = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="40"><rect width="400" height="40"/></svg>',
  )}`;
  for (const { ad, width, height } of [
    { ad: "masaüstü", width: 1280, height: 900 },
    { ad: "telefon", width: 320, height: 800 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.reload();
    await sayfaHazir(page);
    const kap = ad === "masaüstü" ? page.locator("aside") : page.locator("main").locator("..");
    const isaret = kap.locator("img").first();
    await isaret.evaluate((oge: HTMLImageElement, kaynak) => {
      oge.src = kaynak;
    }, genisLogo);
    await expect.poll(() => isaret.evaluate((oge: HTMLImageElement) => oge.complete)).toBe(true);
    const olcu = await isaret.evaluate((oge: HTMLImageElement) => {
      const kutu = oge.getBoundingClientRect();
      const ust = oge.parentElement?.getBoundingClientRect();
      const adKutusu = oge.nextElementSibling?.getBoundingClientRect();
      // Logo kutusuna sığdırılır, oranı bozulmaz (object-fit: contain): kutunun kendi oranı değil, çizim biçimi ölçülür.
      return {
        sigdirma: getComputedStyle(oge).objectFit,
        tasma: (kutu.right ?? 0) - (ust?.right ?? 0),
        adGenisligi: adKutusu?.width ?? 0,
      };
    });
    expect(olcu.sigdirma, ad).toBe("contain");
    expect(olcu.tasma, ad).toBeLessThanOrEqual(0);
    expect(olcu.adGenisligi, ad).toBeGreaterThan(0);
    expect(await yanaKayma(page), ad).toBe(0);
  }
});

test("panel iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yok", async ({
  page,
}) => {
  const hatalar = konsoluDinle(page);
  await paneleGir(page, yonetici);
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const { ad, width, height } of genislikler) {
      await page.setViewportSize({ width, height });
      await page.reload();
      await sayfaHazir(page);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(karsilama());
      await tara(page, `${renk} ${ad}`);
      expect(await yanaKayma(page), `${renk} ${ad}`).toBe(0);
    }
  }
  expect(hatalar).toEqual([]);
});
