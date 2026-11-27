// Panelin bildirimleri tarayıcıda (kart 0280, karar 0198):
// - Masaüstünde zil üst şeritte; adı okunmamış sayısını söyler. Enter paneli açar (adlı dialog), testin siparişlerinin
//   bildirimleri okunmamış olarak listede; açık panel iki renkte taranır, yana kaymaz.
// - Bir bildirime klavyeyle basınca siparişin ayrıntısı açılır, sayı bir azalır; Escape paneli kapatır, odak zile
//   döner. "Hepsini okundu yap" klavyeyle sayıyı sıfırlar, düğme kalkar, odak panelin başlığına geçer.
// - Telefon ve tablette zil üst çubukta; panel açılır, iki renkte taranır, yana kaymaz.
// - Konsolda hata yok.
// Paylaşılan veritabanında başka testlerin siparişleri de bu yöneticiye bildirim yazabilir: test kendi siparişlerini
// numarasıyla arar, sayının kesin değerine bağlanmaz.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { odemeServisi } from "../../moduller/odeme/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { siparisAyrintisiAdresi } from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-panel-bildirimleri");

test.afterAll(async () => {
  await vt.$client.end();
});

// Testin kendi ürünü ve iki siparişi (yönetici açıldıktan sonra: bildirimleri ona da yazılır).
const siparisleriVer = async () => {
  const ek = randomBytes(4).toString("hex");
  const urunServisi = calisanSiteninUrunServisi();
  const urun = await urunServisi.urunEkle(vt, yapan, {
    ad: `Bildirim deneme ${ek}`,
    adresAdi: `bildirim-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await urunServisi.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 12_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 50,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const numaralar: string[] = [];
  for (let i = 0; i < 2; i++) {
    const sonuc = await odemeServisi(calisanSite()).siparisVer(
      vt,
      {
        kim: { tur: "misafir", eposta: `bildirim-${ek}-${i}@ornek.test`, hesap: { ac: false } },
        bilgiler: odemeBilgileriSemasi.parse({
          odemeYontemi: { yontem: "kapida-odeme", secenek: "nakit" },
          teslimat: {
            ad: "Zeynep",
            soyad: "Kara",
            telefon: "0555 000 00 00",
            adres: {
              ulke: "TR",
              il: "TR-06",
              ilce: "TR-06-007",
              adres: "Deneme Sokak No: 3",
              postaKodu: "06420",
            },
          },
          fatura: { tur: "bireysel", adresAyni: true },
          onBilgilendirmeOnayi: true,
          mesafeliSatisOnayi: true,
          pazarlamaIzni: false,
        }),
        kalemler: [{ birim, adet: 1 }],
      },
      3600,
    );
    numaralar.push(sonuc.siparis.numara);
  }
  return numaralar as [string, string];
};

const zil = (page: Page): Locator =>
  page.getByRole("button", { name: /^Bildirimler/ }).filter({ visible: true });
const panel = (page: Page) =>
  page.getByRole("dialog", { name: metin("yonetim.bildirimler.panelBasligi") });
const okunmamisSayisi = async (page: Page): Promise<number> => {
  const ad = (await zil(page).getAttribute("aria-label")) ?? "";
  return Number(/(\d+)/.exec(ad)?.[1] ?? "0");
};
const zilinAdi = (sayi: number) =>
  sayi === 0
    ? metin("yonetim.bildirimler.zil")
    : doldur(metin("yonetim.bildirimler.zilOkunmamis"), { sayi: String(sayi) });
const ikiRenk = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    await tara(page, `${ne} ${renk}`);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${ne} ${renk} yana kaymaz`,
    ).toBe(true);
  }
  await page.emulateMedia({ colorScheme: "light" });
};

test("panelin bildirimleri: zil, liste, klavyeyle bildirime gitme, hepsini okundu yap, telefon; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const yonetici = yoneticiAc();
  const [ilk, ikinci] = await siparisleriVer();
  await paneleGir(page, yonetici);

  // Zil şeritte; adı okunmamış sayısını söyler (en az testin iki siparişi).
  const baslangic = await okunmamisSayisi(page);
  expect(baslangic).toBeGreaterThanOrEqual(2);
  await expect(zil(page)).toHaveAccessibleName(zilinAdi(baslangic));
  await zil(page).focus();
  await page.keyboard.press("Enter");
  await expect(panel(page)).toBeVisible();
  const ilkBildirim = panel(page).getByRole("link", {
    name: new RegExp(`^Yeni sipariş: ${ilk}\\s*${metin("yonetim.bildirimler.okunmamis")}`),
  });
  await expect(ilkBildirim).toBeVisible();
  await expect(
    panel(page).getByRole("link", { name: new RegExp(`^Yeni sipariş: ${ikinci}`) }),
  ).toBeVisible();
  await expect(panel(page).getByText("Zeynep K.").first()).toBeVisible();
  await ikiRenk(page, "açık bildirim paneli");

  // Klavyeyle bildirime gitme: siparişin ayrıntısı açılır, sayı bir azalır.
  await ilkBildirim.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${siparisAyrintisiAdresi(ilk).replace("?", "\\?")}$`));
  await sayfaHazir(page);
  await expect(panel(page)).toHaveCount(0);
  await expect(zil(page)).toHaveAccessibleName(zilinAdi(baslangic - 1));

  // Okunan bildirim listede kalır, okunmamış değildir; Escape paneli kapatır, odak zile döner.
  await zil(page).focus();
  await page.keyboard.press("Enter");
  await expect(
    panel(page).getByRole("link", { name: new RegExp(`^Yeni sipariş: ${ilk}\\s*Zeynep`) }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(zil(page)).toBeFocused();

  // Hepsini okundu yap: sayı sıfır, düğme kalkar, odak panelin başlığında.
  await page.keyboard.press("Enter");
  const hepsi = panel(page).getByRole("button", { name: metin("yonetim.bildirimler.hepsiniOku") });
  await hepsi.focus();
  await page.keyboard.press("Enter");
  await expect(hepsi).toHaveCount(0);
  await expect(zil(page)).toHaveAccessibleName(zilinAdi(0));
  await expect(
    panel(page).getByRole("heading", { name: metin("yonetim.bildirimler.panelBasligi") }),
  ).toBeFocused();
  await expect(panel(page).getByText(metin("yonetim.bildirimler.okunmamis"))).toHaveCount(0);
  await ikiRenk(page, "okunmuş bildirim paneli");
  // Kapanma hareketi bitmeden şerit gizlenirse panel kapanmış hâlde kalırdı: önce kapandığı beklenir.
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);

  // Telefon ve tablet: zil üst çubukta.
  for (const boyut of [
    { width: 375, height: 800 },
    { width: 768, height: 1000 },
  ]) {
    await page.setViewportSize(boyut);
    await expect(zil(page)).toHaveCount(1);
    await zil(page).focus();
    await page.keyboard.press("Enter");
    await expect(panel(page)).toBeVisible();
    await expect(
      panel(page).getByRole("link", { name: new RegExp(`^Yeni sipariş: ${ikinci}`) }),
    ).toBeVisible();
    await ikiRenk(page, `bildirim paneli ${boyut.width}`);
    await page.keyboard.press("Escape");
    await expect(panel(page)).toHaveCount(0);
    await expect(zil(page)).toBeFocused();
  }
  expect(hatalar).toEqual([]);
});
