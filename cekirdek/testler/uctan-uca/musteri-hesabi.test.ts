// Müşteri kaydı, çıkışı ve yeniden girişi tarayıcıda baştan sona; robot sorusu gerçek tarayıcıda çözülür
// (kart 0033, karar 0051). Her test kendi e-postasını ve bağlantısını kullanır: sıkı sınır dakikada birkaç denemedir.
import { randomBytes } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { oturumCerezAdlari, sifreSiniri } from "../../kayitlar/oturum";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { vitrinAdresleri } from "../../vitrin/adresler";

const sifre = "uzun-bir-musteri-sifresi";
const yeniEposta = () => `musteri-${randomBytes(6).toString("hex")}@ornek.test`;

test.beforeEach(({ page }) =>
  page.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`,
  }),
);

const alan = (page: Page, anahtar: MetinAnahtari) =>
  page.getByLabel(metin(anahtar), { exact: true });

// Pazarlama onayının etiketi ortak metinle kurulur (kart 0112).
const pazarlamaKutusu = (page: Page) =>
  page.getByLabel(
    doldur(metin("vitrin.kayit.pazarlamaIzni"), { onay: metin("vitrin.onay.pazarlama") }),
    { exact: true },
  );

const yuklenmesiniBekle = (page: Page) => page.waitForLoadState("networkidle");

const kayitFormunuDoldur = async (page: Page, eposta: string) => {
  await page.goto(vitrinAdresleri.kayit);
  await yuklenmesiniBekle(page);
  await alan(page, "vitrin.kayit.eposta").fill(eposta);
  await alan(page, "vitrin.kayit.sifre").fill(sifre);
  await alan(page, "vitrin.kayit.uyelikOnayi").check();
  await alan(page, "vitrin.kayit.kvkkOnayi").check();
};
const kayitGonder = (page: Page) =>
  page.getByRole("button", { name: metin("vitrin.kayit.gonder") }).click();

const kayitOl = async (page: Page, eposta: string) => {
  await kayitFormunuDoldur(page, eposta);
  await kayitGonder(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(eposta, { exact: true })).toBeVisible();
};

const cikisYap = async (page: Page) => {
  await page.getByRole("button", { name: metin("vitrin.hesap.cikis") }).click();
  await expect(page.getByRole("link", { name: metin("vitrin.hesap.giris") })).toBeVisible();
};

test("kayıt olur, çıkar, ana sayfadan yeniden girer", async ({ page }) => {
  const eposta = yeniEposta();
  await page.goto(vitrinAdresleri.anasayfa);
  await page.getByRole("link", { name: metin("vitrin.hesap.kayit") }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(metin("vitrin.kayit.baslik"));

  await kayitOl(page, eposta);
  const cerezler = await page.context().cookies();
  const oturum = cerezler.filter(({ name }) => name.startsWith("__Host-musteri"));
  expect(oturum).toHaveLength(2);
  for (const { httpOnly, secure } of oturum) expect([httpOnly, secure]).toEqual([true, true]);

  await cikisYap(page);
  await page.reload();
  await page.getByRole("link", { name: metin("vitrin.hesap.giris") }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(metin("vitrin.giris.baslik"));
  await yuklenmesiniBekle(page);
  await alan(page, "vitrin.giris.eposta").fill(eposta);
  await alan(page, "vitrin.giris.sifre").fill(sifre);
  await page.getByRole("button", { name: metin("vitrin.giris.gonder") }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(eposta, { exact: true })).toBeVisible();
});

test("kısa anahtar dolunca sayfa yenilenince oturum açık kalır, çerez yenilenir", async ({
  page,
}) => {
  const eposta = yeniEposta();
  await kayitOl(page, eposta);
  await page.context().clearCookies({ name: oturumCerezAdlari.musteri.kisa });
  await page.reload();
  await expect(page.getByText(eposta, { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await page.context().cookies()).map(({ name }) => name))
    .toContain(oturumCerezAdlari.musteri.kisa);
});

test("pazarlama kutusu işaretsiz gelir, zorunlu kutular işaretlenmeden kayıt gitmez", async ({
  page,
}) => {
  let kayitIstegi = 0;
  page.on("request", (istek) => {
    if (istek.url().endsWith("/musteri-kayit")) kayitIstegi += 1;
  });
  await page.goto(vitrinAdresleri.kayit);
  await yuklenmesiniBekle(page);
  await expect(pazarlamaKutusu(page)).not.toBeChecked();
  await expect(alan(page, "vitrin.kayit.uyelikOnayi")).not.toBeChecked();
  await expect(alan(page, "vitrin.kayit.kvkkOnayi")).not.toBeChecked();

  await alan(page, "vitrin.kayit.eposta").fill(yeniEposta());
  await alan(page, "vitrin.kayit.sifre").fill(sifre);
  await kayitGonder(page);
  await expect(page.getByText(metin("vitrin.kayit.hataOnay"))).toHaveCount(2);
  await expect(alan(page, "vitrin.kayit.uyelikOnayi")).toBeFocused();
  expect(kayitIstegi).toBe(0);
});

test("kısa şifre ve bozuk e-posta alanın altında yazıyla söylenir", async ({ page }) => {
  await page.goto(vitrinAdresleri.kayit);
  await yuklenmesiniBekle(page);
  await alan(page, "vitrin.kayit.eposta").fill("gecersiz");
  await alan(page, "vitrin.kayit.sifre").fill("kisa");
  await kayitGonder(page);
  await expect(page.getByText(metin("vitrin.kayit.hataEposta"))).toBeVisible();
  await expect(
    page.getByText(doldur(metin("vitrin.kayit.hataSifre"), { enKisa: String(sifreSiniri.enKisa) })),
  ).toBeVisible();
  await expect(alan(page, "vitrin.kayit.eposta")).toBeFocused();
});

test("kayıtlı e-posta açıkça söylenir, giriş sayfasına bağlantı verilir", async ({ page }) => {
  const eposta = yeniEposta();
  await kayitOl(page, eposta);
  await cikisYap(page);
  await kayitFormunuDoldur(page, eposta);
  await kayitGonder(page);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    metin("vitrin.kayit.hataKayitli"),
  );
  await page.getByRole("link", { name: metin("vitrin.kayit.girisBaglanti") }).click();
  await expect(page).toHaveURL(new RegExp(`${vitrinAdresleri.giris}$`));
});

test("robot cevabı reddedilirse form yeni soruyla bir kez daha dener", async ({ page }) => {
  const eposta = yeniEposta();
  let istekSayisi = 0;
  await page.route("**/kapi/herkese-acik/musteri-kayit", async (yol) => {
    istekSayisi += 1;
    if (istekSayisi === 1) {
      await yol.continue({
        postData: JSON.stringify({ ...yol.request().postDataJSON(), robotCevabi: "uydurma" }),
      });
    } else {
      await yol.continue();
    }
  });
  await kayitOl(page, eposta);
  expect(istekSayisi).toBe(2);
});

test("robot sorusu ilk seferde alınamazsa gönderirken yeniden alınır", async ({ page }) => {
  let soruSayisi = 0;
  await page.route("**/kapi/herkese-acik/robot-sorusu", async (yol) => {
    soruSayisi += 1;
    // İlk sorular (sayfa açılışı) ağ hatasına düşer, gönderimdeki geçer.
    if (soruSayisi === 1) await yol.abort();
    else await yol.continue();
  });
  await kayitOl(page, yeniEposta());
});

test("sunucu hatasında girişli müşteri ana sayfada 'Giriş yap' görmez", async ({ page }) => {
  const eposta = yeniEposta();
  await kayitOl(page, eposta);
  await page.route("**/kapi/musteri/hesabim", (yol) => yol.fulfill({ status: 500, body: "{}" }));
  const yanit = page.waitForResponse("**/kapi/musteri/hesabim");
  await page.reload();
  await yanit;
  await expect(page.getByRole("link", { name: metin("vitrin.hesap.giris") })).toHaveCount(0);
});

test("yanlış şifrede uyarı yazıyla görünür, sayfada kalır", async ({ page }) => {
  await page.goto(vitrinAdresleri.giris);
  await yuklenmesiniBekle(page);
  await alan(page, "vitrin.giris.eposta").fill(yeniEposta());
  await alan(page, "vitrin.giris.sifre").fill("yanlis-bir-sifre");
  await page.getByRole("button", { name: metin("vitrin.giris.gonder") }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText(metin("vitrin.giris.hataBilgi"));
  await expect(page).toHaveURL(new RegExp(`${vitrinAdresleri.giris}$`));
});

test("kayıt formu yalnız klavyeyle doldurulur ve gönderilir", async ({ page }) => {
  const eposta = yeniEposta();
  await page.goto(vitrinAdresleri.kayit);
  await yuklenmesiniBekle(page);
  await alan(page, "vitrin.kayit.eposta").focus();
  await page.keyboard.type(eposta);
  await page.keyboard.press("Tab");
  await expect(alan(page, "vitrin.kayit.sifre")).toBeFocused();
  await page.keyboard.type(sifre);
  await page.keyboard.press("Tab");
  await expect(alan(page, "vitrin.kayit.uyelikOnayi")).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: metin("vitrin.kayit.uyelikBaglanti") }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(alan(page, "vitrin.kayit.kvkkOnayi")).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(pazarlamaKutusu(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: metin("vitrin.kayit.gonder") })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(eposta, { exact: true })).toBeVisible();
});

test("giriş formu yalnız klavyeyle doldurulur ve gönderilir", async ({ page }) => {
  const eposta = yeniEposta();
  await kayitOl(page, eposta);
  await cikisYap(page);
  await page.goto(vitrinAdresleri.giris);
  await yuklenmesiniBekle(page);
  await alan(page, "vitrin.giris.eposta").focus();
  await page.keyboard.type(eposta);
  await page.keyboard.press("Tab");
  await page.keyboard.type(sifre);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: metin("vitrin.giris.gonder") })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText(eposta, { exact: true })).toBeVisible();
});

test("kayıt formu kod yüklenmeden gönderilmez, şifre adres satırına düşmez", async ({ page }) => {
  await page.route("**/_next/static/**", () => undefined);
  await page.goto(vitrinAdresleri.kayit, { waitUntil: "commit" });
  await expect(page.getByRole("button", { name: metin("vitrin.kayit.gonder") })).toBeDisabled();
  await alan(page, "vitrin.kayit.sifre").fill(sifre);
  await page.keyboard.press("Enter");
  expect(page.url()).not.toContain(sifre);
});

test("yasal metinlerin bağlantıları yeni sekmede açılır, doldurulan form kaybolmaz", async ({
  page,
  context,
}) => {
  await page.goto(vitrinAdresleri.kayit);
  await yuklenmesiniBekle(page);
  const eposta = yeniEposta();
  await alan(page, "vitrin.kayit.eposta").fill(eposta);
  for (const [baglanti, baslik] of [
    [metin("vitrin.kayit.uyelikBaglanti"), metin("vitrin.yasal.uyelik.baslik")],
    [metin("vitrin.kayit.kvkkBaglanti"), metin("vitrin.yasal.kvkk.baslik")],
  ] as const) {
    const [yeni] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: baglanti }).click(),
    ]);
    await expect(yeni.getByRole("heading", { level: 1 })).toHaveText(baslik);
    await yeni.close();
  }
  await expect(alan(page, "vitrin.kayit.eposta")).toHaveValue(eposta);
});

for (const [ad, width, height] of [
  ["telefon", 360, 740],
  ["tablet", 768, 1024],
  ["bilgisayar", 1280, 800],
] as const) {
  for (const adres of [vitrinAdresleri.kayit, vitrinAdresleri.giris, vitrinAdresleri.anasayfa]) {
    test(`${adres} ${ad} genişliğinde yana kaymaz, öğeler parmakla basılır`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(adres);
      await yuklenmesiniBekle(page);
      const genislik = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(genislik).toBeLessThanOrEqual(width);
      const ogeler = page.locator(
        // Onay kutusu (Radix'te rolü checkbox olan düğme) etiketiyle ölçülür: dokunma alanı yazısıdır.
        "main input:not([type=checkbox]), main button:not([role=checkbox]), main a, nav a, nav button",
      );
      const adet = await ogeler.count();
      expect(adet).toBeGreaterThan(0);
      for (let sira = 0; sira < adet; sira++) {
        const kutu = await ogeler.nth(sira).boundingBox();
        expect(kutu?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      for (const kutu of await page.getByRole("checkbox").all()) {
        const etiket = await kutu.locator("xpath=ancestor::label").boundingBox();
        expect(etiket?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });
  }
}
