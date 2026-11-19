// Panelden elle sipariş gerçek tarayıcıda (kart 0236, karar 0148; kart 0233'ün taslağı):
// - Mağaza sahibi Siparişler'den "Elle sipariş"e klavyeyle gelir. Boş gönderimde ürün, müşteri, ödeme ve metin hataları
//   görünür, odak ilk hataya (ürünler) gider; hatalı ekran taramadan geçer.
// - Ürün arayarak klavyeyle eklenir, adet artırılır; özet sunucunun hesabıyla toplamı yazar. Üye olmayan müşteri,
//   teslimat (il ve ilçe listeden), ödeme yöntemi ve "metinler iletildi" klavyeyle doldurulur; dolu ekran iki renkte ve
//   üç genişlikte taramadan geçer, yana kaymaz.
// - "Siparişi oluştur" ile sipariş kurulur, sipariş ayrıntısına gidilir: tutar özetteki gibi, geçmişte "Panelden
//   girildi", stok düşmüş.
// Siparişler sitenin paylaşılan verisidir: test kendi ürününü açar.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { siparisGecmisi } from "../../moduller/siparis/model";
import { siparisYonetimi } from "../../moduller/siparis/yonetim";
import { birimStoklari } from "../../moduller/stok/model";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { bildirimSuresiniDurdur } from "./bildirim-suresi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-elle-siparis");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
test.afterAll(async () => {
  await vt.$client.end();
});

const tara = async (page: Page, ne: string) => {
  await bildirimSuresiniDurdur(page);
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

const urunAc = async () => {
  const urunServisi = calisanSiteninUrunServisi();
  const ek = randomUUID().slice(0, 8);
  const ad = `Elle deneme ${ek}`;
  const urun = await urunServisi.urunEkle(vt, yapan, {
    ad,
    adresAdi: `elle-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await urunServisi.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 12_500 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 5,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  return { ad, birim };
};

const listedenSec = async (page: Page, etiket: string, deger: string, yazilan = deger) => {
  const tetikleyici = page.getByRole("combobox", { name: etiket, exact: true });
  await tetikleyici.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.type(yazilan);
  await expect(page.getByRole("option", { name: deger, exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tetikleyici).toContainText(deger);
};

// Radix radyo grubu seçimi tuş bırakılmadan yapar: ok tuşu 50 ms basılı tutulur (kart 0214).
const okla = async (page: Page) => {
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(50);
  await page.keyboard.up("ArrowDown");
};

test("panelden klavyeyle elle sipariş", async ({ page }) => {
  test.setTimeout(240_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const { ad, birim } = await urunAc();
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await page.goto("/yonetim/siparisler");
  await sayfaHazir(page);
  const elleBaglanti = page.getByRole("link", { name: metin("yonetim.eylem.elleSiparis") });
  await elleBaglanti.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/siparisler\/elle$/);
  await sayfaHazir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    metin("yonetim.sayfa.elleSiparis.ad"),
  );

  // Boş gönderim: hatalar ve odak ürünlerde.
  const olustur = page.getByRole("button", { name: metin("yonetim.elleSiparis.olustur") });
  await olustur.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.elleSiparis.hata.sepetBos"))).toBeVisible();
  await expect(page.getByText(metin("yonetim.elleSiparis.hata.metinler"))).toBeVisible();
  await expect(page.locator('[data-elle-alani="kalemler"]')).toBeFocused();
  await tara(page, "hatalı elle sipariş");

  // Ürün arayarak ekleme ve adet.
  const urunKutusu = page.getByRole("combobox", { name: metin("yonetim.elleSiparis.urunEkle") });
  await urunKutusu.focus();
  await page.keyboard.type(ad);
  await expect(page.getByRole("option", { name: new RegExp(ad) })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("cell", { name: ad, exact: true })).toBeVisible();
  const artir = page.getByRole("button", { name: doldur(metin("yonetim.iade.artir"), { ad }) });
  await artir.focus();
  await page.keyboard.press("Enter");
  const b = (await import("../../metinler/site-metni")).siteninBicimleyicisi(calisanSite().ayarlar);
  await expect(page.getByRole("cell", { name: b.para(25_000) })).toBeVisible();

  // Üye olmayan müşteri.
  await page.getByRole("radio", { name: metin("yonetim.elleSiparis.uye") }).focus();
  await okla(page);
  await expect(
    page.getByRole("radio", { name: metin("yonetim.elleSiparis.misafir") }),
  ).toBeChecked();
  const eposta = `elle-${randomUUID().slice(0, 8)}@ornek.test`;
  await page.getByLabel(metin("vitrin.odeme.eposta"), { exact: true }).fill(eposta);

  // Teslimat.
  await page.getByLabel(metin("vitrin.odeme.ad"), { exact: true }).fill("Deniz");
  await page.getByLabel(metin("vitrin.odeme.soyad"), { exact: true }).fill("Yılmaz");
  await page
    .getByRole("textbox", { name: new RegExp(`^${metin("vitrin.odeme.telefon")}`) })
    .fill("0555 000 00 00");
  await listedenSec(page, metin("vitrin.odeme.il"), "Ankara");
  await listedenSec(page, metin("vitrin.odeme.ilce"), "Altındağ", "Alt");
  await page
    .getByLabel(metin("vitrin.odeme.adres"), { exact: true })
    .fill("Atatürk Bulvarı No: 10");
  await page.getByLabel(metin("vitrin.odeme.postaKodu"), { exact: true }).fill("06420");

  // Ödeme: ilk yöntem (havale) klavyeyle seçilir, metinler iletildi.
  const yontemler = page.getByRole("radiogroup", {
    name: metin("yonetim.elleSiparis.odemeYontemi"),
  });
  const ilk = yontemler.getByRole("radio").first();
  await ilk.focus();
  await page.keyboard.press("Space");
  await expect(ilk).toBeChecked();
  const kutu = page.getByRole("checkbox", { name: metin("yonetim.elleSiparis.metinlerIletildi") });
  await kutu.focus();
  await page.keyboard.press("Space");
  await expect(kutu).toBeChecked();
  await expect(page.getByText(metin("yonetim.elleSiparis.hata.metinler"))).toBeHidden();
  await ikiRenkUcGenislik(page, "dolu elle sipariş");

  await olustur.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/siparisler\/ayrinti\?numara=/);
  await sayfaHazir(page);
  const numara = new URL(page.url()).searchParams.get("numara") ?? "";
  const ayrinti = await siparisYonetimi(calisanSite()).ayrinti(vt, numara);
  expect(ayrinti?.siparis).toMatchObject({
    eposta,
    durum: "odeme-bekleniyor",
    odeme_yontemi: "havale",
  });
  expect(ayrinti?.kalemler).toMatchObject([{ birim_kimligi: birim, adet: 2 }]);
  const [gecmis] = await vt
    .select()
    .from(siparisGecmisi)
    .where(eq(siparisGecmisi.siparis_kimligi, ayrinti?.siparis.kimlik ?? ""));
  expect(gecmis).toMatchObject({ neden: "panelden-olusturuldu", kim_turu: "yonetici" });
  await expect(page.getByText(metin("yonetim.siparis.neden.panelden-olusturuldu"))).toBeVisible();
  const [stok] = await vt
    .select()
    .from(birimStoklari)
    .where(eq(birimStoklari.birim_kimligi, birim));
  expect(stok?.miktar).toBe(3);
  expect(hatalar).toEqual([]);
});
