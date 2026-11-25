// Ekibe davet tarayıcıda baştan sona (kart 0275, karar 0179):
// - Mağaza sahibi Ekip'te "Davet et"i klavyeyle açar; boş gönderimde e-postanın hatası ve odak; e-postayı yazar, rolü
//   boşlukla seçer, Enter'la gönderir. "Davet hazır" penceresinde odak bağlantıda, "Kopyala" panoya yazar, "Tamam"
//   kapatır ve odak "Davet et"e döner. Listede "Davet bekliyor" ve son geçerli an.
// - İkinci davet onayla geri alınır; satır kalkar, odak "Davet et"e geçer.
// - Davet edilen kişi kendi tarayıcısında bağlantıyı açar: e-posta yazılı ve değiştirilemez; boş adla gönderimde adın
//   hatası ve odak; adını ve şifresini koyar, kurulum ekranında telefonunu bağlar, panele girer. Sipariş görevlisi
//   olarak Ekip'i göremez.
// - Mağaza sahibinin listesinde yeni kullanıcı adıyla, davet satırı yok. Kullanılmış bağlantı "Bu davet geçerli değil".
// - Davet penceresi, "Davet hazır", davetli liste, kabul formu ve geçersiz sayfa iki renkte ve üç genişlikte taramadan
//   geçer, yana kaymaz; konsolda beklenmeyen hata yok.
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { ekipAdresi } from "../../yonetim-paneli/adresler";
import { bildirimSuresiniDurdur } from "./bildirim-suresi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, kurulumuBitir, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

const tara = async (page: Page, ne: string) => {
  await bildirimSuresiniDurdur(page);
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) =>
          Number.isFinite(a.effect?.getComputedTiming().endTime ?? Number.POSITIVE_INFINITY),
        )
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const sonuc = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("nextjs-portal")
    .analyze();
  expect(
    sonuc.violations.map((ihlal) => ({
      kural: ihlal.id,
      ogeler: ihlal.nodes.map((oge) => oge.target.join(" ")),
    })),
    ne,
  ).toEqual([]);
};

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

const yeniEposta = () =>
  `davetli-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@ornek.test`;

