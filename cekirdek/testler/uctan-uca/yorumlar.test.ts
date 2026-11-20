// Ürün yorumları gerçek tarayıcıda (kart 0139, karar 0109). Test kendi ürününü ve müşterisini açar, sonunda
// ürünü siler (site ürün adı çekirdeğin testine yazılmaz). "Yalnız satın alanlar yorum yapabilir" sitenin
// ayarıdır; test kapalı olduğu sitede çalışır, açıksa atlanır.
// - Girişsiz müşteri "Yorum yaz"a basınca girişe gider, girişten sonra ürünün yorumlarına döner.
// - Form klavyeyle doldurulur: puan ok tuşlarıyla, boş gönderimde hatalar alana bağlanır ve odak ilk hataya
//   gider; gönderilince pencere kapanır, teşekkür duyurulur. Yorum onaya kadar sayfada görünmez.
// - Onaylanan yorum görünür: kısaltılmış ad, puan, ortalama ve dağılım; yorum metnindeki HTML yazı olarak görünür.
// - Yorumlu sayfa ve açık form iki renkte ve üç genişlikte taramadan geçer, yana kaymaz.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { hesapAc } from "../../moduller/oturum/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { yorumlar } from "../../moduller/yorum/model";
import { yorumServisi } from "../../moduller/yorum/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
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
let urun: string;
let adres: string;
const temizlik: (() => Promise<unknown>)[] = [];

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const ek = randomUUID().slice(0, 8);
  const servis = calisanSiteninUrunServisi();
  urun = await servis.urunEkle(vt, yapan, {
    ad: `Yorumlu deneme ${ek}`,
    adresAdi: `yorumlu-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  temizlik.push(() => servis.urunSil(vt, yapan, urun));
  adres = kayitAdresleri.urun(`yorumlu-deneme-${ek}`);
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim();
  await vt.$client.end();
});

const musteriAc = async () => {
  const eposta = `yorum-${randomUUID().slice(0, 8)}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, "musteri", { eposta, sifre });
  return { eposta, kimlik: hesapKimligi };
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

const yorumYazDugmesi = (page: Page) =>
  page.getByRole("button", { name: metin("vitrin.yorum.yorumYaz") });

test("girişsiz müşteri girişe gider, ürüne döner; form klavyeyle doldurulur, yorum onaya kadar görünmez", async ({
  page,
}) => {
  const ayar = await siteninMagazaAyarlari(vt, calisanSite());
  test.skip(ayar.yorumYalnizSatinAlanlar, "Bu sitede yalnız satın alanlar yorum yazabilir.");
  const musteri = await musteriAc();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(adres);
  await sayfaHazir(page);
  await expect(page.getByText(metin("vitrin.yorum.ilkYorum"))).toBeVisible();

  // Girişsiz: giriş sayfasına, dönüş adresi yorumlar.
  await yorumYazDugmesi(page).click();
  await expect(page).toHaveURL(/\/giris\?donus=/);
  await sayfaHazir(page);
  await page.getByLabel(metin("vitrin.giris.eposta"), { exact: true }).fill(musteri.eposta);
  await page.getByLabel(metin("vitrin.giris.sifre"), { exact: true }).fill(sifre);
  await page.getByRole("button", { name: metin("vitrin.giris.gonder") }).click();
  await expect(page).toHaveURL(new RegExp(`${adres}#yorumlar$`));
  await sayfaHazir(page);

  // Klavyeyle: düğmeye odaklanıp Enter; boş gönderim hataları gösterir, odak puana gider.
  await yorumYazDugmesi(page).focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: metin("vitrin.yorum.pencereBasligi") });
  await expect(pencere).toBeVisible();
  await pencere.getByRole("button", { name: metin("vitrin.yorum.gonder") }).focus();
  await page.keyboard.press("Enter");
  await expect(pencere.getByText(metin("vitrin.yorum.hataPuan"))).toBeVisible();
  await expect(pencere.getByText(metin("vitrin.yorum.hataAd"))).toBeVisible();
  const puanGrubu = pencere.getByRole("radiogroup", { name: metin("vitrin.yorum.puanAlani") });
  await expect(puanGrubu).toHaveAttribute("aria-invalid", "true");
  await expect(puanGrubu.getByRole("radio").first()).toBeFocused();
  await tara(page, "açık form, hatalı");

  // Puan: ilk seçenek (5 yıldız) boşlukla, ok tuşu bir sonrakine (4 yıldız) geçer ve seçer.
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown", { delay: 50 });
  const dort = doldur(metin("vitrin.yorum.puanSecenegi"), { puan: "4" });
  await expect(puanGrubu.getByRole("radio", { name: dort })).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(pencere.getByLabel(metin("vitrin.yorum.adAlani"), { exact: true })).toBeFocused();
  await page.keyboard.type("Elif Kaya");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Güzel ürün");
  await page.keyboard.press("Tab");
  await page.keyboard.type("<b>kalın</b> değil, düz yazı");
  await pencere.getByRole("button", { name: metin("vitrin.yorum.gonder") }).focus();
  await page.keyboard.press("Enter");
  await expect(pencere).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: metin("vitrin.yorum.gonderildi") }),
  ).toBeVisible();

  // Onaya kadar görünmez.
  const [satir] = await vt
    .select()
    .from(yorumlar)
    .where(eq(yorumlar.musteri_kimligi, musteri.kimlik));
  expect(satir).toMatchObject({ durum: "onay-bekliyor", puan: 4, ad: "Elif K." });
  await page.reload();
  await sayfaHazir(page);
  await expect(page.getByText(metin("vitrin.yorum.ilkYorum"))).toBeVisible();
  await expect(page.getByText("Elif K.")).toHaveCount(0);

  // İkinci yorum yazılamaz: neden düğmenin yanında.
  await yorumYazDugmesi(page).click();
  await expect(page.getByText(metin("vitrin.yorum.yorumYazildi"))).toBeVisible();

  // Onaylanınca görünür: ad, başlık, metin yazı olarak; ortalama ve dağılım.
  if (satir === undefined) throw new Error("Yorum yazılmadı.");
  await yorumServisi(calisanSite()).karar(vt, yapan, satir.kimlik, "yayinda");
  await page.reload();
  await sayfaHazir(page);
  const bolum = page.locator("#yorumlar");
  await expect(bolum.getByText("Elif K.")).toBeVisible();
  await expect(bolum.getByRole("heading", { name: "Güzel ürün" })).toBeVisible();
  await expect(bolum.getByText("<b>kalın</b> değil, düz yazı")).toBeVisible();
  await expect(bolum.locator("b")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: doldur(metin("vitrin.yorum.yorumSayisi"), { sayi: "1" }) }),
  ).toBeVisible();
});

