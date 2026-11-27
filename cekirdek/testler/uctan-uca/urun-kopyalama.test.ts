// Ürün kopyalama gerçek tarayıcıda ve gerçek veritabanıyla (kart 0320, karar 0190): mağaza sahibi ürün ekranının
// komut çubuğundan klavyeyle "Kopyala"yı açar, ad "… (kopya)" önerisiyle gelir; boş adda alanın hatası ve odak;
// Enter ile kopyalar, kopyanın ürün ekranı açılır, üstünde taslak bilgisi yazar, stok kodu boştur. Listenin satır
// menüsünden klavyeyle kopyalanır, menü kapandıktan sonra pencere açılır. Pencere (boş ve hatalı) ve kopyanın ekranı
// iki renkte ve üç genişlikte taramadan geçer, sayfa yana kaymaz, konsolda hata yoktur.
//
// Ürünler sitenin paylaşılan verisidir: test kendi ürününü ("Deneme <6 onaltılık> …") açar, kopyalarıyla birlikte
// siler.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { and, eq, like } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin } from "../../metinler/site-metni";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { urunler } from "../../moduller/urun/model";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, type DenemeYoneticisi, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;

let yonetici: DenemeYoneticisi;
test.beforeEach(({ page }) => {
  yonetici = yoneticiAc();
  return ayriBaglanti(page);
});
test.afterAll(async () => {
  await vt.$client.end();
});

// Testin ürünü: "Deneme <ek> Kazak" (stok kodlu, fiyatlı); silerken adı ekle başlayan bütün ürünler (kopyalar da).
const urunAc = async () => {
  const ek = randomBytes(3).toString("hex");
  const servis = calisanSiteninUrunServisi();
  const urun = await servis.urunEkle(vt, yapan, {
    ad: `Deneme ${ek} Kazak`,
    durum: "yayinda",
    vergiSinifi: null,
    stokKodu: `KZ-${ek}`,
  });
  const birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await siteninFiyatServisi(calisanSite()).fiyatYaz(vt, yapan, birim, { satisFiyati: 49_990 });
  return {
    ek,
    urun,
    sil: async () => {
      const hepsi = await vt
        .select({ kimlik: urunler.kimlik })
        .from(urunler)
        .where(and(like(urunler.ad, `Deneme ${ek} %`)));
      for (const { kimlik } of hepsi)
        await servis.urunSil(vt, yapan, kimlik).catch(() => undefined);
    },
  };
};

