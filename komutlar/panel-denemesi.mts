// Yayındaki sitenin panelini gerçek tarayıcıyla dener (kart 0048, karar 0054). Çalıştırma: pnpm panel-denemesi
//
// Örnek Mağaza'nın deneme adresinde geçici bir yönetici açar. Ölçer: girişsiz panel kapalı, yanlış şifre girmiyor,
// doğru şifre kurulum ekranına düşürüyor, kurulumla boş panele giriliyor, çıkınca girilemiyor, yeniden girişte
// yalnız şifre yetmiyor, kodla giriliyor. Sonunda hesabı kapatır, kapattıktan sonra şifre geçmez.
// Hesabı kapatabilmek için sitede başka bir tam yetkili yönetici olmalı: son sahip kapatılamaz (karar 0040).
// Şifre ve kodlar ekrana yazılmaz.

import { randomBytes } from "node:crypto";
import { chromium, type Page } from "@playwright/test";
import { metinOkuyucu } from "../cekirdek/metinler/metin.ts";
import { kodAdimi, zamanliKod } from "../cekirdek/moduller/oturum/iki-asama.ts";
import { siteNumarasiAl } from "./gizli-bilgi.mts";
import { denemeAdresi, yayindakiSiteleriOku, yayinOrtami } from "./on-kapi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { sifreyiOku, yoneticiBetigi } from "./sunucu-yonetici.mts";
import { yayinGoruntusu } from "./yayin.mts";

const kodAdi = "ornek-magaza";
const adres = `https://${denemeAdresi(kodAdi)}`;
const metin = metinOkuyucu("tr");
const eposta = `panel-deneme-${randomBytes(5).toString("hex")}@ornek.test`;

let kirmizi = 0;
const olc = (ad: string, gecti: boolean, ayrinti = ""): void => {
  if (!gecti) kirmizi += 1;
  console.log(`${gecti ? "geçti" : "KALDI"}   ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
};

const [sunucu] = kayitlariOku();
if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok.");
const no = yayindakiSiteleriOku(sunucu.ipv4)[kodAdi];
if (no === undefined) throw new Error(`${kodAdi} yayında değil.`);
const betik = (islem: "ac" | "kapat") =>
  yoneticiBetigi(
    islem,
    yayinOrtami,
    kodAdi,
    siteNumarasiAl(kodAdi),
    yayinGoruntusu(yayinOrtami, kodAdi, no),
    eposta,
  );

const acilis = sshKomutu(sunucu.ipv4, betik("ac"));
const sifre = acilis.status === 0 ? sifreyiOku(acilis.stdout) : null;
olc("geçici yönetici açıldı", sifre !== null, sifre === null ? acilis.stderr.trim() : "");
if (sifre === null) process.exit(1);

const yuklenmesiniBekle = (page: Page) => page.waitForLoadState("networkidle");
const adresiBekle = async (page: Page, yol: RegExp): Promise<boolean> => {
  try {
    await page.waitForURL(yol, { timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
};
const sifreyleGir = async (page: Page, girilen: string): Promise<void> => {
  await yuklenmesiniBekle(page);
  await page.getByLabel(metin("yonetim.giris.eposta"), { exact: true }).fill(eposta);
  await page.getByLabel(metin("yonetim.giris.sifre"), { exact: true }).fill(girilen);
  await page.getByRole("button", { name: metin("yonetim.giris.gonder") }).click();
};

const tarayici = await chromium.launch();
try {
  const page = await (await tarayici.newContext()).newPage();
  const konsol: string[] = [];
  page.on("pageerror", (hata) => konsol.push(hata.message));

  await page.goto(`${adres}/yonetim`);
  olc("girişsiz panel giriş sayfasına yönleniyor", await adresiBekle(page, /\/yonetim\/giris$/));

  await sifreyleGir(page, "yanlis-bir-sifre-burada");
  const uyari = page.locator("main").getByRole("alert");
  await uyari.waitFor({ timeout: 15_000 });
  olc(
    "yanlış şifre girmiyor, uyarı yazıyla görünüyor",
    (await uyari.textContent()) === metin("yonetim.giris.hataBilgi"),
  );

  await sifreyleGir(page, sifre);
  olc(
    "doğru şifre kurulum ekranına düşürüyor",
    await adresiBekle(page, /\/yonetim\/giris\/kurulum/),
  );
  await yuklenmesiniBekle(page);
  const gizli =
    (
      await page
        .getByText(metin("yonetim.kurulum.metinAnahtar"), { exact: true })
        .locator("+ p")
        .textContent()
    )?.trim() ?? "";
  const adim = kodAdimi();
  await page
    .getByLabel(metin("yonetim.kurulum.alan"), { exact: true })
    .fill(zamanliKod(gizli, adim));
  await page.getByRole("button", { name: metin("yonetim.kurulum.gonder") }).click();
  await page.getByRole("button", { name: metin("yonetim.kurulum.devam") }).click();
  olc("kurulumla boş panele giriliyor", await adresiBekle(page, /\/yonetim$/));
  const baslik = await page.getByRole("heading", { level: 1 }).textContent();
  olc("panelin başlığı görünüyor", baslik === metin("yonetim.anasayfa.baslik"), baslik ?? "");

  await page.reload();
  olc("sayfa yenilenince panel açık kalıyor", await adresiBekle(page, /\/yonetim$/));

  await page.getByRole("button", { name: metin("yonetim.cikis.dugme") }).click();
  olc("çıkış giriş sayfasına dönüyor", await adresiBekle(page, /\/yonetim\/giris$/));
  await page.goto(`${adres}/yonetim`);
  olc("çıkınca panele girilemiyor", await adresiBekle(page, /\/yonetim\/giris$/));

  await sifreyleGir(page, sifre);
  olc("yeniden girişte yalnız şifre yetmiyor", await adresiBekle(page, /\/yonetim\/giris\/kod/));
  await page.goto(`${adres}/yonetim`);
  olc("kod girilmeden panele geçilemiyor", await adresiBekle(page, /\/yonetim\/giris\/kod/));
  await yuklenmesiniBekle(page);
  // Aynı kod ikinci kez geçmez: bir sonraki adımın kodu girilir, tolerans içindedir.
  await page
    .getByLabel(metin("yonetim.kod.alan"), { exact: true })
    .fill(zamanliKod(gizli, adim + 1));
  await page.getByRole("button", { name: metin("yonetim.kod.gonder") }).click();
  olc("kodla panele giriliyor", await adresiBekle(page, /\/yonetim$/));
  olc("sayfada kod hatası yok", konsol.length === 0, konsol.join("; "));
} finally {
  await tarayici.close();
  const kapanis = sshKomutu(sunucu.ipv4, betik("kapat"));
  olc(
    "geçici yönetici kapatıldı",
    kapanis.status === 0 && kapanis.stdout.includes("kapatildi"),
    kapanis.status === 0 ? "" : `${kapanis.stderr.trim()} Hesap: ${eposta}`,
  );
}
if (kirmizi > 0) {
  console.error(`Panel denemesi kırmızı: ${kirmizi} ölçüm kaldı.`);
  process.exitCode = 1;
} else {
  console.log("Panel denemesi yeşil.");
}
