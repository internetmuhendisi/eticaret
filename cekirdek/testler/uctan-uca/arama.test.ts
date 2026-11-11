// Arama gerçek tarayıcıda (kart 0137). Test kendi ürünlerini açar, sonunda siler (testler veritabanını paylaşır):
// - Üst kısımdaki kutuya klavyeyle yazılıp Enter'a basılınca arama sayfası açılır; Türkçe harfsiz ve büyük harfli
//   yazılış ürünü bulur; kutuda aranan metin durur; varsayılan sıralama "en uygun"dur; sayfa dizine kapalıdır.
// - Sonuç sayfası, sonuçsuz sayfa (kategori önerisiyle) ve boş arama iki renkte ve üç genişlikte taramadan geçer,
//   yana kaymaz. Telefonda kutu satırın altındadır ve çalışır.
// - Bulunamadı sayfasının arama kutusu arama sayfasına gider.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { istekSinirlari } from "../../kayitlar/kapi";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { siteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../../vitrin/adresler";
import { sayfaHazir } from "./sayfa-hazir";

if (existsSync(".env")) process.loadEnvFile(".env");

const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

// Tarama sonlu animasyonların ve geçişlerin bitmesini bekler (urun-listesi.test.ts ile aynı).
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

const yanaKaymaz = async (page: Page, ne: string) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    ne,
  ).toBe(0);

const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;

// Her test kendi istemci adresinden gelir: aramanın istek sınırı (dakikada 30) öteki testlerle paylaşılmaz.
test.beforeEach(({ page }) =>
  page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.100.${1 + Math.floor(Math.random() * 250)}`,
  }),
);

// "Şişli Çanta <ek>" ve "Kâğıt Defter <ek>": ek, aramanın yalnız bu testin ürünlerini bulmasını sağlar.
const hazirla = async () => {
  const vt = baglan(veritabaniAdresi());
  const site = calisanSite();
  const urunler = siteninUrunServisi(site);
  const fiyat = siteninFiyatServisi(site);
  const ek = randomUUID().slice(0, 8);
  const acilanlar: string[] = [];
  const temizle = async () => {
    for (const urun of acilanlar) await urunler.urunSil(vt, yapan, urun);
    await vt.$client.end();
  };
  try {
    for (const ad of [`Şişli Çanta ${ek}`, `Kâğıt Defter ${ek}`]) {
      const urun = await urunler.urunEkle(vt, yapan, {
        ad,
        vergiSinifi: null,
        durum: "yayinda",
        stokTakibi: false,
      });
      acilanlar.push(urun);
      const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
      await fiyat.fiyatYaz(vt, yapan, birim, { satisFiyati: 10_000 });
    }
    return { ek, temizle };
  } catch (hata) {
    await temizle();
    throw hata;
  }
};

const kartAdlari = (page: Page) =>
  page.getByRole("list", { name: metin("vitrin.liste.urunler") }).getByRole("heading");

test("üstteki kutudan klavyeyle aranır; Türkçe harfsiz ve büyük harfli yazılış bulur; kutuda aranan metin durur", async ({
  page,
}) => {
  const h = await hazirla();
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await sayfaHazir(page);
    const kutu = page
      .getByRole("banner")
      .getByRole("searchbox", { name: metin("vitrin.bolum.ustSatir.aramaEtiketi") })
      .first();
    await kutu.focus();
    await page.keyboard.type(`SISLI CANTA ${h.ek}`);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/arama\?ara=SISLI\+CANTA/);
    await sayfaHazir(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      doldur(metin("vitrin.arama.sonucBasligi"), { arama: `SISLI CANTA ${h.ek}` }),
    );
    await expect(kartAdlari(page)).toHaveText([`Şişli Çanta ${h.ek}`]);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("banner").getByRole("searchbox").first()).toHaveValue(
      `SISLI CANTA ${h.ek}`,
    );
    await expect(page.getByRole("combobox", { name: metin("vitrin.liste.sirala") })).toHaveText(
      metin("vitrin.liste.siralama.en-uygun"),
    );
    // Kendi yazılışıyla ve şapkasız da bulur.
    for (const yazilis of [`kagit defter ${h.ek}`, `Kâğıt ${h.ek}`]) {
      await page.goto(`${vitrinAdresleri.arama}?ara=${encodeURIComponent(yazilis)}`);
      await sayfaHazir(page);
      await expect(kartAdlari(page), yazilis).toHaveText([`Kâğıt Defter ${h.ek}`]);
    }
  } finally {
    await h.temizle();
  }
});

test("sonuç, sonuçsuz ve boş arama iki renkte ve üç genişlikte taramadan geçer; telefonda kutu satırın altındadır", async ({
  page,
}) => {
  const h = await hazirla();
  try {
    const sayfalar = [
      { adres: `${vitrinAdresleri.arama}?ara=${h.ek}`, ne: "sonuç" },
      { adres: `${vitrinAdresleri.arama}?ara=yok${h.ek}`, ne: "sonuçsuz" },
      { adres: vitrinAdresleri.arama, ne: "boş" },
    ];
    for (const renk of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: renk });
      for (const genislik of genislikler) {
        await page.setViewportSize(genislik);
        for (const { adres, ne } of sayfalar) {
          const yanit = await page.goto(adres);
          await sayfaHazir(page);
          const ad = `${ne}, ${renk}, ${genislik.width}`;
          expect(yanit?.status(), ad).toBe(200);
          await yanaKaymaz(page, ad);
          await tara(page, ad);
        }
      }
    }
    // Sonuçsuz: kategoriler öneri olarak.
    await page.goto(`${vitrinAdresleri.arama}?ara=yok${h.ek}`);
    await sayfaHazir(page);
    await expect(
      page.getByRole("heading", { name: metin("vitrin.arama.kategoriOnerisi") }),
    ).toBeVisible();
    // Telefonda kutu satırın altında görünür ve çalışır.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await sayfaHazir(page);
    const kutu = page.getByRole("banner").getByRole("searchbox").filter({ visible: true });
    await expect(kutu).toHaveCount(1);
    await kutu.fill(h.ek);
    await kutu.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/arama\\?ara=${h.ek}`));
    await sayfaHazir(page);
    await expect(kartAdlari(page)).toHaveCount(2);
  } finally {
    await h.temizle();
  }
});