const urunEkrani = (kimlik: string) => `/yonetim/urunler/urun?kimlik=${kimlik}`;
const yanaKayma = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("mağaza sahibi ürün ekranından ve listenin satır menüsünden klavyeyle kopyalar", async ({
  page,
}) => {
  const deneme = await urunAc();
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    const hatalar = konsoluDinle(page, { haric: (ileti) => ileti.includes("status of 404") });
    await paneleGir(page, yonetici);
    await page.goto(urunEkrani(deneme.urun));
    await sayfaHazir(page);

    // Kaydedilmemiş değişiklik: pencere uyarır, kopya onu taşımaz (bağımsız kontrolün bulgusu).
    await page.getByRole("textbox", { name: /Kısa açıklama/ }).fill("Kaydedilmemiş yazı");
    await page.getByRole("button", { name: metin("yonetim.eylem.urunKopyala") }).focus();
    await page.keyboard.press("Enter");
    const pencere = page.getByRole("dialog", { name: metin("yonetim.urunKopyalama.baslik") });
    await expect(pencere.getByText(metin("yonetim.urunKopyalama.kaydedilmemis"))).toBeVisible();
    const ad = pencere.getByRole("textbox", {
      name: new RegExp(metin("yonetim.urunKopyalama.ad")),
    });
    await expect(ad).toHaveValue(`Deneme ${deneme.ek} Kazak (kopya)`);
    // Boş ad: alanın hatası, odak alanda.
    await ad.fill("");
    await ad.press("Enter");
    await expect(pencere.getByText(metin("yonetim.urunKopyalama.hata.ad"))).toBeVisible();
    await expect(ad).toBeFocused();
    await page.keyboard.type(`Deneme ${deneme.ek} Kazak ikinci`);
    await page.keyboard.press("Enter");

    // Kopyanın ürün ekranı: taslak bilgisi, adı, stok kodu boş.
    await expect(page).toHaveURL(/kopya=1/);
    await sayfaHazir(page);
    await expect(page.getByText(metin("yonetim.urunKopyalama.acildi.baslik"))).toBeVisible();
    await expect(
      page.getByRole("heading", { name: `Deneme ${deneme.ek} Kazak ikinci`, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Kısa açıklama/ })).toHaveValue("");
    const kopya = new URL(page.url()).searchParams.get("kimlik") ?? "";
    const okunan = await calisanSiteninUrunServisi().urunuOku(vt, kopya);
    expect(okunan).toMatchObject({ durum: "taslak", ad: `Deneme ${deneme.ek} Kazak ikinci` });
    expect(okunan?.birimler[0]?.stokKodu).toBeUndefined();

    // Listenin satır menüsünden: menü klavyeyle açılır, "Kopyala" Enter ile seçilir.
    await page.goto(`/yonetim/urunler?ara=${deneme.ek}&sirala=ad-artan`);
    await sayfaHazir(page);
    const menu = page
      .getByRole("table", { name: metin("yonetim.urunler.liste") })
      .getByRole("button", { name: `Diğer işlemler: Deneme ${deneme.ek} Kazak`, exact: true });
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("menuitem", { name: metin("yonetim.eylem.urunKopyala") }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(pencere).toBeVisible();
    await expect(ad).toHaveValue(`Deneme ${deneme.ek} Kazak (kopya)`);
    await ad.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/kopya=1/);
    await sayfaHazir(page);
    expect(
      await vt
        .select({ kimlik: urunler.kimlik })
        .from(urunler)
        .where(eq(urunler.ad, `Deneme ${deneme.ek} Kazak (kopya)`)),
    ).toHaveLength(1);
    expect(hatalar).toEqual([]);
  } finally {
    await deneme.sil();
  }
});

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

for (const renk of ["light", "dark"] as const) {
  for (const { ad, width, height } of genislikler) {
    test(`${renk} ${ad}: pencere (hatalı da) ve kopyanın ekranı taramadan geçer, yana kaymaz`, async ({
      page,
    }) => {
      const deneme = await urunAc();
      try {
        const hatalar = konsoluDinle(page, { haric: (ileti) => ileti.includes("status of 404") });
        await page.emulateMedia({ colorScheme: renk });
        await page.setViewportSize({ width, height });
        await paneleGir(page, yonetici);
        await page.goto(urunEkrani(deneme.urun));
        await sayfaHazir(page);
        await page.getByRole("button", { name: metin("yonetim.eylem.urunKopyala") }).click();
        const pencere = page.getByRole("dialog", { name: metin("yonetim.urunKopyalama.baslik") });
        await expect(pencere).toBeVisible();
        await tara(page, "kopyalama penceresi");
        await pencere.getByRole("textbox").fill("");
        await pencere.getByRole("button", { name: metin("yonetim.urunKopyalama.kopyala") }).click();
        await expect(pencere.getByText(metin("yonetim.urunKopyalama.hata.ad"))).toBeVisible();
        await tara(page, "hatalı pencere");
        expect(await yanaKayma(page)).toBe(0);
        await pencere.getByRole("textbox").fill(`Deneme ${deneme.ek} Kazak (kopya)`);
        await pencere.getByRole("button", { name: metin("yonetim.urunKopyalama.kopyala") }).click();
        await expect(page).toHaveURL(/kopya=1/);
        await sayfaHazir(page);
        await expect(page.getByText(metin("yonetim.urunKopyalama.acildi.baslik"))).toBeVisible();
        await tara(page, "kopyanın ürün ekranı");
        expect(await yanaKayma(page)).toBe(0);
        expect(hatalar).toEqual([]);
      } finally {
        await deneme.sil();
      }
    });
  }
}
