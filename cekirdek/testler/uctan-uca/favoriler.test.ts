// Favoriler gerçek tarayıcıda (kart 0140, karar 0110). Test kendi ürünlerini ve müşterisini açar, sonunda ürünleri
// siler (site ürün adı çekirdeğin testine yazılmaz).
// - Üye olmayan müşteri ürün sayfasından klavyeyle favori ekler; düğme basılı durumunu söyler, üst kısımdaki sayı
//   artar; favoriler sayfasında ürünler ve "bu cihazda saklanıyor" bilgisi görünür.
// - Giriş yapınca favoriler hesabına geçer: hesapta zaten olan ürün ikinci kez eklenmez, tarayıcının deposu
//   boşalır, bilgi kalkar.
// - Favoriler sayfasında çıkarılan ürün hemen kalkar, "Geri al" onu geri koyar; çıkıştan sonra liste boş görünür.
// - Dolu ve boş favoriler sayfası iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; sayfa arama motorlarına
//   kapalıdır.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { favoriDepoAnahtari } from "../../kayitlar/favori";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { favoriler } from "../../moduller/favori/model";
import { favoriServisi } from "../../moduller/favori/servis";
import { hesapAc } from "../../moduller/oturum/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../../vitrin/adresler";
import { hesaptanCik } from "./hesap";
import { sayfaHazir } from "./sayfa-hazir";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = sistemIslemi("tarayici-testi");
const sifre = "uzun-bir-deneme-sifresi";
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

let vt: Veritabani;
const urunler: { kimlik: string; ad: string; adres: string }[] = [];
const temizlik: (() => Promise<unknown>)[] = [];

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const servis = calisanSiteninUrunServisi();
  for (const sira of [1, 2]) {
    const ek = randomUUID().slice(0, 8);
    const ad = `Favori deneme ${sira} ${ek}`;
    const kimlik = await servis.urunEkle(vt, yapan, {
      ad,
      adresAdi: `favori-deneme-${ek}`,
      vergiSinifi: null,
      durum: "yayinda",
    });
    temizlik.push(() => servis.urunSil(vt, yapan, kimlik));
    urunler.push({ kimlik, ad, adres: kayitAdresleri.urun(`favori-deneme-${ek}`) });
  }
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim();
  await vt.$client.end();
});

const urun = (sira: number) => {
  const kayit = urunler[sira];
  if (kayit === undefined) throw new Error("Ürün açılmadı.");
  return kayit;
};

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

const favoriDugmesi = (page: Page, ad: string, favoride: boolean) =>
  page.getByRole("main").getByRole("button", {
    name: doldur(
      metin(favoride ? "vitrin.urunKarti.favoridenCikar" : "vitrin.urunKarti.favoriyeEkle"),
      { urun: ad },
    ),
    exact: true,
  });
const ustSayi = (page: Page) =>
  page
    .getByRole("banner")
    .getByRole("link", { name: new RegExp(`^${metin("vitrin.bolum.ustSatir.favoriler")}`) })
    .first();
const liste = (page: Page) => page.getByRole("list", { name: metin("vitrin.favori.urunler") });
const cihazdaBilgisi = (page: Page) => page.getByText(metin("vitrin.favori.cihazda"));

// Ürün sayfasında favori düğmesine klavyeyle basar; düğme basılı olur.
const sayfadanEkle = async (page: Page, sira: number) => {
  const { ad, adres } = urun(sira);
  await page.goto(adres);
  await sayfaHazir(page);
  await favoriDugmesi(page, ad, false).focus();
  await page.keyboard.press("Enter");
  await expect(favoriDugmesi(page, ad, true)).toHaveAttribute("aria-pressed", "true");
};