test("ekibe davet: gönderme, kopyalama, geri alma, kabul ve kurulum; klavye ve tarama", async ({
  page,
  browser,
  context,
}) => {
  test.setTimeout(420_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const hatalar = konsoluDinle(page);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const sahip = yoneticiAc();
  await paneleGir(page, sahip);
  await page.goto(ekipAdresi);
  await sayfaHazir(page);

  // Pencere klavyeyle açılır; boş gönderimde e-postanın hatası ve odak.
  const davetEt = page.getByRole("button", { name: metin("yonetim.eylem.davetEt") });
  await davetEt.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: metin("yonetim.ekip.davet.baslik") });
  await expect(pencere).toBeVisible();
  const eposta = pencere.getByRole("textbox", {
    name: new RegExp(metin("yonetim.ekip.davet.eposta")),
  });
  const gonder = pencere.getByRole("button", { name: metin("yonetim.ekip.davet.gonder") });
  await gonder.focus();
  await page.keyboard.press("Enter");
  await expect(pencere.getByText(metin("yonetim.ekip.hata.eposta-gecersiz"))).toBeVisible();
  await expect(eposta).toBeFocused();
  await ikiRenkUcGenislik(page, "davet penceresi (hatalı)");

  const davetli = yeniEposta();
  await eposta.pressSequentially(davetli);
  // Görevli seçili gelir; sipariş görevlisi de boşlukla seçilir, görevli bırakılır.
  const rol = (kod: "gorevli" | "siparis-gorevlisi") =>
    pencere.getByRole("checkbox", { name: metin(`yonetim.rol.${kod}`), exact: true });
  await expect(rol("gorevli")).toBeChecked();
  await rol("siparis-gorevlisi").focus();
  await page.keyboard.press("Space");
  await rol("gorevli").focus();
  await page.keyboard.press("Space");
  await expect(rol("gorevli")).not.toBeChecked();
  await gonder.focus();
  await page.keyboard.press("Enter");

  // Davet hazır: bağlantı bir kez, odak onda; kopyalanır.
  const hazir = page.getByRole("dialog", { name: metin("yonetim.ekip.davet.hazirBaslik") });
  await expect(hazir).toBeVisible();
  const baglantiAlani = hazir.getByRole("textbox", { name: metin("yonetim.ekip.davet.baglanti") });
  await expect(baglantiAlani).toBeFocused();
  const baglanti = await baglantiAlani.inputValue();
  expect(baglanti).toMatch(/\/yonetim\/giris\/davet#anahtar=/);
  await hazir.getByRole("button", { name: metin("yonetim.ekip.davet.kopyala") }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(baglanti);
  await ikiRenkUcGenislik(page, "davet hazır");
  await hazir.getByRole("button", { name: metin("yonetim.ekip.davet.tamam") }).focus();
  await page.keyboard.press("Enter");
  await expect(hazir).toBeHidden();
  await expect(davetEt).toBeFocused();

  const liste = page.getByRole("list", { name: metin("yonetim.ekip.liste") });
  const davetSatiri = liste.getByRole("listitem").filter({ hasText: davetli });
  await expect(davetSatiri).toContainText(metin("yonetim.ekip.davet.bekliyor"));
  await expect(davetSatiri).toContainText(metin("yonetim.rol.siparis-gorevlisi"));
  await ikiRenkUcGenislik(page, "davetli ekip listesi");

  // İkinci davet onayla geri alınır; odak "Davet et"e geçer.
  const geriAlinacak = yeniEposta();
  await davetEt.click();
  await pencere
    .getByRole("textbox", { name: new RegExp(metin("yonetim.ekip.davet.eposta")) })
    .fill(geriAlinacak);
  await gonder.click();
  await hazir.getByRole("button", { name: metin("yonetim.ekip.davet.tamam") }).click();
  const geriAl = liste
    .getByRole("listitem")
    .filter({ hasText: geriAlinacak })
    .getByRole("button", {
      name: doldur(metin("yonetim.ekip.davet.geriAlAdi"), { eposta: geriAlinacak }),
    });
  await geriAl.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: metin("yonetim.ekip.davet.geriAlOnay.onay") })
    .click();
  await expect(liste.getByRole("listitem").filter({ hasText: geriAlinacak })).toHaveCount(0);
  await expect(davetEt).toBeFocused();

  // Davet edilen kişi kendi tarayıcısında.
  const kisiBaglami = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const kisi = await kisiBaglami.newPage();
  const kisiHatalari = konsoluDinle(kisi);
  await ayriBaglanti(kisi);
  const adres = new URL(baglanti);
  await kisi.goto(`${adres.pathname}${adres.hash}`);
  await sayfaHazir(kisi);
  await expect(kisi.getByRole("heading", { level: 1 })).toHaveText(metin("yonetim.davet.baslik"));
  expect(new URL(kisi.url()).hash).toBe("");
  const kisiEposta = kisi.getByRole("textbox", {
    name: new RegExp(`^${metin("yonetim.davet.eposta")}`),
  });
  await expect(kisiEposta).toHaveValue(davetli);
  await expect(kisiEposta).toHaveAttribute("readonly", "");
  await expect(
    kisi.getByText(metin("yonetim.rol.siparis-gorevlisi"), { exact: false }),
  ).toBeVisible();
  const devam = kisi.getByRole("button", { name: metin("yonetim.davet.gonder") });
  await devam.focus();
  await kisi.keyboard.press("Enter");
  const ad = kisi.getByRole("textbox", { name: new RegExp(`^${metin("yonetim.davet.ad")}`) });
  await expect(ad).toBeFocused();
  await expect(ad).toHaveAttribute("aria-invalid", "true");
  await ikiRenkUcGenislik(kisi, "davet kabul formu (hatalı)");
  await ad.pressSequentially("Ece Deniz");
  await kisi
    .getByLabel(new RegExp(`^${metin("yonetim.davet.sifre")}`))
    .fill("uzun-bir-deneme-sifresi");
  await devam.focus();
  await kisi.keyboard.press("Enter");
  await kurulumuBitir(kisi);
  await expect(kisi).toHaveURL(/\/yonetim$/);
  await sayfaHazir(kisi);
  const kisiMenusu = kisi.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
  await expect(
    kisiMenusu.getByRole("link", { name: metin("yonetim.sayfa.siparisler.ad") }),
  ).toBeVisible();
  await expect(kisiMenusu.getByRole("link", { name: metin("yonetim.sayfa.ekip.ad") })).toHaveCount(
    0,
  );
  expect(kisiHatalari).toEqual([]);
  await kisiBaglami.close();

  // Mağaza sahibinin listesinde adıyla; davet satırı kalktı.
  await page.reload();
  await sayfaHazir(page);
  const yeniSatir = liste.getByRole("listitem").filter({ hasText: davetli });
  await expect(yeniSatir.getByRole("link", { name: "Ece Deniz" })).toBeVisible();
  await expect(yeniSatir).not.toContainText(metin("yonetim.ekip.davet.bekliyor"));

  // Kullanılmış bağlantı geçersiz.
  const ucuncuBaglam = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ucuncu = await ucuncuBaglam.newPage();
  const ucuncuHatalari = konsoluDinle(ucuncu, { haric: (ileti) => /status of 422/.test(ileti) });
  await ayriBaglanti(ucuncu);
  await ucuncu.goto(`${adres.pathname}${adres.hash}`);
  await sayfaHazir(ucuncu);
  await expect(ucuncu.getByRole("heading", { level: 1 })).toHaveText(
    metin("yonetim.davet.gecersizBaslik"),
  );
  await ikiRenkUcGenislik(ucuncu, "geçersiz davet");
  expect(ucuncuHatalari).toEqual([]);
  await ucuncuBaglam.close();

  expect(hatalar).toEqual([]);
});
