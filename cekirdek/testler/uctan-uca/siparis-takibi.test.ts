// Siparişlerim ve sipariş takibi gerçek tarayıcıda (kart 0238, karar 0145, 0150; kart 0233'ün taslağı):
// - Üye Siparişlerim'de yalnız kendi siparişlerini en yeni önce görür; ayrıntıyı klavyeyle açar: başlık numaradır,
//   ilerleme şeridinde bulunduğu adım işaretlidir, mağazanın müşteriye notu görünür, iç not görünmez. Ödeme bekleyen
//   havalede banka hesapları görünür. Başka müşterinin siparişinin adresi bulunamadıdır (404). Liste ve ayrıntı iki
//   renkte ve üç genişlikte taramadan geçer, yana kaymaz; konsolda hata yok.
// - Üye olmayan sipariş alındı sayfasındaki bağlantıyla (numara adreste) takip sayfasına gelir: sayfa arama
//   motorlarına kapalı, numara dolu. Boş gönderimde iki alanın hatası ve odak numarada; bozuk numara alanın hatası;
//   eşleşmeyen e-posta tek uyarı ve odak uyarıda. Doğru e-postayla sipariş kısaltılmış adresle görünür (sokak adresi
//   yok; HTML'de tam ad, telefon, posta kodu ve e-posta geçmez, sipariş geçmişi yok). Form (hatalı) ve sonuç iki renkte
//   ve üç genişlikte taramadan geçer. Başka numarayla gelinince form açılır; "Başka bir sipariş sorgula" takibi
//   klavyeyle kapatır (çerez gider). Başkasının siparişinde sekme başlığı "Sayfa bulunamadı"dır.
// Siparişler sitenin paylaşılan verisidir: test kendi ürününü ve müşterilerini açar (siparişler silinmez).
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { type OdemeGirdisi, odemeServisi } from "../../moduller/odeme/servis";
import { hesapAc } from "../../moduller/oturum/servis";
import { siparisYonetimi } from "../../moduller/siparis/yonetim";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { hesapSiparisiAdresi, siparisTakibiAdresi, vitrinAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = sistemIslemi("uctan-uca-siparis-takibi");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
const sifre = "uzun-bir-deneme-sifresi";
const ek = randomUUID().slice(0, 8);
let vt: Veritabani;
let birim = "";
const temizlik: (() => Promise<unknown>)[] = [];

// Her test kendi istemci adresiyle gelir: giriş ve takip uçlarının sıkı sınırı testler arasında dolmaz.
test.beforeEach(({ page }) =>
  page.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`,
  }),
);
test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const servis = calisanSiteninUrunServisi();
  const urun = await servis.urunEkle(vt, yapan, {
    ad: `Takip deneme ${ek}`,
    adresAdi: `takip-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 15_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 20,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim();
  await vt.$client.end();
});

const siparisVer = async (kim: OdemeGirdisi["kim"]) => {
  const bilgiler = odemeBilgileriSemasi.parse({
    odemeYontemi: { yontem: "havale" },
    teslimat: {
      ad: "Deniz",
      soyad: "Müşteri",
      telefon: "0555 000 00 42",
      adres: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Takip Sokak No: 7",
        postaKodu: "06420",
      },
    },
    fatura: { tur: "bireysel", adresAyni: true },
    onBilgilendirmeOnayi: true,
    mesafeliSatisOnayi: true,
    pazarlamaIzni: false,
  });
  const sonuc = await odemeServisi(calisanSite()).siparisVer(
    vt,
    { kim, bilgiler, kalemler: [{ birim, adet: 1 }] },
    3600,
  );
  return sonuc.siparis.numara;
};

