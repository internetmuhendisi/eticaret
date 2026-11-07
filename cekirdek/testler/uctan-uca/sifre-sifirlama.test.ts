// Şifre sıfırlama tarayıcıda baştan sona: istek, yerel posta kutusundaki gerçek e-posta, bağlantı, yeni şifre,
// giriş (kart 0034, karar 0052). Arka plan süreci bu ortamda çalışmaz: e-postayı test gönderim yoluyla gönderir.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { and, desc, eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin } from "../../metinler/site-metni";
import { epostaGondericisi } from "../../moduller/eposta/gonderici";
import { epostaKaydiniGonder } from "../../moduller/eposta/gonderim";
import { epostaKayitlari } from "../../moduller/eposta/model";
import { kodAdimi, zamanliKod } from "../../moduller/oturum/iki-asama";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";

if (existsSync(".env")) process.loadEnvFile(".env");
const { POSTA_KUTUSU_PORTU: kutuPortu, POSTA_SMTP_PORTU: smtpPortu, SITE_KLASORU } = process.env;
const vt = baglan(veritabaniAdresi());
const sifre = "uzun-bir-yeni-sifre";
const yeniEposta = () => `sifirlama-${randomBytes(6).toString("hex")}@ornek.test`;

test.afterAll(() => vt.$client.end());
test.beforeEach(({ page }) =>
  page.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`,
  }),
);

const yuklenmesiniBekle = (page: Page) => page.waitForLoadState("networkidle");
const alan = (page: Page, etiket: string) => page.getByLabel(etiket, { exact: true });

// Kuyruktaki e-postayı gönderir, posta kutusundan okur, içindeki bağlantıyı döner.
const epostadakiBaglanti = async (alici: string): Promise<string> => {
  const [kayit] = await vt
    .select({ kimlik: epostaKayitlari.kimlik })
    .from(epostaKayitlari)
    .where(and(eq(epostaKayitlari.alici, alici), eq(epostaKayitlari.sablon, "sifre-sifirlama")))
    .orderBy(desc(epostaKayitlari.olusturulma_zamani))
    .limit(1);
  if (kayit === undefined) throw new Error("e-posta kaydı yok");
  await epostaKaydiniGonder(vt, kayit.kimlik, {
    site: calisanSite(),
    gonderici: epostaGondericisi(`smtp://localhost:${smtpPortu}`),
  });
  const kutu = `http://127.0.0.1:${kutuPortu}/api/v1`;
  const { messages } = (await (
    await fetch(`${kutu}/search?query=${encodeURIComponent(`to:"${alici}"`)}`)
  ).json()) as { messages: { ID: string }[] };
  const ileti = (await (await fetch(`${kutu}/message/${messages[0]?.ID}`)).json()) as {
    Text: string;
  };
  const bulunan = /https?:\/\/\S+#anahtar=\S+/.exec(ileti.Text)?.[0];
  if (bulunan === undefined) throw new Error("e-postada bağlantı yok");
  const adres = new URL(bulunan);
  // Yerelde kimlikteki adres bu uygulama değildir: yol ve anahtar aynı kalır.
  return `${adres.pathname}${adres.hash}`;
};

const bagantiIste = async (page: Page, adres: string, eposta: string) => {
  await page.goto(adres);
  await yuklenmesiniBekle(page);
  await alan(page, metin("ortak.sifirlama.eposta")).fill(eposta);
  await page.getByRole("button", { name: metin("ortak.sifirlama.gonder") }).click();
  await expect(page.getByRole("status").filter({ hasText: "kayıtlıysa" })).toBeVisible();
};

const musteriKaydet = async (page: Page, eposta: string) => {
  await page.goto("/kayit");
  await yuklenmesiniBekle(page);
  await alan(page, metin("vitrin.kayit.eposta")).fill(eposta);
  await alan(page, metin("vitrin.kayit.sifre")).fill("eski-uzun-bir-sifre");
  await alan(page, metin("vitrin.kayit.uyelikOnayi")).check();
  await alan(page, metin("vitrin.kayit.kvkkOnayi")).check();
  await page.getByRole("button", { name: metin("vitrin.kayit.gonder") }).click();
  await expect(page.getByText(eposta, { exact: true })).toBeVisible();
};

