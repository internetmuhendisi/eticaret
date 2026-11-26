// Panelin Vergi ekranı gerçek tarayıcıda (kart 0322):
// - Mağaza sahibi menüden klavyeyle "Vergi"ye gelir; ekran iki renkte ve üç genişlikte taramadan geçer, yana kaymaz.
// - Klavyeyle sınıf ekler: boş adda alanın hatası ve odak, adla kayıt; pencere sınıfın oranlarına geçer. Oran eklenir:
//   okunamayan oranda alanın hatası ve odak, "7,5" ile kayıt, oran tablosunda oranın yazılışı. Pencere ve hatalı form taranır.
// - Vitrinde fiyat yeni ayarla görünür: testin ürünü yeni sınıftadır; fiyatın gösterimi klavyeyle değiştirilip
//   kaydedilince ürün sayfası fiyatı vergi hesabıyla çevrilmiş ve yanındaki metni yeni gösterimle yazar.
// Fiyatın gösterimi bütün vitrini değiştirir: test öteki tarayıcı testlerinden ve tema testinden sonra kendi aşamasında
// çalışır (playwright.config.ts, "vitrin-ayari") ve sonunda ayarları, sınıfı ve ürünü geri alır.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { bicim, metin } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { vergiAyarlariniDegistir, vergiAyarlariniOku } from "../../moduller/vergi/ayarlar";
import { siteninVergiServisi } from "../../moduller/vergi/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-vergi");
const vergi = () => siteninVergiServisi(calisanSite());
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
const ek = randomUUID().slice(0, 8);
const sinifAdi = `Deneme sınıfı ${ek}`;
const temizlik: (() => Promise<unknown>)[] = [];