const musteriAc = async () => {
  const eposta = `takip-${ek}-${randomUUID().slice(0, 6)}@ornek.test`;
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

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.width}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${ne} ${renk} ${boyut.width}: yana kayma`,
      ).toBe(true);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

const alan = (page: Page, etiket: string) => page.getByLabel(etiket, { exact: true });

test("üye siparişlerini ve ayrıntısını görür; başkasının siparişi bulunamaz", async ({ page }) => {
  test.setTimeout(240_000);
  // Başka müşterinin siparişinin 404'ü beklenir (sayfa bulunamadı).
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("status of 404") });
  const a = await musteriAc();
  const b = await musteriAc();
  const bekleyen = await siparisVer({ tur: "uye", musteri: a.kimlik });
  const hazirlanan = await siparisVer({ tur: "uye", musteri: a.kimlik });
  const baskasinin = await siparisVer({ tur: "uye", musteri: b.kimlik });
  const yonetim = siparisYonetimi(calisanSite());
  await yonetim.islemYap(vt, yapan, {
    numara: hazirlanan,
    islem: "havale-onayla",
    gorulenDurum: "odeme-bekleniyor",
  });
  const musteriyeNot = `Hediye paketiyle hazırlıyoruz ${ek}`;
  const icNot = `İç not ${ek}`;
  await yonetim.notEkle(vt, yapan, { numara: hazirlanan, tur: "musteri", metin: musteriyeNot });
  await yonetim.notEkle(vt, yapan, { numara: hazirlanan, tur: "ic", metin: icNot });

  // Girişten sonra hesap Siparişlerim ile açılır (karar 0145).
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(vitrinAdresleri.hesabim);
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.giris.baslik") }),
  ).toBeVisible();
  await sayfaHazir(page);
  await alan(page, metin("vitrin.giris.eposta")).fill(a.eposta);
  await alan(page, metin("vitrin.giris.sifre")).fill(sifre);
  await alan(page, metin("vitrin.giris.sifre")).press("Enter");
  await expect(page).toHaveURL(vitrinAdresleri.hesapSiparisleri);
  await sayfaHazir(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const menu = page.getByRole("navigation", { name: metin("vitrin.hesap.menu") });
  await expect(
    menu.getByRole("link", { name: metin("vitrin.hesap.siparisler.baslik") }),
  ).toHaveAttribute("aria-current", "page");
  const liste = page.getByRole("list", { name: metin("vitrin.hesap.siparisler.liste") });
  await expect(liste.getByText(baskasinin)).toHaveCount(0);
  const ayrintiAdi = (numara: string) =>
    `${metin("vitrin.hesap.siparisler.ayrinti")} ${doldur(metin("vitrin.hesap.siparisler.ayrintiEki"), { numara })}`;
  const ayrintilar = liste.getByRole("link", {
    name: new RegExp(`^${metin("vitrin.hesap.siparisler.ayrinti")}`),
  });
  // En yeni önce: testin iki siparişi listenin başındadır.
  await expect(ayrintilar.nth(0)).toHaveAccessibleName(ayrintiAdi(hazirlanan));
  await expect(ayrintilar.nth(1)).toHaveAccessibleName(ayrintiAdi(bekleyen));
  await ikiRenkUcGenislik(page, "Siparişlerim");

  // Ayrıntı klavyeyle açılır.
  await ayrintilar.nth(0).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(hesapSiparisiAdresi(hazirlanan));
  await sayfaHazir(page);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: doldur(metin("vitrin.siparis.baslik"), { numara: hazirlanan }),
    }),
  ).toBeVisible();
  const serit = page.getByRole("list", { name: metin("vitrin.siparis.durumSeridi") });
  await expect(serit.locator('[aria-current="step"]')).toContainText(
    metin("vitrin.siparis.adim.hazirlaniyor"),
  );
  await expect(page.getByText(musteriyeNot)).toBeVisible();
  await expect(page.getByText(icNot)).toHaveCount(0);
  await expect(page.getByText("Takip Sokak No: 7")).toBeVisible();
  await expect(
    menu.getByRole("link", { name: metin("vitrin.hesap.siparisler.baslik") }),
  ).toHaveAttribute("aria-current", "true");
  await ikiRenkUcGenislik(page, "sipariş ayrıntısı");

  // Ödeme bekleyen havalede banka hesapları ve bildirim bağlantısı.
  await page.goto(hesapSiparisiAdresi(bekleyen));
  await sayfaHazir(page);
  await expect(page.getByRole("heading", { level: 2, name: /./ }).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: metin("vitrin.siparisAlindi.bildir") }),
  ).toBeVisible();

  // Başka müşterinin siparişi bulunamadıdır.
  const yanit = await page.goto(hesapSiparisiAdresi(baskasinin));
  expect(yanit?.status()).toBe(404);
  await expect(page).toHaveTitle(new RegExp(metin("vitrin.bulunamadi.sekmeBasligi")));
  await expect(page.getByText(baskasinin)).toHaveCount(0);
  expect(hatalar).toEqual([]);
});

test("üye olmayan numara ve e-postayla siparişini bulur; eşleşmeyen e-posta tek uyarı alır", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("status of 404") });
  const eposta = `misafir-${ek}-${randomUUID().slice(0, 6)}@ornek.test`;
  const numara = await siparisVer({ tur: "misafir", eposta, hesap: { ac: false } });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(siparisTakibiAdresi(numara));
  await sayfaHazir(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.siparisTakibi.baslik") }),
  ).toBeVisible();
  const numaraAlani = alan(page, metin("vitrin.siparisTakibi.numara"));
  const epostaAlani = alan(page, metin("vitrin.siparisTakibi.eposta"));
  await expect(numaraAlani).toHaveValue(numara);

  // Boş gönderim: iki alanın hatası, odak numarada.
  await numaraAlani.fill("");
  await epostaAlani.press("Enter");
  await expect(numaraAlani).toBeFocused();
  await expect(numaraAlani).toHaveAccessibleDescription(metin("vitrin.siparisTakibi.hata.numara"));
  await expect(epostaAlani).toHaveAccessibleDescription(metin("vitrin.siparisTakibi.hata.eposta"));
  // Bozuk numara alanın hatasıdır.
  await numaraAlani.fill("12345");
  await epostaAlani.fill(eposta);
  await epostaAlani.press("Enter");
  await expect(numaraAlani).toBeFocused();
  await expect(numaraAlani).toHaveAccessibleDescription(metin("vitrin.siparisTakibi.hata.numara"));
  // Eşleşmeyen e-posta: siparişin var olup olmadığı söylenmez.
  await numaraAlani.fill(numara.toLowerCase());
  await epostaAlani.fill(`baska-${eposta}`);
  await epostaAlani.press("Enter");
  const uyari = page.getByText(metin("vitrin.siparisTakibi.hata.bulunamadi"));
  await expect(uyari).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(":focus")).toContainText(metin("vitrin.siparisTakibi.hata.bulunamadi"));
  await ikiRenkUcGenislik(page, "takip formu (hatalı)");

  // Doğru e-postayla sipariş kısaltılmış adresle görünür.
  await epostaAlani.fill(eposta.toUpperCase());
  await epostaAlani.press("Enter");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: doldur(metin("vitrin.siparis.baslik"), { numara }),
    }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(vitrinAdresleri.siparisTakibi);
  await sayfaHazir(page);
  await expect(page.getByText("D*** M*** · *** *** ** 42")).toBeVisible();
  // Sayfanın HTML'inde ve RSC verisinde tam ad, telefon, açık adres, posta kodu ve e-posta yoktur.
  const html = await page.content();
  for (const gizli of ["Müşteri", "0555", "555 000", "Takip Sokak", "06420", eposta]) {
    expect(html, gizli).not.toContain(gizli);
  }
  await expect(
    page.getByRole("heading", { level: 2, name: metin("vitrin.siparis.gecmis") }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: metin("vitrin.siparisAlindi.bildir") }),
  ).toBeVisible();
  await ikiRenkUcGenislik(page, "takip sonucu");

  // Çerezdeki siparişten başka bir numarayla gelinince form o numarayla açılır.
  await page.goto(siparisTakibiAdresi("ORN-987654321"));
  await expect(alan(page, metin("vitrin.siparisTakibi.numara"))).toHaveValue("ORN-987654321");
  await page.goto(vitrinAdresleri.siparisTakibi);
  await sayfaHazir(page);
  // "Başka bir sipariş sorgula" takibi kapatır: çerez gider, sayfa yenilense de form açılır.
  const kapat = page.getByRole("button", { name: metin("vitrin.siparisTakibi.baskaSiparis") });
  await kapat.focus();
  await page.keyboard.press("Enter");
  await expect(alan(page, metin("vitrin.siparisTakibi.numara"))).toHaveValue("");
  expect(
    (await page.context().cookies()).filter((cerez) => cerez.name === "siparis-takip"),
  ).toEqual([]);
  await page.reload();
  await expect(alan(page, metin("vitrin.siparisTakibi.numara"))).toBeVisible();
  expect(hatalar).toEqual([]);
});
