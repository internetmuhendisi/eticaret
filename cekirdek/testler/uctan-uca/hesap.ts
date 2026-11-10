// Tarayıcı testlerinin müşteri hesabı adımları (kart 0131). Testler sitenin gerçek, bölümlü ana sayfasında
// çalışır: müşteri e-postasını ve "Çıkış yap"ı üst kısımdaki Hesabım menüsünde görür (bilgisayar genişliği).
import { expect, type Page } from "@playwright/test";
import { metin } from "../../metinler/site-metni";

const hesapAdi = () => metin("vitrin.bolum.ustSatir.hesap");

// Girişli müşteride Hesabım bir düğmedir ve menü açar; girişsizde giriş sayfasına giden bağlantıdır. Başka bir test
// düzene geçici olarak ikinci bir üst satır ekleyebilir (vitrin-cercevesi.test.ts, testler aynı veritabanını
// paylaşır): ilk üst satırınki alınır.
export const hesapDugmesi = (page: Page) =>
  page.getByRole("banner").getByRole("button", { name: hesapAdi(), exact: true }).first();
export const hesapBaglantisi = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: hesapAdi(), exact: true }).first();

// Menüyü açar ve e-postanın göründüğünü bekler; menü açık kalır.
export const hesaptaEpostaGorunur = async (page: Page, eposta: string) => {
  await hesapDugmesi(page).click();
  await expect(page.getByRole("menu").getByText(eposta, { exact: true })).toBeVisible();
};

// Menüyü Escape ile kapatır ve kapanmasını (animasyonun bitmesini) bekler.
export const hesapMenusunuKapat = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
};

// Kapalı menüyü açıp çıkış yapar; sayfa baştan yüklenir, Hesabım yeniden giriş bağlantısıdır.
export const hesaptanCik = async (page: Page) => {
  const menu = page.getByRole("menu");
  await expect(menu).toHaveCount(0);
  await hesapDugmesi(page).click();
  await menu.getByRole("menuitem", { name: metin("vitrin.hesap.cikis") }).click();
  await expect(hesapBaglantisi(page)).toBeVisible();
  await expect(hesapDugmesi(page)).toHaveCount(0);
};