test.afterAll(async () => {
  for (const is of temizlik.reverse()) await is();
  // Yarıda kalan çalışmanın sınıfları da silinir.
  for (const sinif of await vergi().tabloyuOku(vt)) {
    if (sinif.ad.startsWith("Deneme sınıfı ")) await vergi().sinifSil(vt, yapan, sinif.kimlik);
  }
  await vt.$client.end();
});

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.width}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${ne} ${renk} ${boyut.width} yana kaymaz`,
      ).toBe(true);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

test("vergi ekranı: klavyeyle sınıf ve oran, hata ve odak, vitrinde fiyatın yeni gösterimi", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const hatalar = konsoluDinle(page, {
    // Boş ad ve okunamayan oran bilerek gönderilir: uç 400 döner.
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  const site = calisanSite();
  const ilkAyarlar = await vergiAyarlariniOku(vt, site);
  temizlik.push(() => vergiAyarlariniDegistir(vt, site, yapan, ilkAyarlar));

  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  const menu = page
    .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
    .getByRole("link", { name: metin("yonetim.sayfa.vergi.ad") });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/vergi$/);
  await sayfaHazir(page);
  await expect(page).toHaveTitle(new RegExp(`^${metin("yonetim.sayfa.vergi.ad")} \\|`));
  await ikiRenkUcGenislik(page, "vergi ekranı");

  // Sınıf ekleme: boş adda alanın hatası ve odak.
  const ekle = page
    .getByRole("button", {
      name: doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.vergi.sinifTek") }),
    })
    .first();
  await ekle.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog");
  const ad = pencere.getByLabel(metin("yonetim.vergi.sinifForm.ad"));
  await expect(ad).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(ad).toHaveAttribute("aria-invalid", "true");
  await expect(ad).toBeFocused();
  await tara(page, "sınıf formu hatalı");
  await ad.fill(sinifAdi);
  await page.keyboard.press("Enter");
  // Pencere yeni sınıfın oranlarına geçer.
  await expect(
    pencere.getByRole("heading", { name: metin("yonetim.vergi.oranlar") }),
  ).toBeVisible();
  const sinif = (await vergi().tabloyuOku(vt)).find((s) => s.ad === sinifAdi);
  expect(sinif, "sınıf kaydedildi").toBeDefined();

  // Oran ekleme: pencere yeni sınıfa geçince odak "Oran ekle"dedir; okunamayan oranda alanın hatası ve odak,
  // sonra "7,5"; kayıttan sonra odak yine "Oran ekle"ye döner.
  const oranEkle = pencere.getByRole("button", { name: metin("yonetim.vergi.oranEkle") });
  await expect(oranEkle).toBeFocused();
  await page.keyboard.press("Enter");
  const oran = pencere.getByRole("textbox", {
    name: new RegExp(`^${metin("yonetim.vergi.oranForm.oran")}\\b`),
  });
  await oran.focus();
  await page.keyboard.type("yedi");
  await page.keyboard.press("Enter");
  await expect(oran).toHaveAttribute("aria-invalid", "true");
  await expect(oran).toBeFocused();
  await expect(pencere).toContainText(metin("yonetim.vergi.hata.oran-bicimi"));
  await tara(page, "oran formu hatalı");
  await oran.fill("7,5");
  await page.keyboard.press("Enter");
  const satir = pencere.getByRole("table", { name: metin("yonetim.vergi.oranTablosu") });
  await expect(satir).toContainText(`${bicim().sayi(7.5, 1)}`);
  await expect(oranEkle).toBeFocused();
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `sınıf penceresi ${renk} ${boyut.width}`);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.keyboard.press("Escape");
  await expect(pencere).toHaveCount(0);

  // Testin ürünü yeni sınıfta, 100,00 (en küçük birimde 10000).
  const urunServisi = calisanSiteninUrunServisi();
  const urun = await urunServisi.urunEkle(vt, yapan, {
    ad: `Vergi deneme ${ek}`,
    adresAdi: `vergi-deneme-${ek}`,
    vergiSinifi: sinif?.kimlik ?? null,
    durum: "yayinda",
  });
  temizlik.push(() => urunServisi.urunSil(vt, yapan, urun));
  const birim = (await urunServisi.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 10_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 5,
    gorulenMiktar: 0,
    sebep: "sayim",
  });

  // Gösterim girişin tersine çevrilir: vitrin fiyatı vergi hesabıyla çevirir (yarım kuruş yukarı).
  const giris = ilkAyarlar.fiyatGirisi;
  const yeniGosterim = giris === "vergi-dahil" ? "vergi-haric" : "vergi-dahil";
  const beklenen = giris === "vergi-dahil" ? Math.round((10_000 * 1_000_000) / 1_075_000) : 10_750;
  // Ek metin vergi adından kurulsun: ad yoksa genel metin.
  const gosterim = page.getByRole("radiogroup", { name: metin("yonetim.vergi.fiyatGosterimi") });
  const secenek = gosterim.getByRole("radio", {
    name: metin(`yonetim.vergi.fiyatGirisiDeger.${yeniGosterim}`),
  });
  await gosterim.getByRole("radio", { checked: true }).focus();
  // Gösterim zaten girişin tersiyse seçili kalır, yalnız ek metin otomatiğe alınır.
  if (ilkAyarlar.fiyatGosterimi !== yeniGosterim) {
    // Radix seçimi tuş bırakılmadan yapar: tuş kısa süre basılı tutulur (kart 0214).
    await page.keyboard.press(yeniGosterim === "vergi-haric" ? "ArrowDown" : "ArrowUp", {
      delay: 50,
    });
  }
  await expect(secenek).toBeChecked();
  // "Vergi adından (…)" seçeneği: örnek kısmı bugünkü ayardan kurulur, adın başıyla bulunur.
  const otomatikBasi = metin("yonetim.vergi.fiyatEkMetniTuru.otomatik").split("(")[0]?.trim() ?? "";
  const otomatik = page.getByRole("radio", { name: new RegExp(`^${otomatikBasi}`) });
  const ekGrubu = page.getByRole("radiogroup", { name: metin("yonetim.vergi.fiyatEkMetni") });
  await ekGrubu.getByRole("radio", { checked: true }).focus();
  for (let adim = 0; adim < 3 && !(await otomatik.isChecked()); adim += 1) {
    await page.keyboard.press("ArrowUp", { delay: 50 });
  }
  await expect(otomatik).toBeChecked();
  // Vergi adı her çalışmada değişir: kayıt gerçekten gider, vitrindeki metin yeni adla ölçülür.
  const yeniAd = `Deneme Vergisi ${ek}`;
  const adAlani = page.getByRole("textbox", {
    name: new RegExp(`^${metin("yonetim.vergi.vergiAdi")}`),
  });
  await adAlani.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(yeniAd);
  const kaydet = page.getByRole("button", { name: metin("yonetim.vergi.kaydet") });
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.vergi.kaydedildi")).first()).toBeVisible();
  expect((await siteninServisi(site).oku(vt)).vergiAdi).toBe(yeniAd);
  expect((await siteninServisi(site).oku(vt)).fiyatGosterimi).toBe(yeniGosterim);

  const vitrin = await context.newPage();
  await vitrin.goto(kayitAdresleri.urun(`vergi-deneme-${ek}`));
  await sayfaHazir(vitrin);
  const ayar = await vergiAyarlariniOku(vt, site);
  const dahil = yeniGosterim === "vergi-dahil";
  const ekMetin =
    ayar.vergiAdi === ""
      ? metin(dahil ? "vitrin.fiyat.vergilerDahil" : "vitrin.fiyat.vergilerHaric")
      : doldur(metin(dahil ? "vitrin.fiyat.vergiDahil" : "vitrin.fiyat.vergiHaric"), {
          vergi: ayar.vergiAdi,
        });
  await expect(vitrin.getByRole("main")).toContainText(bicim().para(beklenen));
  await expect(vitrin.getByRole("main")).toContainText(ekMetin);
  await vitrin.close();

  expect(hatalar).toEqual([]);
});
