// Yönetici girişi tarayıcıda baştan sona (kart 0027). Deneme yöneticisini gerçek komut açar; şifreyi
// komutun çıktısından okur. Her çalışma yeni bir hesap açar, e-postası rastgeledir.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { altyapiAdi } from "../../kayitlar/altyapi";
import { oturumCerezAdlari } from "../../kayitlar/oturum";
import { metin } from "../../metinler/site-metni";

const eposta = `deneme-${randomBytes(6).toString("hex")}@ornek.test`;
let sifre = "";

// Sıkı istek sınırı dakikada birkaç denemedir; her test kendi bağlantısından gelir.
test.beforeEach(({ page }) =>
  page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.100.${1 + ((randomBytes(1)[0] ?? 0) % 250)}`,
  }),
);

test.beforeAll(() => {
  const { SITE_KLASORU } = process.env;
  const cikti = execFileSync("pnpm", ["-s", "yonetici-ac", SITE_KLASORU ?? "", eposta], {
    encoding: "utf8",
  });
  sifre = /^şifre\s+(\S+)$/m.exec(cikti)?.[1] ?? "";
  expect(sifre).not.toBe("");
});

const girisYap = async (page: Page, girilen = sifre) => {
  await page.getByLabel(metin("yonetim.giris.eposta")).fill(eposta);
  await page.getByLabel(metin("yonetim.giris.sifre")).fill(girilen);
  await page.getByRole("button", { name: metin("yonetim.giris.gonder") }).click();
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    metin("yonetim.anasayfa.baslik"),
  );
  await expect(page.getByText(altyapiAdi, { exact: true })).toBeVisible();

  const cerezler = await page.context().cookies();
  const oturum = cerezler.filter(({ name }) => name.startsWith("__Host-yonetici"));
  expect(oturum).toHaveLength(2);
  for (const { httpOnly, secure } of oturum) expect([httpOnly, secure]).toEqual([true, true]);

  // Girişliyken giriş sayfası panele döner.
  await page.goto("/yonetim/giris");
  await expect(page).toHaveURL(/\/yonetim$/);

  await page.getByRole("button", { name: metin("yonetim.cikis.dugme") }).click();
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
});

test("kısa anahtar dolunca panel açık kalır, yeni anahtar çereze yazılır", async ({ page }) => {
  await page.goto("/yonetim/giris");
  await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim$/);
  const kisa = oturumCerezAdlari.yonetici.kisa;
  await page.context().clearCookies({ name: kisa });
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/yonetim$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    metin("yonetim.anasayfa.baslik"),
  );
  const cerezler = await page.context().cookies();
  expect(cerezler.map(({ name }) => name)).toContain(kisa);
  await page.getByRole("button", { name: metin("yonetim.cikis.dugme") }).click();
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
});

test("girişten sonra istenen sayfaya döner, başka siteye dönmez", async ({ page }) => {
  // Var olmayan panel adresi: dönüş doğru, ama sayfa henüz yok.
  await page.goto("/yonetim/urunler?sayfa=2");
  await expect(page).toHaveURL(/\/yonetim\/giris\?donus=%2Fyonetim%2Furunler%3Fsayfa%3D2$/);
  await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim\/urunler\?sayfa=2$/);

  await page.context().clearCookies();
  await page.goto("/yonetim/giris?donus=https://kotu.test/");
  await girisYap(page);
  await expect(page).toHaveURL(/\/yonetim$/);
});

test("yanlış şifrede uyarı yazıyla görünür, sayfada kalır", async ({ page }) => {
  await page.goto("/yonetim/giris");
  await girisYap(page, "yanlis-bir-sifre-burada");
  await expect(page.getByText(metin("yonetim.giris.hataBilgi"), { exact: true })).toHaveRole(
    "alert",
  );
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
});

test("yalnız klavyeyle doldurulur ve gönderilir", async ({ page }) => {
  await page.goto("/yonetim/giris");
  await page.getByLabel(metin("yonetim.giris.eposta")).focus();
  await page.keyboard.type(eposta);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(metin("yonetim.giris.sifre"))).toBeFocused();
  await page.keyboard.type(sifre);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: metin("yonetim.giris.gonder") })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim$/);
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
