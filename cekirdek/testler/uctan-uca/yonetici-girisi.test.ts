// Yönetici girişi tarayıcıda baştan sona (kart 0027). Deneme yöneticisini gerçek komut açar; şifreyi
// komutun çıktısından okur. Her çalışma yeni bir hesap açar, e-postası rastgeledir.
import { expect, type Page, test } from "@playwright/test";
import { altyapiAdi } from "../../kayitlar/altyapi";
import { girisAdimiCerezi, ikiAsamaDenemeSiniri, oturumCerezAdlari } from "../../kayitlar/oturum";
import { metin } from "../../metinler/site-metni";
import { kodAdimi, zamanliKod } from "../../moduller/oturum/iki-asama";
import { sayfaHazir } from "./sayfa-hazir";
import {
  ayriBaglanti,
  gizliOku,
  kurulumuBitir,
  sifreyleGir as ortakSifreyleGir,
  panoBasligi,
  yoneticiAc,
} from "./yonetici";

// Her test kendi yöneticisini açar: bir kod ikinci kez geçmediği için aynı hesapla aynı 30 saniyede iki
// kez girilemez (kart 0028). Adımlar ortak yardımcıdadır (yonetici.ts).
let eposta = "";
let sifre = "";

test.beforeEach(({ page }) => {
  ({ eposta, sifre } = yoneticiAc());
  return ayriBaglanti(page);
});

const yuklenmesiniBekle = sayfaHazir;

const sifreyleGir = (page: Page, girilen = sifre) =>
  ortakSifreyleGir(page, { eposta, sifre: girilen });

const girisYap = async (page: Page) => {
  await sifreyleGir(page);
  return kurulumuBitir(page);
};

// Çıkış düğmesi tarayıcıda bağlanmadan basılırsa istek gitmez (kart 0096, ölçüldü): sayfa hazır olunca basılır.
const cikisYap = async (page: Page) => {
  await sayfaHazir(page);
  await page.getByRole("button", { name: metin("yonetim.cikis.dugme") }).click();
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
};

test("girişsiz panel giriş sayfasına yönlenir, altyapı adı küçük görünür", async ({ page }) => {
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(metin("yonetim.giris.baslik"));
  await expect(page.getByText(altyapiAdi, { exact: true })).toBeVisible();
});

test("giriş yapıp boş panele ulaşır, çıkınca panele giremez", async ({ page }) => {
  await page.goto("/yonetim/giris");
  await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(panoBasligi);
  await expect(page.getByText(altyapiAdi, { exact: true })).toBeVisible();

  const cerezler = await page.context().cookies();
  const oturum = cerezler.filter(({ name }) => name.startsWith("__Host-yonetici"));
  expect(oturum).toHaveLength(2);
  for (const { httpOnly, secure } of oturum) expect([httpOnly, secure]).toEqual([true, true]);

  // Girişliyken giriş sayfası panele döner.
  await page.goto("/yonetim/giris");
  await expect(page).toHaveURL(/\/yonetim$/);

  await cikisYap(page);
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
});

// Panelde olmayan adres vitrinin yakalayıcısına düşmez (kart 0120): vitrin çerçevesi ve vitrinin "bulunamadı"
// sayfası panelde görünmez, adres 404 alır.
test("girişli yönetici panelde olmayan adreste 404 alır, vitrinin bulunamadı sayfasını görmez", async ({
  page,
}) => {
  await page.goto("/yonetim/giris");
  await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim$/);
  for (const adres of ["/yonetim/olmayan", "/yonetim/olmayan/ic"]) {
    const yanit = await page.goto(adres);
    expect(yanit?.status(), adres).toBe(404);
    // Önce Next.js'in kendi 404'ü çizilir (tarayıcıda, karar 0104), yokluk ondan sonra ölçülür.
    await expect(page.getByRole("heading", { level: 1, name: "404" }), adres).toBeVisible();
    await expect(page.locator("header"), adres).toHaveCount(0);
    await expect(page.getByText(metin("vitrin.bulunamadi.baslik")), adres).toHaveCount(0);
  }
});

test("kısa anahtar dolunca panel açık kalır, yeni anahtar çereze yazılır", async ({ page }) => {
  await page.goto("/yonetim/giris");
  await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim$/);
  const kisa = oturumCerezAdlari.yonetici.kisa;
  await page.context().clearCookies({ name: kisa });
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/yonetim$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(panoBasligi);
  const cerezler = await page.context().cookies();
  expect(cerezler.map(({ name }) => name)).toContain(kisa);
  await cikisYap(page);
});

