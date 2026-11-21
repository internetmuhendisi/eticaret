// Ürün ekranının fiyat ve stok bölümleri gerçek tarayıcıda ve gerçek veritabanıyla (kart 0265): mağaza sahibi basit
// ürünün satış ve indirimli fiyatını klavyeyle yazıp kaydeder, fiyat sitenin biçimiyle okunur, "Vitrinde şu an" kutusu
// ve vitrindeki ürün sayfası yeni fiyatı gösterir, fiyat geçmişinde yazan görünür. Okunamayan tutar alanın hatasıdır,
// odak alanda. "Stoğu düzelt" penceresi klavyeyle açılır, yeni miktar sebebiyle hemen kaydedilir, stok geçmişine
// girer, pencere kapanınca odak düğmeye döner; ekranın gördüğü miktar arada değiştiyse pencerede çakışma yazar ve
// stok değişmez. Seçenekli üründe birleşim tablosunun stoğu ortak sebep ve notla kaydedilir; "Diğer"de not
// zorunludur. Ekran ve pencere iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yoktur.
//
// Ürünler sitenin paylaşılan verisidir: test kendi ürününü ("Deneme <6 onaltılık> …") açar ve sonunda siler.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { urunEkraniAdresi } from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

test.beforeEach(({ page }) => ayriBaglanti(page));
test.afterAll(async () => {
  await vt.$client.end();
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

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.ad}`);
      expect(await yanaKayma(page), `${ne} ${renk} ${boyut.ad}`).toBeLessThanOrEqual(0);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

// Hatalı formun yanıtı (doğrulama ya da çakışma) tarayıcının konsoluna yazılır; beklenen hatadır.
const beklenenHata = (ileti: string) =>
  ileti.includes("status of 409") || ileti.includes("status of 400");

const bas = async (page: Page, oge: Locator) => {
  await oge.focus();
  await page.keyboard.press("Enter");
};
const yaz = async (page: Page, alan: Locator, deger: string) => {
  await alan.focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(deger);
};

const bicim = () => siteninBicimleyicisi(calisanSite().ayarlar);
const tutar = (kurus: number) => bicim().sayi(kurus / 100, 2);

test("basit ürün: fiyat klavyeyle kaydedilir ve vitrinde görünür, stok pencereyle düzeltilir, çakışma söylenir", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const ek = randomBytes(3).toString("hex");
  const servis = calisanSiteninUrunServisi();
  const fiyat = siteninFiyatServisi(calisanSite());
  const stok = stokServisi();
  const temizlik: (() => Promise<unknown>)[] = [];
  const konsol = konsoluDinle(page, { haric: beklenenHata });
  try {
    const ad = `Deneme ${ek} Termos`;
    const urun = await servis.urunEkle(vt, yapan, { ad, vergiSinifi: null, durum: "yayinda" });
    temizlik.push(() => servis.urunSil(vt, yapan, urun));
    const birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yapan, birim, { satisFiyati: 64990 });
    await stok.stokDuzelt(vt, yapan, birim, { yeniMiktar: 6, gorulenMiktar: 0, sebep: "sayim" });

    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());
    await page.goto(urunEkraniAdresi(urun));
    await sayfaHazir(page);
    const fiyatBolumu = page.locator("#urun-fiyat");
    const satis = fiyatBolumu.getByRole("textbox", {
      name: metin("yonetim.urunEkrani.fiyat.satis"),
    });
    const indirimli = fiyatBolumu.getByRole("textbox", {
      name: metin("yonetim.urunEkrani.fiyat.indirimli"),
    });
    await expect(satis).toHaveValue(tutar(64990));
    await expect(indirimli).toHaveValue("");
    const kaydet = page.getByRole("button", {
      name: metin("yonetim.urunEkrani.kaydet"),
      exact: true,
    });

    // Okunamayan tutar: alanın hatası, odak alanda, hiçbir şey yazılmaz.
    await yaz(page, satis, "on beş");
    await bas(page, kaydet);
    await expect(satis).toBeFocused();
    await expect(fiyatBolumu.getByText(metin("yonetim.urun.hata.tutar-okunamadi"))).toBeVisible();
    expect((await fiyat.fiyatOku(vt, birim))?.satisFiyati).toBe(64990);
    await ikiRenkUcGenislik(page, "hatalı fiyat");

    // Klavyeyle fiyat ve indirimli fiyat; kaydedilince "Vitrinde şu an" kutusu indirimli fiyatı gösterir.
    await yaz(page, satis, tutar(79990));
    await yaz(page, indirimli, tutar(59990));
    await bas(page, kaydet);
    await expect(page.getByText(metin("yonetim.urunEkrani.kaydedildi"))).toBeVisible();
    expect(await fiyat.fiyatOku(vt, birim)).toMatchObject({
      satisFiyati: 79990,
      indirimliFiyat: 59990,
    });
    await expect(fiyatBolumu.getByText(metin("yonetim.urunEkrani.fiyat.vitrinde"))).toBeVisible();
    await expect(fiyatBolumu.getByText(bicim().para(59990), { exact: true })).toBeVisible();
    // Fiyat geçmişi: yeni satır en üstte, yazan bu yönetici (e-postası).
    const fiyatGecmisi = page.locator("#urun-fiyat-gecmisi");
    await expect(fiyatGecmisi.getByRole("row").nth(1)).toContainText(bicim().para(79990));

    // Stok: "6 stokta"; pencere klavyeyle açılır, yeni miktar sebebiyle hemen kaydedilir.
    const stokBolumu = page.locator("#urun-stok");
    await expect(
      stokBolumu.getByText(doldur(metin("yonetim.urunEkrani.stok.durum"), { stok: "6" })),
    ).toBeVisible();
    const duzeltDugmesi = stokBolumu.getByRole("button", {
      name: metin("yonetim.urunEkrani.stok.duzelt"),
    });
    await bas(page, duzeltDugmesi);
    const pencere = page.getByRole("dialog");
    const miktar = pencere.getByRole("textbox", {
      name: metin("yonetim.urunEkrani.stok.yeniMiktar"),
    });
    await expect(miktar).toHaveValue("6");
    await ikiRenkUcGenislik(page, "stoğu düzelt penceresi");
    await yaz(page, miktar, "11");
    await page.keyboard.press("Enter");
    await expect(page.getByText(metin("yonetim.urunEkrani.stok.duzeltildi"))).toBeVisible();
    await expect(pencere).toBeHidden();
    await expect(duzeltDugmesi).toBeFocused();
    expect((await stok.stoklariOku(vt, [birim])).get(birim)?.miktar).toBe(11);
    await expect(
      stokBolumu.getByText(doldur(metin("yonetim.urunEkrani.stok.durum"), { stok: "11" })),
    ).toBeVisible();
    await expect(page.locator("#urun-stok-gecmisi").getByRole("row").nth(1)).toContainText(
      metin("yonetim.stok.sebep.sayim"),
    );

    // Çakışma: ekran 11'i görürken başka biri 4 yapar; pencerede çakışma yazar, stok değişmez.
    await stok.stokDuzelt(vt, yapan, birim, { yeniMiktar: 4, gorulenMiktar: 11, sebep: "sayim" });
    await bas(page, duzeltDugmesi);
    await yaz(
      page,
      pencere.getByRole("textbox", { name: metin("yonetim.urunEkrani.stok.yeniMiktar") }),
      "20",
    );
    await page.keyboard.press("Enter");
    await expect(pencere.getByText(metin("yonetim.stok.hata.stok-degisti"))).toBeVisible();
    expect((await stok.stoklariOku(vt, [birim])).get(birim)?.miktar).toBe(4);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: metin("yonetim.bolumler.form.birak") }).click();
    await expect(pencere).toBeHidden();

    await ikiRenkUcGenislik(page, "fiyat ve stok bölümleri");

    // Vitrinde ürünün sayfası yeni fiyatı gösterir.
    const adresAdi = (await servis.urunuOku(vt, urun))?.adresAdi ?? "";
    await page.goto(kayitAdresleri.urun(adresAdi));
    await sayfaHazir(page);
    await expect(page.getByText(bicim().para(59990)).first()).toBeVisible();
    expect(konsol).toEqual([]);
  } finally {
    for (const is of temizlik.reverse()) await is();
  }
});

test("seçenekli ürün: birleşimin stoğu ortak sebep ve notla kaydedilir, 'Diğer'de not zorunludur", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const ek = randomBytes(3).toString("hex");
  const servis = calisanSiteninUrunServisi();
  const stok = stokServisi();
  const temizlik: (() => Promise<unknown>)[] = [];
  const konsol = konsoluDinle(page, { haric: beklenenHata });
  try {
    const urun = await servis.urunEkle(vt, yapan, { ad: `Deneme ${ek} Tişört`, vergiSinifi: null });
    temizlik.push(() => servis.urunSil(vt, yapan, urun));
    await servis.varyantlariKaydet(
      vt,
      yapan,
      urun,
      { secenekler: [{ ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] }], birlesimler: [] },
      { silebilir: true },
    );
    const birimler = (await servis.urunuOku(vt, urun))?.birimler.filter((b) => !b.silindi) ?? [];
    const m = birimler[1]?.kimlik ?? "";

    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());
    await page.goto(urunEkraniAdresi(urun));
    await sayfaHazir(page);
    const bolum = page.locator("#urun-secenekler");
    const mStok = bolum.getByRole("textbox", {
      name: doldur(metin("yonetim.urunEkrani.secenek.hucre"), {
        alan: metin("yonetim.urunEkrani.secenek.sutun.stok"),
        birlesim: "M",
      }),
    });
    await yaz(page, mStok, "8");
    // "Diğer" klavyeyle seçilir: not alanı çıkar, boşsa kaydedilmez.
    const sebep = bolum.getByRole("combobox", { name: metin("yonetim.urunEkrani.stok.sebep") });
    await sebep.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("option", { name: metin("yonetim.stok.sebep.diger") }).focus();
    await page.keyboard.press("Enter");
    const not = bolum.getByRole("textbox", { name: metin("yonetim.urunEkrani.stok.not") });
    const kaydet = page.getByRole("button", {
      name: metin("yonetim.urunEkrani.kaydet"),
      exact: true,
    });
    await bas(page, kaydet);
    await expect(not).toBeFocused();
    expect((await stok.stoklariOku(vt, [m])).get(m)?.miktar ?? 0).toBe(0);
    await ikiRenkUcGenislik(page, "birleşim tablosu, not hatası");

    await page.keyboard.type("Depo sayımı");
    await bas(page, kaydet);
    await expect(page.getByText(metin("yonetim.urunEkrani.kaydedildi"))).toBeVisible();
    expect((await stok.stoklariOku(vt, [m])).get(m)?.miktar).toBe(8);
    const [satir] = await stok.panelStokGecmisi(vt, [m]);
    expect(satir).toMatchObject({ sebep: "diger", not: "Depo sayımı" });
    expect(konsol).toEqual([]);
  } finally {
    for (const is of temizlik.reverse()) await is();
  }
});
