// Bileşen kataloğu gerçek tarayıcıda (kart 0104): her parçanın kendi sayfası açık ve koyu temada, telefon,
// tablet ve masaüstü genişliğinde erişilebilirlik taramasından geçer, yana kaymaz, konsolda hata yoktur ve
// kullanıldığı yerleri listeler. Renk seçimi cihazın tercihini geçersiz kılar, açılır parçalara da geçer;
// genişlik seçimi sayfayı o genişlikte bir çerçevede aynı renkle açar. Ana sayfa her parçayı gösterir.
// Klavye denemeleri ana sayfada bilesenler.test.ts'tedir.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { katalogAdresi, katalogParcalari } from "../../katalog/kayit";
import kullanimlar from "../../katalog/kullanimlar.json" with { type: "json" };
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

const ac = async (page: Page, adres: string) => {
  const hatalar: string[] = [];
  page.on("console", (ileti) => {
    if (ileti.type() === "error") hatalar.push(ileti.text());
  });
  page.on("pageerror", (hata) => hatalar.push(hata.message));
  const yanit = await page.goto(adres);
  await page.waitForLoadState("networkidle");
  return { hatalar, durum: yanit?.status() };
};

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

const zemin = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

for (const parca of katalogParcalari) {
  test(`${parca.kod}: iki renkte ve üç genişlikte taramadan geçer, kullanıldığı yerleri gösterir`, async ({
    page,
  }) => {
    const hatalar: string[] = [];
    for (const renk of ["acik", "koyu"] as const) {
      for (const { ad, width, height } of genislikler) {
        await page.setViewportSize({ width, height });
        const sayfa = await ac(page, `${katalogAdresi}/${parca.kod}?renk=${renk}`);
        expect(sayfa.durum).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("data-renk", renk);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(metin(parca.baslik));
        await expect(
          page.getByRole("region", { name: metin(parca.baslik), exact: true }),
        ).toBeVisible();
        await tara(page, `${renk}, ${ad}`);
        expect(await yanaKayma(page), `${renk}, ${ad}`).toBe(0);
        hatalar.push(...sayfa.hatalar);
      }
    }
    // Dosyası ve onu kullanan dosyalar (kullanimlar.json) listelenir; kullanılmıyorsa bu söylenir.
    await expect(page.getByText(parca.dosya, { exact: true })).toBeVisible();
    const kullananlar = (kullanimlar as Record<string, string[]>)[parca.dosya] ?? [];
    if (kullananlar.length === 0) {
      await expect(page.getByText(metin("gelistirme.katalog.kullanilmiyor"))).toBeVisible();
    }
    for (const dosya of kullananlar) {
      await expect(page.getByRole("listitem").filter({ hasText: dosya })).toHaveCount(1);
    }
    expect(hatalar).toEqual([]);
  });
}

test("ana sayfa her parçayı kendi bölümünde ve sayfasına bağlantıyla gösterir", async ({
  page,
}) => {
  const { hatalar } = await ac(page, katalogAdresi);
  for (const parca of katalogParcalari) {
    const bolum = page.getByRole("region", { name: metin(parca.baslik), exact: true });
    await expect(bolum).toBeVisible();
    await expect(bolum.getByRole("heading", { level: 2 }).getByRole("link")).toHaveAttribute(
      "href",
      `${katalogAdresi}/${parca.kod}`,
    );
  }
  expect(hatalar).toEqual([]);
});

test("olmayan parçanın sayfası yoktur", async ({ page }) => {
  expect((await ac(page, `${katalogAdresi}/olmayan-parca`)).durum).toBe(404);
});

