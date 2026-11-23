// Vitrinin üst ve alt kısmı gerçek tarayıcıda ve gerçek veritabanıyla (kart 0108, karar 0083): vitrin sayfaları
// üst ve alt kısmı yalnız düzendeki bölümlerden çizer, gizlenen bölüm görünmez, panel ve geliştirme sayfaları
// çerçevenin dışındadır. Test, sitenin düzenine kendi bölümlerini ekler ve sonunda kaldırır.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { duzenServisi } from "../../moduller/duzen/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../../vitrin/adresler";
import { girisAdresi } from "../../yonetim-paneli/adresler";
import { duzenKilidiniAl } from "./duzen-kilidi";
import { satirlarinYazisi } from "./satir-hizasi";
import { sayfaHazir } from "./sayfa-hazir";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const servis = duzenServisi(calisanSite);
const kim = sistemIslemi("uctan-uca-vitrin-cercevesi");

// Düzeni değiştiren tarayıcı testleri sırayla çalışır (kart 0293, duzen-kilidi.ts).
let kilidiBirak: (() => Promise<void>) | undefined;
test.beforeEach(async () => {
  kilidiBirak = await duzenKilidiniAl(vt);
});
test.afterEach(async () => {
  await kilidiBirak?.();
  kilidiBirak = undefined;
});
test.afterAll(async () => {
  await vt.$client.end();
});

test("vitrin sayfaları üst ve alt kısmı düzenden çizer; gizlenen bölüm görünmez; panel çerçevenin dışındadır", async ({
  page,
}) => {
  const duyuru = `duyuru-${randomBytes(4).toString("hex")}`;
  const ekMetin = `ek-${randomBytes(4).toString("hex")}`;
  const duyuruBolumu = await servis.bolumEkle(
    vt,
    kim,
    "ust-kisim",
    { tur: "duyuru-seridi", degerler: { metin: duyuru } },
    0,
  );
  const telifBolumu = await servis.bolumEkle(vt, kim, "alt-kisim", {
    tur: "telif-satiri",
    degerler: { ekMetin },
  });
  try {
    for (const adres of [
      vitrinAdresleri.anasayfa,
      vitrinAdresleri.giris,
      vitrinAdresleri.uyelikSozlesmesi,
    ]) {
      await page.goto(adres);
      await expect(page.getByRole("banner").getByText(duyuru), adres).toBeVisible();
      await expect(
        page.getByRole("contentinfo").getByText(ekMetin, { exact: false }),
        adres,
      ).toBeVisible();
      // Sayfanın kendi içeriği üst ve alt kısmın arasındadır.
      await expect(page.getByRole("main"), adres).toBeVisible();
    }
    // Panelin giriş sayfası vitrin çerçevesinin dışındadır.
    await page.goto(girisAdresi);
    await expect(page.getByText(duyuru)).toHaveCount(0);

    await servis.bolumGorunurlugu(vt, kim, duyuruBolumu, true);
    await page.goto(vitrinAdresleri.anasayfa);
    await expect(page.getByText(duyuru)).toHaveCount(0);
    await expect(page.getByRole("contentinfo").getByText(ekMetin, { exact: false })).toBeVisible();
  } finally {
    await servis.bolumSil(vt, kim, duyuruBolumu);
    await servis.bolumSil(vt, kim, telifBolumu);
  }
});

// Kart 0190: alt kısımdaki e-posta adresi dar telefonda yalnız "@" ya da noktadan sonra kırılır, tireden kırılmaz
// (demo sitenin adresi tirelidir: "satis@kucuk-" / "dukkan.test" gibi kırılmaz). Test kendi iletişim bölümünü koyar.
for (const genislik of [320, 360]) {
  test(`alt kısımdaki e-posta tireden kırılmaz (${genislik} px)`, async ({ page }) => {
    const bolum = await servis.bolumEkle(vt, kim, "alt-kisim", {
      tur: "iletisim-bilgileri",
      degerler: {},
    });
    try {
      await page.setViewportSize({ width: genislik, height: 800 });
      await page.goto(vitrinAdresleri.giris);
      await sayfaHazir(page);
      const baglanti = page.getByRole("contentinfo").locator('a[href^="mailto:"]').last();
      const adres = (await baglanti.getAttribute("href"))?.replace(/^mailto:/u, "") ?? "";
      expect(adres).toContain("-");
      const satirlar = await satirlarinYazisi(baglanti);
      expect(satirlar.length, satirlar.join(" | ")).toBeGreaterThanOrEqual(2);
      expect(satirlar.join("")).toBe(adres);
      for (const satir of satirlar.slice(0, -1)) {
        expect(satir, satirlar.join(" | ")).toMatch(/[@.]$/u);
      }
      // Ekran okuyucu adresi bölmeden okur (parçalar satır içi blok: adda aralarına boşluk girmez).
      await expect(baglanti).toHaveAccessibleName(
        doldur(metin("vitrin.bolum.iletisimBilgileri.epostaBaglantisi"), { adres }),
      );
    } finally {
      await servis.bolumSil(vt, kim, bolum);
    }
  });
}

// Telefonda menü penceresi bir bağlantıya basılınca kapanır: vitrinin çerçevesi sayfalar arasında yeniden çizilmez
// (kart 0108 kontrolü). Logonun oranı katalogda geniş örnek logoyla ölçülür (katalog.test.ts).
test("telefonda menü penceresi bağlantıya basılınca kapanır", async ({ page }) => {
  const satir = await servis.bolumEkle(vt, kim, "ust-kisim", { tur: "ust-satir", degerler: {} }, 0);
  try {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(vitrinAdresleri.anasayfa);
    await sayfaHazir(page);
    const ust = page.getByRole("banner");
    await ust
      .getByRole("button", { name: metin("vitrin.bolum.ustSatir.menuyuAc") })
      .first()
      .click();
    const pencere = page.getByRole("dialog", { name: metin("vitrin.bolum.ustSatir.menuBasligi") });
    await expect(pencere).toBeVisible();
    await pencere.getByRole("link", { name: metin("vitrin.bolum.ustSatir.hesap") }).click();
    await expect(page).toHaveURL(new RegExp(`${vitrinAdresleri.giris}$`));
    await expect(pencere).toBeHidden();
  } finally {
    await servis.bolumSil(vt, kim, satir);
  }
});