const yeniSifreYaz = async (page: Page, baglanti: string) => {
  await page.goto(baglanti);
  await yuklenmesiniBekle(page);
  await expect(alan(page, metin("ortak.sifirlama.sifre"))).toBeVisible();
  // Anahtar adres çubuğunda kalmaz.
  expect(page.url()).not.toContain("anahtar");
  await alan(page, metin("ortak.sifirlama.sifre")).fill(sifre);
  await page.getByRole("button", { name: metin("ortak.sifirlama.yenileGonder") }).click();
};

test("müşteri: istek, e-postadaki bağlantı, yeni şifre, yeni şifreyle giriş; eski oturum geçmez", async ({
  page,
  context,
}) => {
  const eposta = yeniEposta();
  await musteriKaydet(page, eposta);
  const eskiCerezler = await context.cookies();

  // Eski oturum ikinci bir tarayıcıda açık kalmış gibi saklanır.
  await context.clearCookies();
  await page.goto("/giris");
  await page.getByRole("link", { name: metin("ortak.sifirlama.baglanti") }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    metin("ortak.sifirlama.istekBaslik"),
  );
  await bagantiIste(page, "/sifremi-unuttum", eposta);
  const baglanti = await epostadakiBaglanti(eposta);
  await yeniSifreYaz(page, baglanti);
  await expect(page).toHaveURL(/\/giris\?sifre-yenilendi=1$/);
  await expect(page.getByRole("status")).toHaveText(metin("ortak.sifirlama.yenilendi"));

  await alan(page, metin("vitrin.giris.eposta")).fill(eposta);
  await alan(page, metin("vitrin.giris.sifre")).fill(sifre);
  await yuklenmesiniBekle(page);
  await page.getByRole("button", { name: metin("vitrin.giris.gonder") }).click();
  await expect(page.getByText(eposta, { exact: true })).toBeVisible();

  // Sıfırlamadan önceki çerezlerle ana sayfa girişsiz görünür.
  await context.clearCookies();
  await context.addCookies(eskiCerezler);
  await page.goto("/");
  await expect(page.getByRole("link", { name: metin("vitrin.hesap.giris") })).toBeVisible();

  // Kullanılmış bağlantı reddedilir, yenisini istemenin yolu gösterilir.
  await page.goto("/");
  await page.goto(baglanti);
  await yuklenmesiniBekle(page);
  await alan(page, metin("ortak.sifirlama.sifre")).fill("baska-uzun-bir-sifre");
  await page.getByRole("button", { name: metin("ortak.sifirlama.yenileGonder") }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    metin("ortak.sifirlama.hataBaglanti"),
  );
  await expect(
    page.getByRole("link", { name: metin("ortak.sifirlama.yeniBaglanti") }),
  ).toHaveAttribute("href", "/sifremi-unuttum");
});

test("kayıtsız e-postada da aynı cevap görünür", async ({ page }) => {
  await bagantiIste(page, "/sifremi-unuttum", yeniEposta());
});

for (const adres of [
  "/sifre-yenile",
  "/sifre-yenile#anahtar=",
  `/sifre-yenile#anahtar=${"a".repeat(200)}`,
]) {
  test(`anahtarı olmayan ya da bozuk bağlantı açıklama gösterir: ${adres.slice(0, 30)}`, async ({
    page,
  }) => {
    await page.goto(adres);
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      metin("ortak.sifirlama.hataBaglanti"),
    );
    expect(page.url()).not.toContain("#");
  });
}

test("sayfa yenilenince bağlantı geçerli kalır; aynı sekmeye yapıştırılan yeni bağlantı adresten silinir", async ({
  page,
}) => {
  const eposta = yeniEposta();
  await musteriKaydet(page, eposta);
  await bagantiIste(page, "/sifremi-unuttum", eposta);
  const baglanti = await epostadakiBaglanti(eposta);

  await page.goto("/sifre-yenile#anahtar=bozuk-eski-anahtar");
  await yuklenmesiniBekle(page);
  await page.evaluate((yeni) => {
    window.location.hash = new URL(yeni, window.location.href).hash;
  }, baglanti);
  await expect.poll(() => page.url()).not.toContain("#");

  await page.reload();
  await yuklenmesiniBekle(page);
  await alan(page, metin("ortak.sifirlama.sifre")).fill(sifre);
  await page.getByRole("button", { name: metin("ortak.sifirlama.yenileGonder") }).click();
  await expect(page).toHaveURL(/\/giris\?sifre-yenilendi=1$/);
});

