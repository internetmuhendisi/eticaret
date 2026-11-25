// Panelin ekip ekranları tarayıcıda (kartlar 0274 ve 0053, karar 0178):
// - Mağaza sahibi menüden klavyeyle Ekip'e gelir; ikinci yönetici listede rolleri ve son girişiyle; Roller sekmesinde
//   izin tablosu. Kullanıcının ekranında roller boşaltılıp kaydedilince alanın hatası ve odak; Sipariş görevlisi
//   boşlukla seçilip Enter'la kaydedilir. İkinci yöneticinin açık oturumu Ekip'i artık açamaz (bulunamadı), siparişleri
//   açar.
// - İki aşamalı girişi ve şifreyi sıfırla onay penceresiyle (önce Vazgeç); ikinci yöneticinin oturumu düşer, eski
//   şifresiyle giremez; odak Giriş başlığına geçer.
// - Hesabım'da yanlış kodda alanın hatası ve odak; telefondaki kodla yeni yedek kodlar görünür ve odak başlıklarına
//   geçer. Kendi ekranında roller değiştirilemez, iki düğme yoktur.
// - Hesabı kapat onayla; liste ekranına dönülür, kullanıcı listede yoktur.
// - Liste, roller, kullanıcı ekranı, onay penceresi ve Hesabım iki renkte ve üç genişlikte taramadan geçer, yana
//   kaymaz; konsolda hata yok.
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { kodAdimi, zamanliKod } from "../../moduller/oturum/iki-asama";
import { ekipAdresi, ekipRolleriAdresi, hesabimAdresi } from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, sifreyleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

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

const rolKutusu = (page: Page, kod: string) =>
  page.getByRole("checkbox", { name: metin(`yonetim.rol.${kod}` as MetinAnahtari) });