test("girişten sonra istenen sayfaya döner", async ({ page }) => {
  // Var olmayan panel adresi: dönüş doğru, ama sayfa henüz yok.
  await page.goto("/yonetim/urunler?sayfa=2");
  await expect(page).toHaveURL(/\/yonetim\/giris\?donus=%2Fyonetim%2Furunler%3Fsayfa%3D2$/);
  await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim\/urunler\?sayfa=2$/);
});

test("başka siteye dönüş verilmişse panele döner", async ({ page }) => {
  await page.goto("/yonetim/giris?donus=https://kotu.test/");
  await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim$/);
});

test("yanlış şifrede uyarı yazıyla görünür, sayfada kalır", async ({ page }) => {
  await page.goto("/yonetim/giris");
  await sifreyleGir(page, "yanlis-bir-sifre-burada");
  await expect(uyariKutusu(page, metin("yonetim.giris.hataBilgi"))).toBeVisible();
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
});

test("yalnız klavyeyle doldurulur ve gönderilir", async ({ page }) => {
  await page.goto("/yonetim/giris");
  await yuklenmesiniBekle(page);
  await page.getByLabel(metin("yonetim.giris.eposta")).focus();
  await page.keyboard.type(eposta);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(metin("yonetim.giris.sifre"))).toBeFocused();
  await page.keyboard.type(sifre);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: metin("yonetim.giris.gonder") })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/giris\/kurulum/);
  await yuklenmesiniBekle(page);
  // Kod alanı odakla açılır: kurulum da klavyeyle bitirilir.
  const gizli = await gizliOku(page);
  await expect(page.getByLabel(metin("yonetim.kurulum.alan"))).toBeFocused();
  await page.keyboard.type(zamanliKod(gizli, kodAdimi()));
  await page.keyboard.press("Enter");
  const devam = page.getByRole("button", { name: metin("yonetim.kurulum.devam") });
  await devam.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim$/);
});

test("kurulumu olmayan yönetici panele geçemez, kurulum ekranına döner", async ({ page }) => {
  await page.goto("/yonetim/giris");
  await sifreyleGir(page);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kurulum/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(metin("yonetim.kurulum.baslik"));
  await expect(page.getByRole("img", { name: metin("yonetim.kurulum.karekod") })).toBeVisible();
  for (const adres of ["/yonetim", "/yonetim/urunler", "/yonetim/giris/kod"]) {
    await page.goto(adres);
    await expect(page).toHaveURL(/\/yonetim\/giris\/kurulum/);
  }
  const cerezler = await page.context().cookies();
  expect(cerezler.map(({ name }) => name)).toEqual([girisAdimiCerezi]);
  // Sayfa yenilenince karekodun anahtarı değişmez.
  const gizli = await gizliOku(page);
  await page.reload();
  expect(await gizliOku(page)).toBe(gizli);
});

test("kurulumlu yönetici yalnız şifreyle giremez, kodla girer; yanlış kod sayfada uyarı olur", async ({
  page,
}) => {
  await page.goto("/yonetim/giris");
  const { gizli, adim } = await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim$/);
  await cikisYap(page);

  await sifreyleGir(page);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);
  await yuklenmesiniBekle(page);
  const alan = page.getByLabel(metin("yonetim.kod.alan"));
  const dogru = zamanliKod(gizli, adim + 1);
  await alan.fill(dogru === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: metin("yonetim.kod.gonder") }).click();
  await expect(uyariKutusu(page, metin("yonetim.kod.hataKod"))).toBeVisible();
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);
  await alan.fill(dogru);
  await page.getByRole("button", { name: metin("yonetim.kod.gonder") }).click();
  await expect(page).toHaveURL(/\/yonetim$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(panoBasligi);
});

test("yedek kodla girilir, aynı kod ikinci kez reddedilir", async ({ page }) => {
  await page.goto("/yonetim/giris");
  const { yedekKodlari } = await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim$/);
  await cikisYap(page);
  const [kod] = yedekKodlari;
  const gonder = page.getByRole("button", { name: metin("yonetim.kod.gonder") });

  await sifreyleGir(page);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);
  await yuklenmesiniBekle(page);
  await page.getByLabel(metin("yonetim.kod.alan")).fill(kod ?? "");
  await gonder.click();
  await expect(page).toHaveURL(/\/yonetim$/);
  await cikisYap(page);

  await sifreyleGir(page);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);
  await yuklenmesiniBekle(page);
  await page.getByLabel(metin("yonetim.kod.alan")).fill(kod ?? "");
  await gonder.click();
  await expect(uyariKutusu(page, metin("yonetim.kod.hataKod"))).toBeVisible();
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);
});