test.describe("JavaScript kapalı", () => {
  test.use({ javaScriptEnabled: false });
  test("yeni şifre sayfası nedenini söyler, form gönderilmez", async ({ page }) => {
    await page.goto("/sifre-yenile#anahtar=abc");
    // Test aracı noscript içini metin saymaz, sayfanın kendisine bakılır.
    expect(await page.content()).toContain(metin("ortak.form.kodGerekli"));
    await expect(
      page.getByRole("button", { name: metin("ortak.sifirlama.yenileGonder") }),
    ).toBeDisabled();
  });
});

test("yönetici: sıfırlamadan sonra yine doğrulama kodu ister", async ({ page }) => {
  const eposta = yeniEposta();
  const cikti = execFileSync("pnpm", ["-s", "yonetici-ac", SITE_KLASORU ?? "", eposta], {
    encoding: "utf8",
  });
  const eskiSifre = /^şifre\s+(\S+)$/m.exec(cikti)?.[1] ?? "";
  const girisYap = async (girilen: string) => {
    await yuklenmesiniBekle(page);
    await alan(page, metin("yonetim.giris.eposta")).fill(eposta);
    await alan(page, metin("yonetim.giris.sifre")).fill(girilen);
    await page.getByRole("button", { name: metin("yonetim.giris.gonder") }).click();
  };
  // İki aşamalı girişi kurar, panele girer, çıkar.
  await page.goto("/yonetim/giris");
  await girisYap(eskiSifre);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kurulum/);
  await yuklenmesiniBekle(page);
  const gizli =
    (
      await page
        .getByText(metin("yonetim.kurulum.metinAnahtar"), { exact: true })
        .locator("+ p")
        .textContent()
    )?.trim() ?? "";
  await alan(page, metin("yonetim.kurulum.alan")).fill(zamanliKod(gizli, kodAdimi()));
  await page.getByRole("button", { name: metin("yonetim.kurulum.gonder") }).click();
  await page.getByRole("button", { name: metin("yonetim.kurulum.devam") }).click();
  await expect(page).toHaveURL(/\/yonetim$/);
  await page.getByRole("button", { name: metin("yonetim.cikis.dugme") }).click();
  await expect(page).toHaveURL(/\/yonetim\/giris$/);

  await page.getByRole("link", { name: metin("ortak.sifirlama.baglanti") }).click();
  await expect(page).toHaveURL(/\/yonetim\/giris\/sifremi-unuttum$/);
  await bagantiIste(page, "/yonetim/giris/sifremi-unuttum", eposta);
  await yeniSifreYaz(page, await epostadakiBaglanti(eposta));
  await expect(page).toHaveURL(/\/yonetim\/giris\?sifre-yenilendi=1$/);

  await girisYap(sifre);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/);
});

test("sıfırlama sayfası girişsiz açılır, panelin geri kalanı kapalı kalır", async ({ page }) => {
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/yonetim\/giris$/);
  await page.goto("/yonetim/giris/sifre-yenile");
  await expect(page).toHaveURL(/\/yonetim\/giris\/sifre-yenile$/);
});

test("yeni şifre formu yalnız klavyeyle gönderilir, kısa şifre alanın altında söylenir", async ({
  page,
}) => {
  const eposta = yeniEposta();
  await musteriKaydet(page, eposta);
  await bagantiIste(page, "/sifremi-unuttum", eposta);
  await page.goto(await epostadakiBaglanti(eposta));
  await yuklenmesiniBekle(page);
  await alan(page, metin("ortak.sifirlama.sifre")).focus();
  await page.keyboard.type("kisa");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/en az \d+ karakter olmalı/)).toBeVisible();
  await alan(page, metin("ortak.sifirlama.sifre")).fill(sifre);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: metin("ortak.sifirlama.yenileGonder") }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/giris\?sifre-yenilendi=1$/);
});

for (const [ad, width, height] of [
  ["telefon", 360, 740],
  ["tablet", 768, 1024],
  ["bilgisayar", 1280, 800],
] as const) {
  for (const adres of ["/sifremi-unuttum", "/yonetim/giris/sifremi-unuttum"]) {
    test(`${adres} ${ad} genişliğinde yana kaymaz, öğeler parmakla basılır`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(adres);
      await yuklenmesiniBekle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      const ogeler = page.locator("main input, main button, main a");
      const adet = await ogeler.count();
      expect(adet).toBeGreaterThan(0);
      for (let sira = 0; sira < adet; sira++) {
        expect((await ogeler.nth(sira).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });
  }
}