test("yorumlu ürün sayfası iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; daha fazla yorum adresle gelir", async ({
  page,
}) => {
  const servis = yorumServisi(calisanSite());
  const ayar = await siteninMagazaAyarlari(vt, calisanSite());
  test.skip(ayar.yorumYalnizSatinAlanlar, "Bu sitede yalnız satın alanlar yorum yazabilir.");
  for (let i = 0; i < 7; i++) {
    const { kimlik } = await musteriAc();
    const yorum = await servis.yorumYaz(vt, kimlik, {
      urun,
      puan: (i % 5) + 1,
      ...(i % 2 === 0 ? { baslik: `Başlık ${i}` } : {}),
      metin: `Deneme yorumu ${i}\nikinci satır`,
      ad: `Müşteri Soyad${i}`,
    });
    await servis.karar(vt, yapan, yorum, "yayinda");
  }
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const genislik of genislikler) {
      await page.setViewportSize(genislik);
      await page.goto(adres);
      await sayfaHazir(page);
      await expect(page.locator("#yorumlar li").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0);
      await tara(page, `${renk}, ${genislik.width}`);
    }
  }
  // İlk sayfada beş yorum; "Daha fazla yorum" ikinci sayfayı adresle getirir.
  const ilkSayi = await page.locator("#yorumlar ul:not([aria-label]) > li").count();
  await page.getByRole("link", { name: metin("vitrin.yorum.dahaFazla") }).click();
  await expect(page).toHaveURL(/yorum-sayfasi=2#yorumlar$/);
  await sayfaHazir(page);
  expect(await page.locator("#yorumlar ul:not([aria-label]) > li").count()).toBeGreaterThan(
    ilkSayi,
  );
});