test("ekip: roller, iki aşamalı girişi sıfırlama, yedek kodlar, hesap kapatma; klavye ve tarama", async ({
  page,
  browser,
}) => {
  test.setTimeout(420_000);
  // Bilerek üretilen iki hata: boş rollerin 400'ü ve yanlış kodun 401'i.
  const hatalar = konsoluDinle(page, {
    haric: (ileti) => /status of (400|401)/.test(ileti),
  });
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const sahip = yoneticiAc();
  const { gizli, adim, yedekKodlari } = await paneleGir(page, sahip);

  // İkinci yönetici kendi tarayıcısında girer (kurulumunu yapar).
  const ikinci = yoneticiAc();
  const ikinciBaglam = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ikinciSayfa = await ikinciBaglam.newPage();
  await ayriBaglanti(ikinciSayfa);
  await paneleGir(ikinciSayfa, ikinci);

  // Menüden klavyeyle.
  const menu = page.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
  await menu.getByRole("link", { name: metin("yonetim.sayfa.ekip.ad") }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${ekipAdresi}$`));
  await sayfaHazir(page);
  const liste = page.getByRole("list", { name: metin("yonetim.ekip.liste") });
  const ikinciSatiri = liste.getByRole("listitem").filter({ hasText: ikinci.eposta });
  await expect(ikinciSatiri).toContainText(metin("yonetim.rol.magaza-sahibi"));
  await expect(ikinciSatiri).not.toContainText(metin("yonetim.ekip.hicGirmedi"));
  await expect(liste.getByRole("listitem").filter({ hasText: sahip.eposta })).toContainText(
    metin("yonetim.ekip.sen"),
  );
  await ikiRenkUcGenislik(page, "ekip listesi");

  // Roller sekmesi: izin tablosu.
  await page.getByRole("link", { name: new RegExp(`^${metin("yonetim.ekip.roller")}`) }).click();
  await expect(page).toHaveURL(new RegExp(`${ekipRolleriAdresi}$`));
  await sayfaHazir(page);
  const tablo = page.getByRole("table", { name: metin("yonetim.ekip.rolTablosu") });
  await expect(
    tablo.getByRole("row", { name: new RegExp(`^${metin("yonetim.izin.siparis.iade")}`) }),
  ).toBeVisible();
  await ikiRenkUcGenislik(page, "roller tablosu");

  // Kullanıcının ekranı.
  await page.goto(ekipAdresi);
  await sayfaHazir(page);
  await page.getByRole("link", { name: ikinci.eposta }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ekip\/kisi\?kimlik=/);
  await sayfaHazir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ikinci.eposta);
  await ikiRenkUcGenislik(page, "kullanıcının ekranı");

  // Bütün roller kaldırılınca alanın hatası ve odak.
  const kaydet = page.getByRole("button", { name: metin("yonetim.ekip.rollerKaydet") });
  await rolKutusu(page, "magaza-sahibi").focus();
  await page.keyboard.press("Space");
  await expect(rolKutusu(page, "magaza-sahibi")).not.toBeChecked();
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.ekip.hata.rol-gerekli"))).toBeVisible();
  await expect(rolKutusu(page, "magaza-sahibi")).toBeFocused();
  await tara(page, "rol hatası");
  // Sipariş görevlisi seçilip kaydedilir.
  await rolKutusu(page, "siparis-gorevlisi").focus();
  await page.keyboard.press("Space");
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.ekip.kaydedildi"))).toBeVisible();
  await expect(rolKutusu(page, "siparis-gorevlisi")).toBeChecked();

  // İkinci yöneticinin açık oturumu Ekip'i artık açamaz, siparişleri açar.
  const ekipYaniti = await ikinciSayfa.goto(ekipAdresi);
  expect(ekipYaniti?.status()).toBe(404);
  const siparisYaniti = await ikinciSayfa.goto("/yonetim/siparisler");
  expect(siparisYaniti?.status()).toBe(200);

  // İki aşamalı girişi sıfırla: önce Vazgeç, sonra Sıfırla.
  const sifirla = page.getByRole("button", { name: metin("yonetim.ekip.sifirla") });
  await sifirla.focus();
  await page.keyboard.press("Enter");
  const sifirlaOnayi = page.getByRole("alertdialog", {
    name: doldur(metin("yonetim.ekip.sifirlaOnay.baslik"), { eposta: ikinci.eposta }),
  });
  await expect(sifirlaOnayi).toBeVisible();
  await tara(page, "sıfırlama onayı");
  await page.keyboard.press("Enter");
  await expect(sifirlaOnayi).toBeHidden();
  await expect(sifirla).toBeFocused();
  await sifirla.press("Enter");
  await sifirlaOnayi.getByRole("button", { name: metin("yonetim.ekip.sifirlaOnay.onay") }).click();
  // Sitenin adresi varsa bağlantı gider; yoksa ne yapılacağı söylenir.
  await expect(
    page
      .getByText(metin("yonetim.ekip.sifirlandi"))
      .or(page.getByText(metin("yonetim.ekip.sifirlandiBaglantisiz"))),
  ).toBeVisible();
  await expect(page.getByText(metin("yonetim.ekip.kuruluDegil"))).toBeVisible();
  await expect(sifirla).toHaveCount(0);
  // Düğme kalktı: odak gövdeye düşmez, Giriş bölümünün başlığına geçer.
  await expect(
    page.getByRole("heading", { level: 2, name: metin("yonetim.ekip.bolum.giris") }),
  ).toBeFocused();
  // İkinci yöneticinin oturumu düştü; eski şifresi de geçmez.
  await ikinciSayfa.goto("/yonetim/siparisler");
  await expect(ikinciSayfa).toHaveURL(/\/yonetim\/giris/);
  await sifreyleGir(ikinciSayfa, ikinci);
  // Şifre de sıfırlandı: eski şifreyle girilemez.
  await expect(ikinciSayfa.getByText(metin("yonetim.giris.hataBilgi"))).toBeVisible();
  await expect(ikinciSayfa).not.toHaveURL(/\/yonetim\/giris\/kurulum/);
  await ikinciBaglam.close();

  // Hesabı kapat: onayla listeye dönülür, kullanıcı listede yoktur.
  await page.getByRole("button", { name: metin("yonetim.ekip.kapat") }).focus();
  await page.keyboard.press("Enter");
  const kapatOnayi = page.getByRole("alertdialog", {
    name: doldur(metin("yonetim.ekip.kapatOnay.baslik"), { eposta: ikinci.eposta }),
  });
  await expect(kapatOnayi).toBeVisible();
  await kapatOnayi.getByRole("button", { name: metin("yonetim.ekip.kapat") }).click();
  // Bildirim sayfa geçişinden önce görünür (geçişi beklerken süresi dolabilir).
  await expect(page.getByText(metin("yonetim.ekip.kapatildi"))).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${ekipAdresi}$`));
  await sayfaHazir(page);
  await expect(page.getByRole("link", { name: ikinci.eposta })).toHaveCount(0);

  // Kendi ekranı: roller kapalı, iki düğme yok, nedeni yazar.
  await page.getByRole("link", { name: sahip.eposta }).click();
  await sayfaHazir(page);
  await expect(page.getByText(metin("yonetim.ekip.kendiHesabi"))).toBeVisible();
  await expect(rolKutusu(page, "magaza-sahibi")).toBeDisabled();
  await expect(page.getByRole("button", { name: metin("yonetim.ekip.kapat") })).toHaveCount(0);
  await expect(page.getByRole("button", { name: metin("yonetim.ekip.sifirla") })).toHaveCount(0);

  // Hesabım: yanlış kodda alanın hatası ve odak, telefondaki kodla yeni yedek kodlar.
  await menu.getByRole("link", { name: metin("yonetim.sayfa.hesabim.ad") }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${hesabimAdresi}$`));
  await sayfaHazir(page);
  await ikiRenkUcGenislik(page, "hesabım");
  const kodAlani = page.getByRole("textbox", { name: metin("yonetim.hesabim.kod") });
  const yenile = page.getByRole("button", { name: metin("yonetim.hesabim.yenile") });
  // Boş kod: kendi metni ve odak, istek gitmez.
  await yenile.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.hesabim.hata.kod-gerekli"))).toBeVisible();
  await expect(kodAlani).toBeFocused();
  await kodAlani.fill("000000");
  await yenile.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.hesabim.hata.giris-hatasi"))).toBeVisible();
  await expect(kodAlani).toBeFocused();
  await kodAlani.fill(zamanliKod(gizli, Math.max(adim + 1, kodAdimi())));
  await kodAlani.press("Enter");
  const kodlarBasligi = page.getByRole("heading", { name: metin("yonetim.hesabim.kodlar") });
  await expect(kodlarBasligi).toBeFocused();
  const yedekBolumu = page.getByRole("region", { name: metin("yonetim.hesabim.yedekBaslik") });
  await expect(yedekBolumu.getByRole("listitem")).toHaveCount(yedekKodlari.length);
  await expect(yedekBolumu.getByRole("listitem").first()).not.toHaveText(yedekKodlari[0] ?? "");
  await ikiRenkUcGenislik(page, "yeni yedek kodlar");

  expect(hatalar).toEqual([]);
});
