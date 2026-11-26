// Panelin kupon ekranları tarayıcıda (kart 0313, karar 0188):
// - Mağaza sahibi menüden klavyeyle Kuponlar'a gelir; liste iki renkte ve üç genişlikte taramadan geçer.
// - "Kupon ekle": kodu boş bırakıp kaydedince alanın hatası ve odak koddadır; form (hatalı da) taranır.
// - Kupon klavyeyle açılır (yüzde 10, en az sepet tutarı, kişi başı 1); kuponun sayfası açılır, özeti ve boş
//   kullanım listesi görünür, sayfa taranır. Kupon vitrinde sepette kullanılır.
// - "Kapat" ile kapanan kupon listede "Kapalı" sekmesindedir ve sepette bulunamaz; "Aç" yeniden açar.
// - "Düzenle": toplam sınır değişir, kuponun sayfasında görünür.
// - Konsolda hata yok (bilerek gönderilen hatalı formun 400'ü dışında).
//
// Testin kuponları "KP<ek>" ile başlar, sonunda silinmiş işaretlenir; ürünü silinir.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { like, sql } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { sepetDepoAnahtari } from "../../kayitlar/sepet";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { kuponlar } from "../../moduller/kampanya/model";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../../vitrin/adresler";
import { kuponlarAdresi } from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = sistemIslemi("tarayici-testi");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
const ek = randomBytes(3).toString("hex").toUpperCase();
const kod = `KP${ek}`;
let vt: Veritabani;
let birim = "";
const temizlik: (() => Promise<unknown>)[] = [];

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const servis = calisanSiteninUrunServisi();
  const urun = await servis.urunEkle(vt, yapan, {
    ad: `Kupon ekranı ${ek}`,
    adresAdi: `kupon-ekrani-${ek.toLowerCase()}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  temizlik.push(() => servis.urunSil(vt, yapan, urun));
  birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 20_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 10,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  temizlik.push(() =>
    vt
      .update(kuponlar)
      .set({ silinme_zamani: sql`now()` })
      .where(like(kuponlar.kod, `KP${ek}%`)),
  );
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim().catch(() => undefined);
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

const alan = (page: Page, ad: string) => page.getByRole("textbox", { name: new RegExp(`^${ad}`) });

// Klavyeyle yazar: alana odaklanır, içini seçip yazar.
const yaz = async (page: Page, ad: string, deger: string) => {
  await alan(page, ad).focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(deger);
};

// Sepette kodu yazar ve kupon kutusunun sonucunu döner (ayrı sekmede, panelin oturumuna dokunmaz).
const sepetteDene = async (page: Page, kupon: string) => {
  const sekme = await page.context().newPage();
  await sekme.addInitScript(
    ([anahtar, kalemler]) => window.localStorage.setItem(anahtar, kalemler),
    [sepetDepoAnahtari, JSON.stringify([{ birim, adet: 3 }])] as const,
  );
  await sekme.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::${randomBytes(1).toString("hex")}`,
  });
  await sekme.goto(vitrinAdresleri.sepet);
  await sayfaHazir(sekme);
  const kutu = sekme.getByLabel(metin("vitrin.sepet.kupon.alan"), { exact: true });
  await kutu.focus();
  await sekme.keyboard.type(kupon);
  await sekme.keyboard.press("Enter");
  return sekme;
};

test("kuponlar: mağaza sahibi klavyeyle açar, sepette kullanılır, kapatır, açar ve düzenler; tarama", async ({
  page,
}) => {
  test.setTimeout(360_000);
  const konsol = konsoluDinle(page, {
    haric: (ileti) => ileti.includes("status of 400") || ileti.includes("401"),
  });
  const bicim = siteninBicimleyicisi(calisanSite().ayarlar);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());

  const menu = page.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
  await menu.getByRole("link", { name: metin("yonetim.sayfa.kuponlar.ad"), exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${kuponlarAdresi}$`));
  await sayfaHazir(page);
  await ikiRenkUcGenislik(page, "kupon listesi");

  // Kupon ekle: kodu boş kaydedince alanın hatası ve odak.
  await page
    .getByRole("link", { name: metin("yonetim.eylem.kuponEkle") })
    .first()
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${kuponlarAdresi}/yeni$`));
  await sayfaHazir(page);
  await ikiRenkUcGenislik(page, "yeni kupon");
  await yaz(page, metin("yonetim.kupon.deger"), "10");
  const ekle = page.getByRole("button", { name: metin("yonetim.kupon.ekle"), exact: true });
  await ekle.focus();
  await page.keyboard.press("Enter");
  const kodAlani = alan(page, metin("yonetim.kupon.kod"));
  await expect(kodAlani).toBeFocused();
  await expect(kodAlani).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(metin("yonetim.kupon.hata.kod-gecersiz"))).toBeVisible();
  await ikiRenkUcGenislik(page, "hatalı kupon formu");

  // Kupon klavyeyle açılır.
  await kodAlani.focus();
  await page.keyboard.type(kod);
  await yaz(page, metin("yonetim.kupon.enAzTutar"), bicim.paraYazisi(10_000));
  await yaz(page, metin("yonetim.kupon.kisiBasiSinir"), "1");
  await ekle.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/kuponlar\/kupon\?kimlik=/);
  await sayfaHazir(page);
  await expect(page.getByRole("heading", { level: 1, name: kod })).toBeVisible();
  await expect(page.getByText(metin("yonetim.kupon.kullanimlar.bos"))).toBeVisible();
  const kuponSayfasi = page.url();
  await ikiRenkUcGenislik(page, "kuponun sayfası");

  // Vitrinde sepette kullanılır: 3 × 200,00 = 600,00; yüzde 10.
  let sepet = await sepetteDene(page, kod.toLowerCase());
  await expect(
    sepet.getByText(doldur(metin("vitrin.sepet.kupon.uygulandi"), { kod })),
  ).toBeVisible();
  await expect(
    sepet.getByText(doldur(metin("vitrin.sepet.kupon.indirim"), { tutar: bicim.para(6_000) })),
  ).toBeVisible();
  await sepet.close();

  // Kapat: liste "Kapalı" sekmesinde; sepette bulunamaz. Aç: yeniden açık.
  await page.getByRole("button", { name: metin("yonetim.eylem.kuponKapat") }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: metin("yonetim.eylem.kuponAc") })).toBeVisible();
  sepet = await sepetteDene(page, kod);
  await expect(
    sepet.getByText(doldur(metin("vitrin.sepet.kupon.neden.bulunamadi"), { kod })),
  ).toBeVisible();
  await sepet.close();
  await page.goto(`${kuponlarAdresi}?durum=kapali`);
  await sayfaHazir(page);
  await expect(page.getByRole("link", { name: kod, exact: true }).first()).toBeVisible();
  await page.goto(kuponSayfasi);
  await sayfaHazir(page);
  await page.getByRole("button", { name: metin("yonetim.eylem.kuponAc") }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: metin("yonetim.eylem.kuponKapat") })).toBeVisible();

  // Düzenle: toplam sınır.
  await page.getByRole("link", { name: metin("yonetim.eylem.duzenle") }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/kuponlar\/duzenle\?kimlik=/);
  await sayfaHazir(page);
  await yaz(page, metin("yonetim.kupon.toplamSinir"), "25");
  await page.getByRole("button", { name: metin("yonetim.kupon.kaydet"), exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/kuponlar\/kupon\?kimlik=/);
  await expect(
    page.getByText(doldur(metin("yonetim.kupon.ozet.kalan"), { sayi: "25" })),
  ).toBeVisible();
  expect(konsol).toEqual([]);
});
