// Stoğa gelince haber ver eklentisi gerçek tarayıcıda (kart 0144, karar 0117). Testlerin sitesinde eklenti açıktır.
// Test kendi ürünlerini açar ve sonunda siler: fiyatlı, stoğu olmayan basit bir ürün ve stokta bir ürün.
// - Stoktaki üründe kutu yoktur; tükenmiş üründe stok yazısının altında görünür.
// - Üye olmayan müşteri klavyeyle: boş gönderimde hata alana bağlanır ve odak oraya gider; e-postayı yazıp Enter'la
//   gönderince teşekkür görünür ve odağı alır; talep veritabanında, aynı adres ikinci kez yazılmaz.
// - Giriş yapmış müşteri e-posta yazmaz, hesabının adresi yazar; "Haber ver" talebi hesabın adresiyle yazar.
// - Kutu açıkken, hatalıyken ve teşekkürde iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata
//   yoktur.
// - Panelde "Stok bildirimleri" menüde ve sayfada bekleyen sayıyla görünür, taramadan geçer.
// Eklentinin kapalı hâli (kutu yok, uç bulunamadı, panel sayfası yok) birim testlerindedir: tarayıcı testlerinin
// sitesinde eklenti açıktır.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { stokBildirimiTalepleri } from "../../eklentiler/stoga-gelince-haber-ver/model";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { hesapAc } from "../../moduller/oturum/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = sistemIslemi("tarayici-testi");
const sifre = "uzun-bir-deneme-sifresi";
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
// Girişsiz ziyaretçinin oturum sorusu 401 alır (karar 0098).
const haric = (ileti: string) => ileti.includes("401");

let vt: Veritabani;
const temizlik: (() => Promise<unknown>)[] = [];
const urunler = {} as Record<"tukenmis" | "stokta", { ad: string; adres: string; birim: string }>;

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const servis = calisanSiteninUrunServisi();
  const fiyat = siteninFiyatServisi(calisanSite());
  for (const ad of ["tukenmis", "stokta"] as const) {
    const ek = randomUUID().slice(0, 8);
    const urunAdi = `Haber deneme ${ek}`;
    const kimlik = await servis.urunEkle(vt, yapan, {
      ad: urunAdi,
      adresAdi: `haber-deneme-${ek}`,
      vergiSinifi: null,
      durum: "yayinda",
    });
    temizlik.push(() => servis.urunSil(vt, yapan, kimlik));
    const birim = (await servis.urunuOku(vt, kimlik))?.birimler[0]?.kimlik;
    if (birim === undefined) throw new Error("Birim yok.");
    await fiyat.fiyatYaz(vt, yapan, birim, { satisFiyati: 25_000 });
    if (ad === "stokta") {
      await stokServisi().stokDuzelt(vt, yapan, birim, {
        yeniMiktar: 5,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    urunler[ad] = { ad: urunAdi, adres: kayitAdresleri.urun(`haber-deneme-${ek}`), birim };
  }
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim();
  await vt.$client.end();
});

const kutu = (page: Page) =>
  page.getByRole("region", { name: metin("eklenti.stokBildirimi.form.baslik") });

const talepler = async () =>
  vt
    .select({ eposta: stokBildirimiTalepleri.eposta, durum: stokBildirimiTalepleri.durum })
    .from(stokBildirimiTalepleri)
    .where(eq(stokBildirimiTalepleri.birim_kimligi, urunler.tukenmis.birim));

const yanaKaymaz = async (page: Page) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const genislik of genislikler) {
      await page.setViewportSize(genislik);
      await expect(kutu(page)).toBeVisible();
      await tara(page, `${ne}, ${renk}, ${genislik.width}`);
      await yanaKaymaz(page);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
};