test("bulunamadı sayfasının arama kutusu arama sayfasına gider", async ({ page }) => {
  await page.goto(`/olmayan-${randomUUID().slice(0, 8)}`);
  await sayfaHazir(page);
  // Üstteki kutudan ayrı adla: ekran okuyucu iki arama alanını ayırt eder.
  const kutu = page
    .getByRole("main")
    .getByRole("searchbox", { name: metin("vitrin.bulunamadi.aramaEtiketi") });
  await expect(
    page.getByRole("search", { name: metin("vitrin.bulunamadi.aramaEtiketi") }),
  ).toHaveCount(1);
  await kutu.fill("kupa");
  await kutu.press("Enter");
  await expect(page).toHaveURL(/\/arama\?ara=kupa/);
});

test("istek sınırı aşılınca sayfa 429 ile bekleme süresini söyler, arama yapmaz", async ({
  page,
}) => {
  // Bu test kendi ağından sınırı doldurur: her çalışmada yeni bir IPv6 ağı (ilk 64 bit), önceki çalışmanın sayacına
  // takılmaz.
  const istemci = `2001:db8:${randomUUID().slice(0, 4)}:${randomUUID().slice(0, 4)}::1`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": istemci });
  for (let i = 0; i < istekSinirlari.arama.istek; i += 1) {
    // page.request sayfanın ek başlıklarını taşımaz, başlık açıkça verilir.
    const yanit = await page.request.get(`${vitrinAdresleri.arama}?ara=kupa`, {
      headers: { "x-forwarded-for": istemci },
    });
    expect(yanit.status(), `${i + 1}. istek`).toBe(200);
  }
  const yanit = await page.goto(`${vitrinAdresleri.arama}?ara=kupa`);
  expect(yanit?.status()).toBe(429);
  expect(Number(yanit?.headers()["retry-after"])).toBeGreaterThan(0);
  await sayfaHazir(page);
  await expect(page.getByText(metin("vitrin.arama.cokFazlaBaslik"))).toBeVisible();
  await expect(page.getByRole("list", { name: metin("vitrin.liste.urunler") })).toHaveCount(0);
  await tara(page, "429");
});