test("kod denemesi sınırı gerçek uygulamada dolar", async ({ page }) => {
  await page.goto("/yonetim/giris");
  const { gizli, adim } = await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim$/);
  await cikisYap(page);
  await sifreyleGir(page);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);
  const dogru = zamanliKod(gizli, adim + 1);
  const yanlis = dogru === "000000" ? "111111" : "000000";
  // Her istek kendi bağlantısından: sayılan, dakikalık istek sınırı değil hesap sınırı olsun.
  const gonder = (kod: string, sira: number) =>
    page.request.post("/kapi/herkese-acik/yonetici-kod", {
      data: { kod },
      headers: { "x-forwarded-for": `203.0.113.${sira + 1}` },
    });
  for (let sira = 0; sira < ikiAsamaDenemeSiniri.hesap.deneme; sira += 1) {
    expect((await gonder(yanlis, sira)).status()).toBe(401);
  }
  expect((await gonder(dogru, 100)).status()).toBe(429);
});

for (const [ad, width, height] of [
  ["telefon", 375, 667],
  ["tablet", 768, 1024],
  ["bilgisayar", 1280, 800],
] as const) {
  test(`giriş sayfası ${ad} genişliğinde yana kaymaz, düğme parmakla basılır`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/yonetim/giris");
    const genislik = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(genislik).toBeLessThanOrEqual(width);
    const kutu = await page
      .getByRole("button", { name: metin("yonetim.giris.gonder") })
      .boundingBox();
    expect(kutu?.height).toBeGreaterThanOrEqual(44);
    for (const alan of ["yonetim.giris.eposta", "yonetim.giris.sifre"] as const) {
      await expect(page.getByLabel(metin(alan))).toBeInViewport();
    }
  });
}

for (const [ad, width, height] of [
  ["telefon", 375, 667],
  ["tablet", 768, 1024],
  ["bilgisayar", 1280, 800],
] as const) {
  test(`kurulum ve yedek kod ekranı ${ad} genişliğinde yana kaymaz`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/yonetim/giris");
    await sifreyleGir(page);
    await expect(page).toHaveURL(/\/yonetim\/giris\/kurulum/);
    await yuklenmesiniBekle(page);
    const yana = () => page.evaluate(() => document.documentElement.scrollWidth);
    expect(await yana()).toBeLessThanOrEqual(width);
    const karekod = await page
      .getByRole("img", { name: metin("yonetim.kurulum.karekod") })
      .boundingBox();
    expect(karekod?.width).toBeGreaterThanOrEqual(150);
    const gizli = await gizliOku(page);
    await page.getByLabel(metin("yonetim.kurulum.alan")).fill(zamanliKod(gizli, kodAdimi()));
    await page.getByRole("button", { name: metin("yonetim.kurulum.gonder") }).click();
    const devam = page.getByRole("button", { name: metin("yonetim.kurulum.devam") });
    await expect(devam).toBeVisible();
    expect(await yana()).toBeLessThanOrEqual(width);
    expect((await devam.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  });
}

// Sayfanın kodu yüklenmeden form gönderilemez, şifre ve kod adrese yazılmaz (kart 0057). Kod bilerek
// bekletilir; bütün gezinme istekleri kaydedilir, form gönderimi yeni bir gezinme olurdu.
// Uyarı kutusu (role="alert") yazıyı kendi içinde taşır; yazı ikonun yanındaki iç öğededir (kart 0103).
const uyariKutusu = (page: Page, yazi: string) =>
  page.getByRole("alert").filter({ has: page.getByText(yazi, { exact: true }) });

const koduBeklet = async (page: Page) => {
  let birak = () => {};
  const bekle = new Promise<void>((tamam) => {
    birak = tamam;
  });
  // Yalnız kod bekletilir, stil yüklenir: "yükleniyor" yazısının gecikmesi stille çalışır, stil de
  // bekletilseydi yazı en baştan görünür ve gecikme ölçülmezdi (kart 0103'te bulundu).
  await page.route("**/_next/static/**/*.js", async (yol) => {
    await bekle;
    await yol.continue();
  });
  const gezinmeler: string[] = [];
  page.on("request", (istek) => {
    if (istek.isNavigationRequest()) gezinmeler.push(`${istek.method()} ${istek.url()}`);
  });
  return {
    gezinmeler,
    birak: () => birak(),
  };
};

const gonderilemez = async (page: Page, dugme: string, gezinmeler: string[], gizli: string) => {
  const dugmesi = page.getByRole("button", { name: dugme });
  await expect(dugmesi).toBeDisabled();
  const once = gezinmeler.length;
  await page.keyboard.press("Enter");
  await dugmesi.click({ force: true });
  await page.waitForTimeout(500);
  expect(gezinmeler).toHaveLength(once);
  expect(page.url()).not.toContain(gizli);
  expect(await page.locator("form").getAttribute("method")).toBe("post");
};

test("giriş formu kod yüklenmeden gönderilmez, yüklenince aynı değerlerle çalışır", async ({
  page,
}) => {
  const { gezinmeler, birak } = await koduBeklet(page);
  await page.goto("/yonetim/giris", { waitUntil: "commit" });
  const sifreAlani = page.getByLabel(metin("yonetim.giris.sifre"));
  await page.getByLabel(metin("yonetim.giris.eposta")).fill(eposta);
  await sifreAlani.fill(sifre);
  await sifreAlani.focus();
  await gonderilemez(page, metin("yonetim.giris.gonder"), gezinmeler, encodeURIComponent(sifre));
  await expect(sifreAlani).toHaveValue(sifre);
  // Kod yüklenmezse kullanıcı nedenini görür; yüklenince mesaj kalkar.
  // Yazı önce görünmez, birkaç saniye sonra görünür.
  const yukleniyor = page.getByText(metin("ortak.form.yukleniyor"), { exact: true });
  await expect(yukleniyor).toBeHidden();
  await expect(yukleniyor).toBeVisible({ timeout: 6000 });
  birak();
  await expect(page.getByRole("button", { name: metin("yonetim.giris.gonder") })).toBeEnabled();
  await expect(yukleniyor).toBeHidden();
  await expect(sifreAlani).toHaveValue(sifre);
  await sifreAlani.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/giris\/kurulum/);
  for (const adres of gezinmeler) {
    expect(adres).not.toContain(encodeURIComponent(sifre));
    expect(adres).not.toContain("sifre=");
  }
});

