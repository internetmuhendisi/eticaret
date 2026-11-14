// Ekran ölçümü (kart 0146, .claude/rules/kurallari-koruyan-kontroller.md "Ekran ölçümü"): vitrinin her sayfa türü
// 320, 390, 768 ve 1280 px'te, açık ve koyu temada açılır; sayfa yana kaymaz, konsolda hata yoktur, erişilebilirlik
// taramasından (WCAG 2.2 AA) geçer ve her basılabilir öğe 44 × 44 px basılır, komşusuyla çakışmaz (basilan-alan.ts).
// Sayfalar ve adresleri vitrin-sayfalari.ts'tedir. Sayfalar tarayıcı testlerinden önce kurulan gerçek düzen ve
// katalogla çizilir (hazirlik.ts).
// Sayfa başına ayrı testtir: paralel çalışır, bir sayfanın hatası ötekileri saklamaz.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { basilmayanOgeler } from "./basilan-alan";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ekranGenislikleri, ekranSayfalari } from "./vitrin-sayfalari";

const tara = async (page: Page) => {
  // Sonlu animasyon ve geçişler bitmeden renkler ara değerdedir (kart 0136).
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
  return sonuc.violations.map(
    (ihlal) => `${ihlal.id}: ${ihlal.nodes.map((oge) => oge.target.join(" ")).join(", ")}`,
  );
};

for (const [tur, { adres, durum }] of Object.entries(ekranSayfalari)) {
  test(`ekran ölçümü: ${tur} dört genişlikte ve iki temada`, async ({ page }) => {
    test.setTimeout(120_000);
    // Girişsiz ziyaretçinin oturum sorusu 401 alır (karar 0098); bulunamadı sayfasının kendisi 404'tür.
    const hatalar = konsoluDinle(page, {
      haric: (metin) => metin.includes("401") || (durum === 404 && metin.includes("status of 404")),
    });
    const bulgular: string[] = [];
    for (const renk of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: renk });
      for (const genislik of ekranGenislikleri) {
        const yer = `${renk} ${genislik} px`;
        await page.setViewportSize({ width: genislik, height: 900 });
        const yanit = await page.goto(adres);
        await sayfaHazir(page);
        expect(yanit?.status(), yer).toBe(durum);
        const kayma = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (kayma > 0) bulgular.push(`${yer}: sayfa ${kayma} px yana kayıyor`);
        for (const ihlal of await tara(page)) bulgular.push(`${yer}: tarama ${ihlal}`);
        // Basılan alan renkten bağımsızdır: yalnız açık temada ölçülür.
        if (renk === "light") {
          for (const oge of await basilmayanOgeler(page))
            bulgular.push(`${yer}: basılan alan ${oge}`);
        }
      }
    }
    expect(bulgular, tur).toEqual([]);
    expect(hatalar, tur).toEqual([]);
  });
}