test("renk seçimi cihazın tercihini geçersiz kılar, açılan pencereye de geçer", async ({
  page,
}) => {
  const pencereyiAc = async () => {
    await page
      .getByRole("button", { name: metin("gelistirme.ornek.pencereyiAc" as MetinAnahtari) })
      .click();
    const pencere = page.getByRole("dialog");
    await expect(pencere).toBeVisible();
    // Açılış hareketi bitince renk ölçülür.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const renk = await pencere.evaluate((e) => getComputedStyle(e).backgroundColor);
    await page.keyboard.press("Escape");
    await expect(pencere).toHaveCount(0);
    return renk;
  };
  // Cihazın kendi renkleri: seçim yokken açık ve koyu tercihte.
  const cihaz: Record<"acik" | "koyu", { zemin: string; pencere: string }> = {
    acik: { zemin: "", pencere: "" },
    koyu: { zemin: "", pencere: "" },
  };
  for (const [renk, tercih] of [
    ["acik", "light"],
    ["koyu", "dark"],
  ] as const) {
    await page.emulateMedia({ colorScheme: tercih });
    await ac(page, `${katalogAdresi}/pencere`);
    cihaz[renk] = { zemin: await zemin(page), pencere: await pencereyiAc() };
  }
  expect(cihaz.koyu.zemin).not.toBe(cihaz.acik.zemin);
  expect(cihaz.koyu.pencere).not.toBe(cihaz.acik.pencere);

  // Tercihin tersi seçilir: sayfa ve gövdeye çizilen pencere seçilen renktedir.
  for (const [renk, tercih] of [
    ["acik", "dark"],
    ["koyu", "light"],
  ] as const) {
    await page.emulateMedia({ colorScheme: tercih });
    await ac(page, `${katalogAdresi}/pencere?renk=${renk}`);
    expect(await zemin(page), renk).toBe(cihaz[renk].zemin);
    expect(await pencereyiAc(), renk).toBe(cihaz[renk].pencere);
  }

  // Seçili renk işaretlidir; "cihazınki" seçimi kaldırır.
  const renkler = page.getByRole("navigation", { name: metin("gelistirme.katalog.renk") });
  await expect(
    renkler.getByRole("link", { name: metin("gelistirme.katalog.renkKoyu") }),
  ).toHaveAttribute("aria-current", "page");
  await renkler.getByRole("link", { name: metin("gelistirme.katalog.renkCihaz") }).click();
  await expect(page).toHaveURL(`${katalogAdresi}/pencere`);
  await expect(page.locator("html")).not.toHaveAttribute("data-renk", /.*/);
  expect(await zemin(page)).toBe(cihaz.acik.zemin);
});

for (const { ad, piksel } of [
  { ad: "telefon", piksel: 375 },
  { ad: "tablet", piksel: 768 },
  { ad: "masaustu", piksel: 1280 },
]) {
  test(`genişlik seçimi (${ad}) sayfayı ${piksel} px çerçevede aynı renkle açar, sayfa yana kaymaz`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const { hatalar } = await ac(page, `${katalogAdresi}/kart?renk=koyu&genislik=${ad}`);
    const cerceve = page.locator("iframe");
    await expect(cerceve).toHaveAttribute("width", String(piksel));
    expect(await yanaKayma(page)).toBe(0);
    const ic = page.frameLocator("iframe");
    // Çerçevedeki sayfa o genişliktedir, seçim çubuğu yoktur, renk aynıdır.
    await expect(
      ic.getByRole("region", { name: metin("gelistirme.katalog.parca.kart"), exact: true }),
    ).toBeVisible();
    await expect(ic.getByRole("navigation")).toHaveCount(0);
    await expect(ic.locator("html")).toHaveAttribute("data-renk", "koyu");
    const icGenislik = await ic.locator("html").evaluate((e) => e.clientWidth);
    expect(icGenislik).toBe(piksel);
    expect(hatalar).toEqual([]);
  });
}

// Bölüm kütüphanesinin sayfası (kart 0106): deneme bölümü iki görünümüyle çizilir, tariften çıkan form her
// alanı gösterir; iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yoktur.
test("bölüm kütüphanesi: deneme bölümü ve tarifinden çıkan form iki renkte ve üç genişlikte taramadan geçer", async ({
  page,
}) => {
  const hatalar: string[] = [];
  for (const renk of ["acik", "koyu"] as const) {
    for (const { ad, width, height } of genislikler) {
      await page.setViewportSize({ width, height });
      const sayfa = await ac(page, `${katalogAdresi}/bolum-kutuphanesi?renk=${renk}`);
      expect(sayfa.durum).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        metin("gelistirme.bolum.baslik"),
      );
      const cizim = page.getByRole("region", { name: metin("gelistirme.bolum.cizim") });
      await expect(cizim.getByText(metin("gelistirme.bolum.ornek.madde1"))).toBeVisible();
      const form = page.getByRole("region", { name: metin("gelistirme.bolum.form") });
      await expect(form.getByLabel(metin("gelistirme.bolum.alan.baslik"))).toHaveValue(
        metin("gelistirme.bolum.ornek.baslik"),
      );
      await expect(form.getByLabel(metin("gelistirme.bolum.alan.aciklama"))).toBeVisible();
      await tara(page, `${renk}, ${ad}`);
      expect(await yanaKayma(page), `${renk}, ${ad}`).toBe(0);
      hatalar.push(...sayfa.hatalar);
    }
  }
  // Formda liste öğesi eklenir ve sınırda ekleme düğmesi kapanır.
  const liste = page.getByRole("group", { name: metin("gelistirme.bolum.alan.maddeler") });
  const ekle = liste.getByRole("button", { name: metin("yonetim.bolumFormu.ekle") });
  await ekle.click();
  await expect(liste.getByLabel(metin("gelistirme.bolum.alan.maddeMetni"))).toHaveCount(3);
  await expect(ekle).toBeDisabled();
  expect(hatalar).toEqual([]);
});
