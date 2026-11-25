// Panelin Mağaza bilgileri ekranı tarayıcıda (kart 0278, karar 0175):
// - Mağaza sahibi menüden klavyeyle gelir; tek satış ülkesi yazı olarak, sosyal hesap alanlarında sitenin adresi.
// - Tek hata (telefonun biçimi): alanın altında yazar, odak alanda; hiçbir şey kaydedilmez.
// - Birden çok hata (boş mağaza adı, telefon, vergi numarasının kontrol hanesi): odak özette, satırlar alanların
//   ekrandaki sırasıyla, satır alana götürür. Vazgeç formu geri alır.
// - Kayıt (sosyal hesap ve ticaret sicil numarası): bildirim, veritabanında yeni değer, vitrinin alt kısmında sosyal
//   hesabın bağlantısı. Test sonunda eski değerler geri yazılır.
// - Ekran, hatalı form iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; konsolda hata yok.
//
// Tarayıcı testleri sitenin veritabanını paylaşır: mağaza adı ve telefon başka testlerde okunduğu için
// kaydedilmez (yalnız hatalı hâlde denenir). Alt kısmın görünüşü değiştiği için kayıttan geri yazmaya kadar düzen
// kilidi alınır (kart 0293).
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { metin } from "../../metinler/site-metni";
import { magazaAyarlariniOku, siteninServisi } from "../../moduller/magaza-ayarlari/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { magazaBilgileriAdresi } from "../../yonetim-paneli/adresler";
import { duzenKilidiniAl } from "./duzen-kilidi";
import { hataOzeti, ozetOdaktaOlmali } from "./form-hatasi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

test.afterAll(async () => {
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

test("mağaza bilgileri: menüden klavyeyle, tek ve çok hata, Vazgeç, kayıt ve vitrinde sosyal hesap; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page, {
    // Hatalı form bilerek iki kez gönderilir: uç 400 döner.
    haric: (m) => m.includes("status of 400"),
  });
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());

  const menu = page.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
  await menu.getByRole("link", { name: metin("yonetim.sayfa.magazaBilgileri.ad") }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${magazaBilgileriAdresi}$`));
  await sayfaHazir(page);
  await expect(page.getByText("pinterest.com/", { exact: true })).toBeVisible();
  // Ekran okuyucu yalnız kullanıcı adının yazılacağını alanın açıklamasından duyar.
  await expect(page.getByRole("textbox", { name: /^Pinterest/ })).toHaveAccessibleDescription(
    metin("yonetim.magazaBilgileri.sosyal.alanAciklamasi").replace("{adres}", "pinterest.com/"),
  );
  await ikiRenkUcGenislik(page, "mağaza bilgileri");

  const ad = page.getByRole("textbox", {
    name: new RegExp(`^${metin("yonetim.magazaBilgileri.magazaAdi")}`),
  });
  const telefon = page.getByRole("textbox", {
    name: new RegExp(`^${metin("yonetim.magazaBilgileri.telefon")}`),
  });
  const vergi = page.getByRole("textbox", {
    name: new RegExp(`^${metin("yonetim.magazaBilgileri.vergiNumarasi")}`),
  });
  const kaydet = page.getByRole("button", { name: metin("yonetim.magazaBilgileri.kaydet") });
  const eskiAd = await ad.inputValue();
  const eskiTelefon = await telefon.inputValue();

  // Tek hata: alanın altında, odak alanda.
  await telefon.fill("12");
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(telefon).toBeFocused();
  await expect(page.getByText(metin("yonetim.magazaBilgileri.hata.telefon"))).toBeVisible();
  await expect(hataOzeti(page)).toHaveCount(0);

  // Birden çok hata: özet odakta, satırlar ekran sırasıyla, satır alana götürür.
  await ad.fill("");
  await vergi.fill("1111111115");
  await kaydet.focus();
  await page.keyboard.press("Enter");
  const satirlar = await ozetOdaktaOlmali(
    page,
    [
      metin("yonetim.magazaBilgileri.magazaAdi"),
      metin("yonetim.magazaBilgileri.telefon"),
      metin("yonetim.magazaBilgileri.vergiNumarasi"),
    ],
    3,
  );
  await ikiRenkUcGenislik(page, "mağaza bilgileri hatalı");
  await satirlar.nth(2).getByRole("button").click();
  await expect(vergi).toBeFocused();
  // Hiçbir şey kaydedilmedi; Vazgeç formu geri alır.
  expect((await magazaAyarlariniOku(vt)).iletisimTelefonu).not.toBe("12");
  await page.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
  await expect(ad).toHaveValue(eskiAd);
  await expect(telefon).toHaveValue(eskiTelefon);

  // Kayıt: sosyal hesap ve ticaret sicil numarası. Alt kısmın görünüşü değişir: düzen kilidi.
  const once = await magazaAyarlariniOku(vt);
  const kilidiBirak = await duzenKilidiniAl(vt);
  const hesap = `uctan${randomBytes(3).toString("hex")}`;
  try {
    await page.getByRole("textbox", { name: /^Pinterest/ }).fill(hesap);
    await page
      .getByRole("textbox", {
        name: new RegExp(`^${metin("yonetim.magazaBilgileri.ticaretSicil")}`),
      })
      .fill("123456");
    await kaydet.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(metin("yonetim.magazaBilgileri.kaydedildi"))).toBeVisible();
    const sonra = await magazaAyarlariniOku(vt);
    expect(sonra.sosyalHesaplar).toContainEqual({ site: "pinterest", hesap });
    expect(sonra.saticiBilgileri?.ticaretSicilNumarasi).toBe("123456");
    expect(sonra.magazaAdi).toBe(once.magazaAdi);
    expect(sonra.iletisimTelefonu).toBe(once.iletisimTelefonu);
    // Vitrinin alt kısmında sosyal hesabın bağlantısı.
    await page.goto("/");
    await sayfaHazir(page);
    await expect(
      page.getByRole("contentinfo").locator(`a[href="https://www.pinterest.com/${hesap}"]`),
    ).toBeVisible();
  } finally {
    await siteninServisi(calisanSite()).degistir(vt, sistemIslemi("uctan-uca-magaza-bilgileri"), {
      sosyalHesaplar: once.sosyalHesaplar,
      saticiBilgileri: once.saticiBilgileri,
    });
    await kilidiBirak();
  }
  expect(hatalar).toEqual([]);
});