test("stoktaki üründe kutu yok; üye olmayan müşteri klavyeyle haber ister, aynı adres bir kez yazılır", async ({
  page,
}) => {
  await ayriBaglanti(page);
  const hatalar = konsoluDinle(page, { haric });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(urunler.stokta.adres);
  await sayfaHazir(page);
  await expect(page.locator('[data-slot="stok-durumu"]')).toBeVisible();
  await expect(kutu(page)).toHaveCount(0);

  await page.goto(urunler.tukenmis.adres);
  await sayfaHazir(page);
  await expect(page.locator('[data-slot="stok-durumu"]')).toHaveText(metin("vitrin.stok.tukendi"));
  await expect(kutu(page)).toBeVisible();
  await ikiRenkUcGenislik(page, "boş kutu");

  // Boş gönderim: hata alana bağlanır, odak alana gider, istek gitmez.
  const istekler: string[] = [];
  page.on("request", (istek) => {
    if (istek.url().includes("/kapi/herkese-acik/stok-bildirimi")) istekler.push(istek.url());
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  const alan = kutu(page).getByLabel(metin("eklenti.stokBildirimi.form.eposta"));
  const dugme = kutu(page).getByRole("button", {
    name: metin("eklenti.stokBildirimi.form.gonder"),
  });
  await dugme.focus();
  await page.keyboard.press("Enter");
  await expect(alan).toHaveAttribute("aria-invalid", "true");
  await expect(alan).toBeFocused();
  await expect(alan).toHaveAccessibleDescription(metin("eklenti.stokBildirimi.form.hataEposta"));
  expect(istekler).toEqual([]);
  await ikiRenkUcGenislik(page, "hatalı kutu");

  // Klavyeyle e-posta ve Enter: teşekkür görünür ve odağı alır; talep veritabanındadır.
  const eposta = `haber-${randomUUID().slice(0, 8)}@ornek.test`;
  await alan.fill(eposta.toUpperCase());
  await page.keyboard.press("Enter");
  const tamam = kutu(page).getByRole("status");
  await expect(tamam).toHaveText(metin("eklenti.stokBildirimi.form.tamam"));
  await expect(tamam).toBeFocused();
  await expect.poll(talepler).toEqual([{ eposta, durum: "bekliyor" }]);
  await ikiRenkUcGenislik(page, "teşekkür");

  // Aynı adres yeniden: yine teşekkür, ikinci talep yazılmaz.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await sayfaHazir(page);
  await kutu(page).getByLabel(metin("eklenti.stokBildirimi.form.eposta")).fill(eposta);
  await kutu(page)
    .getByRole("button", { name: metin("eklenti.stokBildirimi.form.gonder") })
    .click();
  await expect(kutu(page).getByRole("status")).toHaveText(
    metin("eklenti.stokBildirimi.form.tamam"),
  );
  expect(await talepler()).toEqual([{ eposta, durum: "bekliyor" }]);
  expect(hatalar).toEqual([]);
});

test("giriş yapmış müşteri hesabının adresiyle haber ister", async ({ page }) => {
  await ayriBaglanti(page);
  const hatalar = konsoluDinle(page, { haric });
  const eposta = `haber-uye-${randomUUID().slice(0, 8)}@ornek.test`;
  await hesapAc(vt, "musteri", { eposta, sifre });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/giris?donus=${encodeURIComponent(urunler.tukenmis.adres)}`);
  await sayfaHazir(page);
  await page.getByLabel(metin("vitrin.giris.eposta"), { exact: true }).fill(eposta);
  await page.getByLabel(metin("vitrin.giris.sifre"), { exact: true }).fill(sifre);
  await page.getByRole("button", { name: metin("vitrin.giris.gonder") }).click();
  await expect(page).toHaveURL(new RegExp(`${urunler.tukenmis.adres}$`));
  await sayfaHazir(page);
  await expect(
    kutu(page).getByText(doldur(metin("eklenti.stokBildirimi.form.girisli"), { eposta })),
  ).toBeVisible();
  await expect(kutu(page).getByLabel(metin("eklenti.stokBildirimi.form.eposta"))).toHaveCount(0);
  await tara(page, "girişli kutu");
  await kutu(page)
    .getByRole("button", { name: metin("eklenti.stokBildirimi.form.gonder") })
    .click();
  await expect(kutu(page).getByRole("status")).toHaveText(
    metin("eklenti.stokBildirimi.form.tamam"),
  );
  await expect
    .poll(async () => (await talepler()).filter((satir) => satir.eposta === eposta))
    .toEqual([{ eposta, durum: "bekliyor" }]);
  expect(hatalar).toEqual([]);
});

test("panelde stok bildirimleri menüde ve sayfada bekleyen sayıyla görünür", async ({ page }) => {
  await ayriBaglanti(page);
  const hatalar = konsoluDinle(page);
  await vt.insert(stokBildirimiTalepleri).values({
    birim_kimligi: urunler.tukenmis.birim,
    eposta: `haber-panel-${randomUUID().slice(0, 8)}@ornek.test`,
    durum: "bekliyor",
  });
  const bekleyen = (await talepler()).filter(({ durum }) => durum === "bekliyor").length;
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  const menuBaglantisi = page
    .getByRole("navigation")
    .getByRole("link", { name: metin("yonetim.sayfa.stokBildirimleri.ad") });
  await menuBaglantisi.click();
  await expect(page).toHaveURL(/\/yonetim\/stok-bildirimleri$/);
  await sayfaHazir(page);
  const satir = page.getByRole("table").getByRole("row").filter({ hasText: urunler.tukenmis.ad });
  await expect(satir).toContainText(
    doldur(metin("eklenti.stokBildirimi.panel.bekleyen"), { sayi: String(bekleyen) }),
  );
  await expect(satir.getByRole("link", { name: urunler.tukenmis.ad })).toHaveAttribute(
    "href",
    urunler.tukenmis.adres,
  );
  // Ürün adında arama adrese yazılır (kart 0258); klavyeyle sıralama da.
  const arama = page.getByRole("searchbox", { name: metin("eklenti.stokBildirimi.panel.ara") });
  await arama.fill(urunler.tukenmis.ad.toLocaleUpperCase("tr"));
  await arama.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/stok-bildirimleri\?ara=/);
  await sayfaHazir(page);
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
  await expect(satir).toBeVisible();
  await page
    .getByRole("button", {
      name: doldur(metin("yonetim.liste.siralama"), {
        ad: metin("eklenti.stokBildirimi.panel.siralama.en-cok-bekleyen"),
      }),
    })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("menuitemradio", {
      name: metin("eklenti.stokBildirimi.panel.siralama.en-eski-talep"),
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?ara=.*&sirala=en-eski-talep$/);
  await sayfaHazir(page);
  await expect(arama).toHaveValue(urunler.tukenmis.ad.toLocaleUpperCase("tr"));
  // Eşleşmeyen arama sonuçsuz hâli gösterir.
  await page.goto("/yonetim/stok-bildirimleri?ara=bulunmayan-urun-adi");
  await sayfaHazir(page);
  await expect(
    page.getByRole("heading", { name: metin("yonetim.liste.sonucsuz.baslik") }),
  ).toBeVisible();
  await tara(page, "panel, sonuçsuz");
  await page.goto("/yonetim/stok-bildirimleri");
  await sayfaHazir(page);
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const genislik of genislikler) {
      await page.setViewportSize(genislik);
      await tara(page, `panel, ${renk}, ${genislik.width}`);
      await yanaKaymaz(page);
    }
  }
  expect(hatalar).toEqual([]);
});
