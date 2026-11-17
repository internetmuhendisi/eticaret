// Panelin ödeme yöntemleri ve banka hesapları ekranları gerçek tarayıcıda (kart 0214, karar 0141):
// - Mağaza sahibi menüden klavyeyle "Ödeme yöntemleri"ne gelir; ekran iki renkte ve üç genişlikte taramadan geçer, yana
//   kaymaz. Bütün yöntemler anahtarla kapatılıp kaydedilince "en az bir yöntem" uyarısı görünür, hiçbir şey kaydedilmez;
//   Vazgeç formu geri alır. İptal süresi klavyeyle değişip kaydedilir, sonra eski hâline döner.
// - "Banka hesapları"nda komut çubuğundaki "Hesap ekle" yan pencereyi açar; boş gönderimde alanlar hatalıdır, hatalı
//   IBAN alanın altında söylenir, doğru IBAN kaydedilir ve listede gruplanmış görünür; pencere iki renkte ve üç
//   genişlikte taramadan geçer. Hesap onay penceresiyle silinir (önce Vazgeç).
// Ödeme yöntemleri sitenin paylaşılan ayarıdır: test yalnız iptal süresini ve kendi eklediği hesabı değiştirir, sonunda
// geri alır (öteki tarayıcı testleri ödeme adımında yöntemleri ve hesapları kullanır).
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const servis = () => odemeYontemiServisi(calisanSite());
// Testin eklediği hesabın numarası: geçerli, mağazanın hesaplarında olmayan bir örnek.
const denemeIbani = "TR750009900000000000000099";
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

test.afterAll(async () => {
  // Yarıda kalan çalışmanın hesabı da kaldırılır.
  const { bankaHesaplari } = await servis().oku(vt);
  for (const hesap of bankaHesaplari.filter((h) => h.iban === denemeIbani)) {
    await servis().hesapSil(vt, sistemIslemi("uctan-uca-odeme-yontemleri"), hesap.kimlik);
  }
  await vt.$client.end();
});

const tara = async (page: Page, ne: string) => {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY)
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

const menudenGit = async (page: Page, ad: string, yol: RegExp) => {
  const baglanti = page
    .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
    .getByRole("link", { name: ad });
  await baglanti.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(yol);
  await sayfaHazir(page);
};

test("ödeme yöntemleri: tarama, en az bir yöntem, iptal süresinin kaydı", async ({ page }) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, {
    // Bütün yöntemler kapalıyken kayıt bilerek gönderilir: uç 400 döner.
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  const ilk = await servis().oku(vt);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await menudenGit(page, metin("yonetim.sayfa.odemeYontemleri.ad"), /\/yonetim\/odeme-yontemleri$/);
  await expect(page).toHaveTitle(new RegExp(`^${metin("yonetim.sayfa.odemeYontemleri.ad")} \\|`));
  await ikiRenkUcGenislik(page, "ödeme yöntemleri");

  // Bütün açık yöntemler anahtarla (boşluk) kapatılır: kayıt "en az bir yöntem" der, ayar değişmez.
  for (const yontem of ilk.yontemler.filter((y) => y.acik)) {
    const anahtar = page.getByRole("switch", {
      name: doldur(metin("yonetim.odemeYontemleri.vitrindeAcik"), {
        ad: metin(
          yontem.kod === "havale" ? "ortak.odemeYontemi.havale" : "ortak.odemeYontemi.kapidaOdeme",
        ),
      }),
    });
    await anahtar.focus();
    await page.keyboard.press("Space");
    await expect(anahtar).toHaveAttribute("aria-checked", "false");
  }
  const kaydet = page.getByRole("button", { name: metin("yonetim.odemeYontemleri.kaydet") });
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.odemeYontemleri.hata.enAzBir"))).toBeVisible();
  await tara(page, "ödeme yöntemleri hatalı");
  expect((await servis().oku(vt)).yontemler).toEqual(ilk.yontemler);
  await page.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
  for (const yontem of ilk.yontemler) {
    await expect(page.getByRole("switch").nth(ilk.yontemler.indexOf(yontem))).toHaveAttribute(
      "aria-checked",
      String(yontem.acik),
    );
  }

  // İptal süresi: kaydedilir, sonra eski hâline döner.
  const sure = page.getByLabel(metin("yonetim.odemeYontemleri.iptalSuresi"));
  const yeni = String(ilk.havaleIptalSuresi === 30 ? 29 : ilk.havaleIptalSuresi + 1);
  await sure.fill(yeni);
  await sure.press("Enter");
  await expect(page.getByText(metin("yonetim.odemeYontemleri.kaydedildi"))).toBeVisible();
  expect((await servis().oku(vt)).havaleIptalSuresi).toBe(Number(yeni));
  await expect(sure).toHaveValue(yeni);
  await sure.fill(String(ilk.havaleIptalSuresi));
  await sure.press("Enter");
  await expect
    .poll(async () => (await servis().oku(vt)).havaleIptalSuresi)
    .toBe(ilk.havaleIptalSuresi);
  expect(hatalar).toEqual([]);
});

