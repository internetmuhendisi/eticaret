// Kategori sayfasının filtreli ürün listesi gerçek tarayıcıda (kart 0136, karar 0102). Test kendi kategorisini,
// ürünlerini ve filtrede kullanılan özelliğini açar, sonunda siler (testler veritabanını paylaşır):
// - Sayfa iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; telefonda filtre yan penceresi açıkken de.
// - Filtre klavyeyle kullanılır: onay kutusu boşlukla seçilir, adres değişir, liste daralır, seçili filtre
//   kaldırılabilir; fiyat Enter'la uygulanır; "1.000" ile "1000" aynı sonucu verir; bozuk tutar alanın altında
//   hatayla gösterilir; sıralama klavyeyle değişir. Filtreli sayfa arama motorlarına kapalıdır.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { katalogAdresi } from "../../katalog/kayit";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { kategoriEkle, kategoriSil } from "../../moduller/kategori/servis";
import { ozellikServisi } from "../../moduller/ozellik/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { siteninUrunServisi } from "../../moduller/urun/servis";
import { secenekleriOku } from "../../moduller/urun/varyant";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { sayfaHazir } from "./sayfa-hazir";

if (existsSync(".env")) process.loadEnvFile(".env");

const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

// Tarama sonlu animasyonların ve renk geçişlerinin bitmesini bekler (katalog.test.ts ile aynı). Üstteki şeritte
// açılan grubun düğmesi 150 ms'lik geçişle renk değiştirir; geçişin ortasında zemin yarı saydam, yazı gridir
// (ölçüldü) ve tarama o ana denk gelirse kontrastı düşük bulur (bir kez kırmızı oldu).
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

type Hazirlik = {
  adres: string;
  adlar: { tisort: string; gomlek: string; canta: string };
  temizle: () => Promise<void>;
};

// Kategori: Tişört (M ve S, 300,00 ve 1.000,00; M stokta), Gömlek (L, 1.500,00), Çanta (basit, 99,90).
// Kumaş filtrede: Tişört pamuk, Gömlek keten.
const hazirla = async (): Promise<Hazirlik> => {
  const vt: Veritabani = baglan(veritabaniAdresi());
  const site = calisanSite();
  const urunler = siteninUrunServisi(site);
  const fiyat = siteninFiyatServisi(site);
  const stok = stokServisi();
  const ek = randomUUID().slice(0, 8);
  const temizlik: (() => Promise<unknown>)[] = [];
  const temizle = async () => {
    for (const adim of temizlik.reverse()) await adim();
    await vt.$client.end();
  };
  try {
    const kategori = await kategoriEkle(vt, yapan, {
      ad: `Liste ${ek}`,
      adresAdi: `liste-${ek}`,
    });
    temizlik.push(() => kategoriSil(vt, yapan, kategori));
    const kumas = await ozellikServisi.ekle(vt, yapan, {
      ad: `Dokuma ${ek}`,
      tur: "liste",
      filtrede: true,
      secenekler: ["Pamuk", "Keten"],
    });
    temizlik.push(() => ozellikServisi.sil(vt, yapan, kumas));
    const [pamuk, keten] = ((await ozellikServisi.oku(kumas, vt))?.secenekler ?? []).map(
      (s) => s.kimlik,
    );
    const birimYaz = async (birim: string, satis: number, miktar: number) => {
      await fiyat.fiyatYaz(vt, yapan, birim, { satisFiyati: satis });
      if (miktar > 0) {
        await stok.stokDuzelt(vt, yapan, birim, {
          yeniMiktar: miktar,
          gorulenMiktar: 0,
          sebep: "sayim",
        });
      }
    };
    const urunAc = async (ad: string, ozellik?: string) => {
      const urun = await urunler.urunEkle(vt, yapan, {
        ad,
        adresAdi: `${ad.toLowerCase()}-${ek}`,
        vergiSinifi: null,
        durum: "yayinda",
        kategoriler: [kategori],
        ...(ozellik === undefined ? {} : { ozellikler: [{ ozellik: kumas, deger: ozellik }] }),
      });
      temizlik.push(() => urunler.urunSil(vt, yapan, urun));
      return urun;
    };
    const bedenli = async (urun: string, bedenler: [string, number, number][]) => {
      await urunler.secenekEkle(vt, yapan, urun, {
        ad: "Beden",
        degerler: bedenler.map(([b]) => b),
      });
      const [secenek] = (await secenekleriOku(vt, [urun], { silinmisler: false })).get(urun) ?? [];
      for (const [beden, satis, miktar] of bedenler) {
        const deger = secenek?.degerler.find((d) => d.ad === beden)?.kimlik ?? "";
        await birimYaz(
          await urunler.birlesimEkle(vt, yapan, urun, { degerler: [deger] }),
          satis,
          miktar,
        );
      }
    };
    const adlar = { tisort: `Tisort${ek}`, gomlek: `Gomlek${ek}`, canta: `Canta${ek}` };
    await bedenli(await urunAc(adlar.tisort, pamuk), [
      ["M", 30_000, 2],
      ["S", 100_000, 0],
    ]);
    await bedenli(await urunAc(adlar.gomlek, keten), [["L", 150_000, 1]]);
    const canta = await urunAc(adlar.canta);
    const birim = (await urunler.urunuOku(vt, canta))?.birimler[0]?.kimlik ?? "";
    await birimYaz(birim, 9_990, 3);
    return { adres: kayitAdresleri.kategori(`liste-${ek}`), adlar, temizle };
  } catch (hata) {
    await temizle();
    throw hata;
  }
};