test("kurulum ve kod formu kod yüklenmeden gönderilmez, yüklenince çalışır", async ({ page }) => {
  await page.goto("/yonetim/giris");
  await sifreyleGir(page);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kurulum/);

  const beklet = await koduBeklet(page);
  await page.reload({ waitUntil: "commit" });
  const kurulumAlani = page.getByLabel(metin("yonetim.kurulum.alan"));
  await kurulumAlani.waitFor();
  const gizli = await gizliOku(page);
  const adim = kodAdimi();
  const ilkKod = zamanliKod(gizli, adim);
  await kurulumAlani.fill(ilkKod);
  await kurulumAlani.focus();
  await gonderilemez(page, metin("yonetim.kurulum.gonder"), beklet.gezinmeler, ilkKod);
  beklet.birak();
  await expect(kurulumAlani).toHaveValue(ilkKod);
  await page.getByRole("button", { name: metin("yonetim.kurulum.gonder") }).click();
  await page.getByRole("button", { name: metin("yonetim.kurulum.devam") }).click();
  await expect(page).toHaveURL(/\/yonetim$/);
  await yuklenmesiniBekle(page);
  await cikisYap(page);
  await sifreyleGir(page);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);

  await page.unrouteAll();
  const ikinci = await koduBeklet(page);
  await page.reload({ waitUntil: "commit" });
  const kodAlani = page.getByLabel(metin("yonetim.kod.alan"));
  await kodAlani.waitFor();
  const ikinciKod = zamanliKod(gizli, adim + 1);
  await kodAlani.fill(ikinciKod);
  await kodAlani.focus();
  await gonderilemez(page, metin("yonetim.kod.gonder"), ikinci.gezinmeler, ikinciKod);
  ikinci.birak();
  await expect(page.getByRole("button", { name: metin("yonetim.kod.gonder") })).toBeEnabled();
  await kodAlani.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim$/);
});

test("kod bekliyorken form tarayıcıdan zorla gönderilse de adres temiz kalır", async ({ page }) => {
  const { birak } = await koduBeklet(page);
  await page.goto("/yonetim/giris", { waitUntil: "commit" });
  await page.getByLabel(metin("yonetim.giris.sifre")).fill(sifre);
  await page.getByLabel(metin("yonetim.giris.eposta")).fill(eposta);
  await page.evaluate(() => document.querySelector("form")?.requestSubmit());
  await page.waitForTimeout(500);
  birak();
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
  expect(page.url()).not.toContain("sifre");
});

test.describe("JavaScript kapalı", () => {
  test.use({ javaScriptEnabled: false });
  test("form nedenini söyler", async ({ page }) => {
    await page.goto("/yonetim/giris");
    // Test aracı noscript içini metin saymaz, sayfanın kendisine bakılır.
    expect(await page.content()).toContain(metin("ortak.form.kodGerekli"));
    await expect(page.getByRole("button", { name: metin("yonetim.giris.gonder") })).toBeDisabled();
  });
});