test("banka hesapları: pencereyle ekleme, IBAN hatası, onayla silme", async ({ page }) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, {
    // Hatalı IBAN bilerek gönderilir: uç 400 döner.
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await menudenGit(page, metin("yonetim.sayfa.bankaHesaplari.ad"), /\/yonetim\/banka-hesaplari$/);
  await ikiRenkUcGenislik(page, "banka hesapları");

  const ekle = page.getByRole("button", {
    name: doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.bankaHesaplari.hesap") }),
  });
  await ekle.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: metin("yonetim.bankaHesaplari.yeniHesap") });
  await expect(pencere).toBeVisible();
  const kaydet = pencere.getByRole("button", { name: metin("yonetim.bankaHesaplari.kaydet") });
  // Boş gönderim: alanlar hatalı, odak ilk alanda.
  await kaydet.click();
  const banka = pencere.getByLabel(metin("yonetim.bankaHesaplari.banka"));
  await expect(banka).toBeFocused();
  await expect(banka).toHaveAttribute("aria-invalid", "true");
  await banka.fill("Deneme Uçtan Uca Bankası");
  await pencere.getByLabel(metin("yonetim.bankaHesaplari.sahip")).fill("Deneme Ticaret");
  const iban = pencere.getByLabel(metin("yonetim.bankaHesaplari.iban"));
  // Kontrol hanesi tutmayan numara: alanın altında söylenir, hiçbir şey kaydedilmez.
  await iban.fill("TR76 0009 9000 0000 0000 0000 99");
  await iban.press("Enter");
  await expect(pencere.getByText(metin("yonetim.bankaHesaplari.hata.ibanKontrol"))).toBeVisible();
  await expect(iban).toBeFocused();
  await ikiRenkUcGenislik(page, "hesap penceresi hatalı");
  expect((await servis().oku(vt)).bankaHesaplari.some((h) => h.iban === denemeIbani)).toBe(false);
  await iban.fill("tr75 0009 9000 0000 0000 0000 99");
  await iban.press("Enter");
  await expect(pencere).toBeHidden();
  await expect(page.getByText(metin("yonetim.bankaHesaplari.eklendi"))).toBeVisible();
  await expect(page.getByText("TR75 0009 9000 0000 0000 0000 99")).toBeVisible();
  expect((await servis().oku(vt)).bankaHesaplari.some((h) => h.iban === denemeIbani)).toBe(true);

  // Silme onay penceresiyle sorulur; Vazgeç silmez, Sil siler.
  const sil = page.getByRole("button", {
    name: doldur(metin("yonetim.bankaHesaplari.sil"), { ad: "Deneme Uçtan Uca Bankası" }),
  });
  await sil.focus();
  await page.keyboard.press("Enter");
  const onay = page.getByRole("alertdialog");
  await expect(onay).toBeVisible();
  await tara(page, "silme onayı");
  await onay.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
  await expect(onay).toBeHidden();
  expect((await servis().oku(vt)).bankaHesaplari.some((h) => h.iban === denemeIbani)).toBe(true);
  await sil.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: metin("yonetim.bankaHesaplari.silOnay.sil") })
    .click();
  await expect(page.getByText(metin("yonetim.bankaHesaplari.silindi"))).toBeVisible();
  await expect(page.getByText("TR75 0009 9000 0000 0000 0000 99")).toHaveCount(0);
  expect((await servis().oku(vt)).bankaHesaplari.some((h) => h.iban === denemeIbani)).toBe(false);
  expect(hatalar).toEqual([]);
});