const kartAdlari = async (page: Page) =>
  (
    await page
      .getByRole("list", { name: metin("vitrin.liste.urunler") })
      .getByRole("heading")
      .allTextContents()
  ).toSorted();

test("iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; telefonda filtre penceresi açıkken de", async ({
  page,
}) => {
  const h = await hazirla();
  try {
    for (const renk of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: renk });
      for (const genislik of genislikler) {
        await page.setViewportSize(genislik);
        const ne = `${renk}, ${genislik.width}`;
        const yanit = await page.goto(`${h.adres}?secenek-beden=m`);
        await sayfaHazir(page);
        expect(yanit?.status(), ne).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toContainText("Liste");
        await expect.poll(() => kartAdlari(page), ne).toEqual([h.adlar.tisort]);
        await yanaKaymaz(page, ne);
        await tara(page, ne);
        if (genislik.width < 1024) {
          await page.getByRole("button", { name: /Filtrele/ }).click();
          const pencere = page.getByRole("dialog");
          await expect(pencere).toBeVisible();
          await expect(
            pencere.getByRole("button", {
              name: doldur(metin("vitrin.liste.sonuclariGoster"), { sayi: "1" }),
            }),
          ).toBeVisible();
          await tara(page, `${ne}, pencere`);
          await page.keyboard.press("Escape");
          await expect(pencere).toHaveCount(0);
        }
      }
    }
  } finally {
    await h.temizle();
  }
});

test("filtre klavyeyle kullanılır; adres değişir; 1.000 ile 1000 aynı; bozuk tutar hata; sıralama klavyeyle", async ({
  page,
}) => {
  const h = await hazirla();
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(h.adres);
    await sayfaHazir(page);
    await expect
      .poll(() => kartAdlari(page))
      .toEqual([h.adlar.tisort, h.adlar.gomlek, h.adlar.canta].toSorted());
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    // Onay kutusu: odaklanıp boşlukla seçilir.
    // Tab'la ilerlenir: sıralamanın ve filtrelerin sırası sayfanın sırasıdır.
    const keten = page.getByRole("checkbox", { name: /^Keten/ });
    await page.getByRole("checkbox", { name: /^Pamuk/ }).focus();
    await page.keyboard.press("Tab");
    await expect(keten).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/ozellik-dokuma-[a-z0-9]+=keten/);
    await sayfaHazir(page);
    await expect.poll(() => kartAdlari(page)).toEqual([h.adlar.gomlek]);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // Seçili filtre etiketi kaldırır.
    await page
      .getByRole("list", { name: metin("vitrin.liste.seciliFiltreler") })
      .getByRole("link")
      .first()
      .click();
    await expect(page).not.toHaveURL(/ozellik-/);
    await sayfaHazir(page);
    // Fiyat: Enter ile uygulanır; "1.000" ile "1000" aynı sonucu verir.
    for (const yazi of ["1.000", "1000"]) {
      await page.goto(h.adres);
      await sayfaHazir(page);
      const enAz = page.getByRole("textbox", { name: metin("vitrin.liste.enAz") });
      await enAz.fill(yazi);
      await enAz.press("Enter");
      await expect(page).toHaveURL(
        new RegExp(`en-az=${encodeURIComponent(yazi).replaceAll(".", "\\.")}`),
      );
      await sayfaHazir(page);
      // Tişört'ün 1.000,00'lik bedeni tükenmiş: kartta görünen fiyatı satılabilir bedenin 300,00'üdür. İki
      // yazılış da aynı sonucu verir.
      await expect.poll(() => kartAdlari(page), yazi).toEqual([h.adlar.gomlek]);
    }
    // Bozuk tutar: filtreye girmez, alanın altında hata.
    await page.goto(`${h.adres}?en-az=1.5`);
    await sayfaHazir(page);
    const alan = page.getByRole("textbox", { name: metin("vitrin.liste.enAz") });
    await expect(alan).toHaveAttribute("aria-invalid", "true");
    await expect(alan).toHaveAccessibleDescription(/Tutar okunamadı/);
    await expect.poll(() => kartAdlari(page)).toHaveLength(3);
    // Sıralama klavyeyle: fiyat artan.
    await page.goto(h.adres);
    await sayfaHazir(page);
    await page.getByRole("combobox", { name: metin("vitrin.liste.sirala") }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("option", { name: metin("vitrin.liste.siralama.fiyat-artan") }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/sirala=fiyat-artan/);
    await sayfaHazir(page);
    await expect(
      page.getByRole("list", { name: metin("vitrin.liste.urunler") }).getByRole("heading"),
    ).toHaveText([h.adlar.canta, h.adlar.tisort, h.adlar.gomlek]);
  } finally {
    await h.temizle();
  }
});

