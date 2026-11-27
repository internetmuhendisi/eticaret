// Tarayıcı testlerinin yönetici adımları (kart 0027, 0028, 0141): deneme yöneticisini gerçek komut açar, şifreyi
// komutun çıktısından okur; iki aşamalı giriş kurulumunu karekodun yanındaki anahtardan üretilen kodla bitirir.
// Her çağrı yeni bir hesap açar, e-postası rastgeledir: bir kod ikinci kez geçmediği için aynı hesapla aynı 30
// saniyede iki kez girilemez.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { metin } from "../../metinler/site-metni";
import { kodAdimi, zamanliKod } from "../../moduller/oturum/iki-asama";
import { sayfaHazir } from "./sayfa-hazir";

export type DenemeYoneticisi = { eposta: string; sifre: string };

// Tam yetkili yönetici açar (pnpm yonetici-ac).
export const yoneticiAc = (): DenemeYoneticisi => {
  const { SITE_KLASORU } = process.env;
  const eposta = `deneme-${randomBytes(6).toString("hex")}@ornek.test`;
  const cikti = execFileSync("pnpm", ["-s", "yonetici-ac", SITE_KLASORU ?? "", eposta], {
    encoding: "utf8",
  });
  const sifre = /^şifre\s+(\S+)$/m.exec(cikti)?.[1] ?? "";
  expect(sifre).not.toBe("");
  return { eposta, sifre };
};

// Sıkı istek sınırı dakikada birkaç denemedir; her test kendi bağlantısından gelir.
export const ayriBaglanti = (page: Page) =>
  page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.100.${1 + ((randomBytes(1)[0] ?? 0) % 250)}`,
  });

// Karekodu okutamayanın elle gireceği anahtar: açıklamasının hemen altındadır.
export const gizliOku = async (page: Page) =>
  (
    await page
      .getByText(metin("yonetim.kurulum.metinAnahtar"), { exact: true })
      .locator("+ p")
      .textContent()
  )?.trim() ?? "";

// Beklemelerin süresi: testlerde beklentilerin kendi sınırı. Testlerden önceki ısınma (isinma.ts, kart 0164) sayfaların
// ilk derlemesini beklediği için daha uzun süre verir.
type Bekleme = { beklemeSuresi?: number };

// Kurulum ekranındaki metin anahtardan gerçek uygulamanın üreteceği kodu üretir, kurulumu bitirir.
export const kurulumuBitir = async (page: Page, { beklemeSuresi }: Bekleme = {}) => {
  const sure = beklemeSuresi === undefined ? {} : { timeout: beklemeSuresi };
  await expect(page).toHaveURL(/\/yonetim\/giris\/kurulum/, sure);
  await sayfaHazir(page);
  const gizli = await gizliOku(page);
  const adim = kodAdimi();
  await page.getByLabel(metin("yonetim.kurulum.alan")).fill(zamanliKod(gizli, adim));
  await page.getByRole("button", { name: metin("yonetim.kurulum.gonder") }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    metin("yonetim.kurulum.yedekBaslik"),
    sure,
  );
  const yedekKodlari = await page.getByRole("listitem").allTextContents();
  await page.getByRole("button", { name: metin("yonetim.kurulum.devam") }).click();
  return { gizli, adim, yedekKodlari };
};

// Sayfanın kodu yüklenmeden gönderilen form çalışmaz (kart 0057): önce sayfanın bağlanması beklenir (karar 0099).
export const sifreyleGir = async (page: Page, { eposta, sifre }: DenemeYoneticisi) => {
  await sayfaHazir(page);
  await page.getByLabel(metin("yonetim.giris.eposta")).fill(eposta);
  await page.getByLabel(metin("yonetim.giris.sifre")).fill(sifre);
  await page.getByRole("button", { name: metin("yonetim.giris.gonder") }).click();
};

// Giriş sayfasından kurulumu bitirip panelin açılış sayfasına girer ve sayfanın bağlanmasını bekler (karar 0099).
// Kart 0252: beklemeden menüden geçen test, sayfa henüz bağlanırken geçişi başlatıyordu; hattaki izde önceki sayfanın
// gövdeye akan <title> öğesi React'a hiç bağlanmadan kaldı ve sonraki "sayfa hazır" beklemesi bitmedi.
export const paneleGir = async (page: Page, yonetici: DenemeYoneticisi, bekleme: Bekleme = {}) => {
  await page.goto("/yonetim/giris");
  await sifreyleGir(page, yonetici);
  const sonuc = await kurulumuBitir(page, bekleme);
  await expect(page).toHaveURL(
    /\/yonetim$/,
    bekleme.beklemeSuresi === undefined ? {} : { timeout: bekleme.beklemeSuresi },
  );
  await sayfaHazir(page);
  return sonuc;
};

// Panelin açılış sayfasının başlığı (kart 0186): günün selamı, sitenin saat dilimindeki saate göre üçünden biri.
export const panoBasligi = new RegExp(
  `^(${["gunaydin", "iyiGunler", "iyiAksamlar"]
    .map((kod) => metin(`yonetim.pano.selam.${kod}` as "yonetim.pano.selam.gunaydin"))
    .join("|")})$`,
);