test("üye olmayan müşterinin favorileri giriş yapınca hesabına geçer, aynı ürün iki kez olmaz", async ({
  page,
}) => {
  const eposta = `favori-${randomUUID().slice(0, 8)}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, "musteri", { eposta, sifre });
  // Hesapta ikinci ürün zaten var.
  await favoriServisi(calisanSite()).favoriDegistir(vt, hesapKimligi, urun(1).kimlik, true);
  await page.setViewportSize({ width: 1280, height: 900 });

  await sayfadanEkle(page, 0);
  await expect(ustSayi(page)).toContainText("1");
  await sayfadanEkle(page, 1);
  await expect(ustSayi(page)).toContainText("2");
  expect(await page.evaluate((anahtar) => localStorage.getItem(anahtar), favoriDepoAnahtari)).toBe(
    JSON.stringify([urun(1).kimlik, urun(0).kimlik]),
  );

  // Favoriler sayfası: iki kart, "bu cihazda" bilgisi.
  await page.goto(vitrinAdresleri.favoriler);
  await sayfaHazir(page);
  await expect(liste(page).getByRole("listitem")).toHaveCount(2);
  await expect(cihazdaBilgisi(page)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // Bilgideki "Giriş yap" giriş sayfasına, oradan favorilere döner.
  await page
    .getByRole("main")
    .getByRole("link", { name: metin("vitrin.favori.girisBaglantisi") })
    .click();
  await expect(page).toHaveURL(/\/giris\?donus=/);
  await sayfaHazir(page);
  await page.getByLabel(metin("vitrin.giris.eposta"), { exact: true }).fill(eposta);
  await page.getByLabel(metin("vitrin.giris.sifre"), { exact: true }).fill(sifre);
  await page.getByRole("button", { name: metin("vitrin.giris.gonder") }).click();
  await expect(page).toHaveURL(new RegExp(`${vitrinAdresleri.favoriler}$`));
  await sayfaHazir(page);
  await expect(liste(page).getByRole("heading")).toHaveText([urun(0).ad, urun(1).ad]);
  await expect(cihazdaBilgisi(page)).toHaveCount(0);
  const satirlar = async () =>
    (
      await vt
        .select({ urun: favoriler.urun_kimligi })
        .from(favoriler)
        .where(eq(favoriler.musteri_kimligi, hesapKimligi))
    )
      .map((satir) => satir.urun)
      .toSorted();
  expect(await satirlar()).toEqual([urun(0).kimlik, urun(1).kimlik].toSorted());
  expect(
    await page.evaluate((anahtar) => localStorage.getItem(anahtar), favoriDepoAnahtari),
  ).toBeNull();

  // Klavyeyle: çıkarılan ürün hemen kalkar, odak kalan kartın favori düğmesine geçer. "Geri al" bildirim alanında
  // klavyeyle (Alt+T, Tab) bulunur ve ürünü eski yerine koyar.
  await favoriDugmesi(page, urun(0).ad, true).focus();
  await page.keyboard.press("Enter");
  await expect(liste(page).getByRole("listitem")).toHaveCount(1);
  await expect(favoriDugmesi(page, urun(1).ad, true)).toBeFocused();
  await expect.poll(satirlar).toEqual([urun(1).kimlik]);
  const geriAl = page.getByRole("button", { name: metin("vitrin.favori.geriAl") });
  await expect(geriAl).toBeVisible();
  await page.keyboard.press("Alt+t");
  for (
    let adim = 0;
    adim < 5 && !(await geriAl.evaluate((oge) => oge === document.activeElement));
    adim++
  ) {
    await page.keyboard.press("Tab");
  }
  await expect(geriAl).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(liste(page).getByRole("listitem")).toHaveCount(2);
  // Birleşmede tarayıcıdan gelen ürün hesaptakinden yenidir, başta durur; geri alınınca yine baştadır.
  await expect(liste(page).getByRole("heading")).toHaveText([urun(0).ad, urun(1).ad]);
  await expect.poll(satirlar).toEqual([urun(0).kimlik, urun(1).kimlik].toSorted());
  // Bildirim kapanınca odak klavye kullanıcısının kaldığı karta döner.
  await expect(geriAl).toHaveCount(0);
  await expect(favoriDugmesi(page, urun(1).ad, true)).toBeFocused();

  // Çıkıştan sonra bu cihazda favoriler boş görünür; hesaptakiler kalır.
  await hesaptanCik(page);
  await page.goto(vitrinAdresleri.favoriler);
  await sayfaHazir(page);
  await expect(page.getByText(metin("vitrin.favori.bosBaslik"))).toBeVisible();
  expect(await satirlar()).toHaveLength(2);
});

test("favoriler sayfası dolu ve boşken iki renkte ve üç genişlikte taramadan geçer, yana kaymaz", async ({
  page,
}) => {
  for (const dolu of [true, false]) {
    await page.goto(vitrinAdresleri.anasayfa);
    await page.evaluate(
      ({ anahtar, deger }) =>
        deger === null ? localStorage.removeItem(anahtar) : localStorage.setItem(anahtar, deger),
      {
        anahtar: favoriDepoAnahtari,
        deger: dolu ? JSON.stringify([urun(0).kimlik, urun(1).kimlik]) : null,
      },
    );
    for (const renk of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: renk });
      for (const genislik of genislikler) {
        await page.setViewportSize(genislik);
        await page.goto(vitrinAdresleri.favoriler);
        await sayfaHazir(page);
        if (dolu) await expect(liste(page).getByRole("listitem")).toHaveCount(2);
        else await expect(page.getByText(metin("vitrin.favori.bosBaslik"))).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        ).toBe(0);
        await tara(page, `${dolu ? "dolu" : "boş"}, ${renk}, ${genislik.width}`);
      }
    }
  }
});