test("telefonda filtre penceresi klavyeyle açılır, adı vardır, içinde seçilir, sonuç düğmesiyle kapanır", async ({
  page,
}) => {
  const h = await hazirla();
  try {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(h.adres);
    await sayfaHazir(page);
    const dugme = page.getByRole("button", { name: metin("vitrin.liste.filtrele") });
    await dugme.focus();
    await page.keyboard.press("Enter");
    const pencere = page.getByRole("dialog", { name: metin("vitrin.liste.filtrele") });
    await expect(pencere).toBeVisible();
    // Odak pencerenin içindedir; Tab'la "M" bedenine gidilir, boşlukla seçilir.
    const m = pencere.getByRole("checkbox", { name: /^M / });
    for (let i = 0; i < 20; i += 1) {
      if (await m.evaluate((oge) => oge === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(m).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/secenek-beden=m/);
    await expect(pencere).toBeVisible();
    const goster = pencere.getByRole("button", {
      name: doldur(metin("vitrin.liste.sonuclariGoster"), { sayi: "1" }),
    });
    await expect(goster).toBeVisible();
    await goster.focus();
    await page.keyboard.press("Enter");
    await expect(pencere).toHaveCount(0);
    await expect.poll(() => kartAdlari(page)).toEqual([h.adlar.tisort]);
  } finally {
    await h.temizle();
  }
});

// Katalogdaki ürün listesi sayfası iki filtre yerini örnek veriyle gösterir: üstteki şerit bugün hiçbir hazır
// temada seçili değildir, taraması ve klavyesi burada ölçülür.
test("katalogda iki filtre yeri iki renkte ve üç genişlikte taramadan geçer; üstteki şerit klavyeyle açılır", async ({
  page,
}) => {
  const adres = `${katalogAdresi}/urun-listesi`;
  for (const renk of ["acik", "koyu"] as const) {
    for (const genislik of genislikler) {
      await page.setViewportSize(genislik);
      const ne = `${renk}, ${genislik.width}`;
      const yanit = await page.goto(`${adres}?renk=${renk}`);
      await sayfaHazir(page);
      expect(yanit?.status(), ne).toBe(200);
      for (const yer of ["solda", "ustte"] as const) {
        await expect(
          page.getByRole("region", { name: metin(`gelistirme.urunListesi.yer.${yer}`) }),
        ).toBeVisible();
      }
      await yanaKaymaz(page, ne);
      await tara(page, ne);
    }
  }
  // Üstteki şerit: masaüstünde grup düğmesi Enter ile paneli açar, Tab panele girer, boşluk seçer.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(adres);
  await sayfaHazir(page);
  const ustte = page.getByRole("region", { name: metin("gelistirme.urunListesi.yer.ustte") });
  const beden = ustte.getByRole("button", { name: metin("gelistirme.urunListesi.beden") });
  await beden.focus();
  await page.keyboard.press("Enter");
  await expect(beden).toHaveAttribute("aria-expanded", "true");
  const panel = ustte.getByRole("group", { name: metin("gelistirme.urunListesi.beden") });
  await expect(panel).toBeVisible();
  await tara(page, "üstteki panel açık");
  const s = panel.getByRole("checkbox", { name: /^S / });
  for (let i = 0; i < 10; i += 1) {
    if (await s.evaluate((oge) => oge === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(s).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/secenek-beden=s/);
});
