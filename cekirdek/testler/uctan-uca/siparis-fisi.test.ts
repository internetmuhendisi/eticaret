// Sipariş fişi tarayıcıda (kart 0270, karar 0171):
// - Ayrıntıdaki "Fiş yazdır" klavyeyle yeni sekmede fişi açar ve yazdırma penceresini bir kez getirir; fişte numara,
//   ürün, stok kodu, adet, toplam ve müşterinin notu; yazdırırken (print) panelin menüsü ve komut çubuğu gizli, fiş
//   açık renkte; PDF A4 tek sayfa, yazdırma genişliğinde taşma yok; fiş sayfası iki renkte ve üç genişlikte taranır.
// - Uzun sipariş birden çok sayfaya iner, her ürün satırı sayfa arasında bölünmez (break-inside: avoid).
// - Listede iki sipariş seçilip toplu çubuktaki "Fiş yazdır" ikisini tek yazdırmada açar: iki fiş, iki sayfa,
//   ikincisi yeni sayfadan başlar.
// - Sipariş ayarlarında "Fişte fiyatları göster" klavyeyle kapatılınca fişte tutar sütunu yok, ürün ve kalem sayısı
//   var; bölüm taranır; test sonunda ayar eski hâline döner.
// - Kişisel bilgisi silinmiş siparişte ayrıntıda "Fiş yazdır" yok, fiş adresi bulunamadı.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { odemeServisi } from "../../moduller/odeme/servis";
import { siparisAyarlari } from "../../moduller/siparis/ayarlar";
import { siparisler } from "../../moduller/siparis/model";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { siparisAyrintisiAdresi, siparisFisiAdresi } from "../../yonetim-paneli/adresler";
import { bildirimSuresiniDurdur } from "./bildirim-suresi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-siparis-fisi");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
let ilkAyar = true;

test.beforeAll(async () => {
  ilkAyar = (await siparisAyarlari(calisanSite()).oku(vt)).fisteFiyatlar;
});
test.afterAll(async () => {
  await siparisAyarlari(calisanSite()).fisAyarlariniKaydet(vt, yapan, { fisteFiyatlar: ilkAyar });
  await vt.$client.end();
});

const tara = async (page: Page, ne: string) => {
  await bildirimSuresiniDurdur(page);
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

// Testin kendi ürünleri ve siparişi: kalem sayısı kadar ürün (paylaşılan veritabanında başka ürüne dokunmaz).
const siparisAc = async (kalemSayisi: number, not?: string) => {
  const urunServisi = calisanSiteninUrunServisi();
  const kalemler: { birim: string; adet: number }[] = [];
  for (let sira = 0; sira < kalemSayisi; sira++) {
    const ek = randomUUID().slice(0, 8);
    const urun = await urunServisi.urunEkle(vt, yapan, {
      ad: `Fiş deneme ${ek}`,
      adresAdi: `fis-deneme-${ek}`,
      vergiSinifi: null,
      durum: "yayinda",
      stokKodu: `FIS-${ek}`,
    });
    const birim = (await urunServisi.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 15_000 });
    await stokServisi().stokDuzelt(vt, yapan, birim, {
      yeniMiktar: 5,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    kalemler.push({ birim, adet: sira === 0 ? 2 : 1 });
  }
  const sonuc = await odemeServisi(calisanSite()).siparisVer(
    vt,
    {
      kim: { tur: "misafir", eposta: "fis@ornek.test", hesap: { ac: false } },
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: { yontem: "kapida-odeme", secenek: "nakit" },
        teslimat: {
          ad: "Fiş",
          soyad: "Müşterisi",
          telefon: "0555 000 00 00",
          adres: {
            ulke: "TR",
            il: "TR-06",
            ilce: "TR-06-007",
            adres: "Deneme Sokak No: 2",
            postaKodu: "06420",
          },
        },
        fatura: { tur: "bireysel", adresAyni: true },
        ...(not === undefined ? {} : { not }),
        onBilgilendirmeOnayi: true,
        mesafeliSatisOnayi: true,
        pazarlamaIzni: false,
      }),
      kalemler,
    },
    3600,
  );
  return sonuc.siparis.numara;
};

// Yazdırma penceresi test tarayıcısında açılmaz: window.print sayılır.
const yazdirmayiSay = (baglam: BrowserContext) =>
  baglam.addInitScript(() => {
    let sayi = 0;
    window.print = () => {
      sayi += 1;
      document.documentElement.dataset["yazdirma"] = String(sayi);
    };
  });

const pdfSayfaSayisi = async (page: Page) => {
  await page.emulateMedia({ media: "print", colorScheme: "light" });
  const pdf = (await page.pdf({ preferCSSPageSize: true })).toString("latin1");
  await page.emulateMedia({ media: "screen" });
  return pdf.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
};

const fisler = (page: Page) => page.getByRole("article");

test("ayrıntıdan fiş: yeni sekmede açılır, bir kez yazdırır; içerik, yazdırma görünüşü, A4 tek sayfa, tarama", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const numara = await siparisAc(2, "Zil çalışmıyor");
  await ayriBaglanti(page);
  await yazdirmayiSay(page.context());
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await page.goto(siparisAyrintisiAdresi(numara));
  await sayfaHazir(page);
  const dugme = page.getByRole("link", { name: metin("yonetim.eylem.fisYazdirYeniSekme") });
  await expect(dugme).toHaveAttribute("target", "_blank");
  await dugme.focus();
  const [fis] = await Promise.all([
    page.context().waitForEvent("page"),
    page.keyboard.press("Enter"),
  ]);
  await fis.waitForLoadState();
  await sayfaHazir(fis);
  await expect(fis).toHaveURL(new RegExp(`numara=${numara}&yazdir=1`));
  await expect(fis.locator("html")).toHaveAttribute("data-yazdirma", "1");
  const kagit = fisler(fis);
  await expect(kagit).toHaveCount(1);
  await expect(kagit).toHaveAccessibleName(doldur(metin("yonetim.siparisFisi.etiket"), { numara }));
  await expect(kagit).toContainText(numara);
  await expect(kagit).toContainText(/Fiş deneme/);
  await expect(kagit).toContainText(/FIS-/);
  await expect(kagit).toContainText("Zil çalışmıyor");
  await expect(kagit).toContainText(metin("yonetim.siparis.toplam"));
  await expect(kagit).toContainText(metin("yonetim.siparisFisi.faturaDegil"));
  // Fiş koyu temada da kâğıt gibi açık renktedir: zemini açık temadakiyle aynı, sayfanınkinden farklı.
  const zeminler = () =>
    kagit.evaluate((oge) => ({
      fis: getComputedStyle(oge).backgroundColor,
      sayfa: getComputedStyle(document.documentElement).backgroundColor,
    }));
  const acik = await zeminler();
  await fis.emulateMedia({ colorScheme: "dark" });
  const koyu = await zeminler();
  expect(koyu.fis).toBe(acik.fis);
  expect(koyu.sayfa).not.toBe(acik.sayfa);
  await fis.emulateMedia({ colorScheme: "light" });
  // "Yazdır" düğmesi yeniden yazdırır.
  await fis.getByRole("button", { name: metin("yonetim.eylem.yazdir") }).click();
  await expect(fis.locator("html")).toHaveAttribute("data-yazdirma", "2");
  // Yazdırırken menü, üst çubuk ve komut çubuğu yok; fiş A4 yazdırma genişliğinde taşmaz.
  await fis.emulateMedia({ media: "print" });
  await fis.setViewportSize({ width: 688, height: 1000 });
  await expect(fis.getByRole("navigation", { name: metin("yonetim.cerceve.menu") })).toBeHidden();
  await expect(fis.getByRole("button", { name: metin("yonetim.eylem.yazdir") })).toBeHidden();
  await expect(fis.getByRole("heading", { level: 1 })).toBeHidden();
  expect(
    await kagit.evaluate((oge) => oge.scrollWidth <= oge.clientWidth),
    "fiş yazdırma genişliğinde taşmaz",
  ).toBe(true);
  await fis.emulateMedia({ media: "screen" });
  await fis.setViewportSize({ width: 1280, height: 900 });
  expect(await pdfSayfaSayisi(fis)).toBe(1);
  await ikiRenkUcGenislik(fis, "sipariş fişi");
  expect(hatalar).toEqual([]);
});

test("uzun sipariş birden çok sayfaya iner, ürün satırı bölünmez", async ({ page }) => {
  test.setTimeout(300_000);
  const numara = await siparisAc(30);
  await ayriBaglanti(page);
  await yazdirmayiSay(page.context());
  await paneleGir(page, yoneticiAc());
  await page.goto(siparisFisiAdresi([numara], false));
  await sayfaHazir(page);
  await expect(page.locator("html")).not.toHaveAttribute("data-yazdirma");
  expect(await pdfSayfaSayisi(page)).toBeGreaterThan(1);
  await page.emulateMedia({ media: "print" });
  const kirilmalar = await fisler(page)
    .getByRole("row")
    .evaluateAll((satirlar) =>
      satirlar.slice(1).map((satir) => getComputedStyle(satir).breakInside),
    );
  expect(kirilmalar).toHaveLength(30);
  expect(new Set(kirilmalar)).toEqual(new Set(["avoid"]));
});

test("listeden toplu fiş: iki sipariş tek yazdırmada, her biri kendi sayfasında", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const bir = await siparisAc(1);
  const iki = await siparisAc(1);
  await ayriBaglanti(page);
  await yazdirmayiSay(page.context());
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await page.goto("/yonetim/siparisler");
  await sayfaHazir(page);
  for (const numara of [bir, iki]) {
    const kutu = page.getByRole("checkbox", { name: new RegExp(numara) }).first();
    await kutu.focus();
    await page.keyboard.press("Space");
    await expect(kutu).toBeChecked();
  }
  const cubuk = page.getByRole("region", { name: metin("yonetim.liste.topluIslem") });
  const baglanti = cubuk.getByRole("link", { name: metin("yonetim.eylem.fisYazdirYeniSekme") });
  await expect(baglanti).toHaveAttribute("target", "_blank");
  await baglanti.focus();
  const [fis] = await Promise.all([
    page.context().waitForEvent("page"),
    page.keyboard.press("Enter"),
  ]);
  await fis.waitForLoadState();
  await sayfaHazir(fis);
  await expect(fis.locator("html")).toHaveAttribute("data-yazdirma", "1");
  await expect(fisler(fis)).toHaveCount(2);
  const numaralar = await fisler(fis).evaluateAll((ogeler) =>
    ogeler.map((oge) => oge.getAttribute("aria-label")),
  );
  expect(new Set(numaralar)).toEqual(
    new Set([bir, iki].map((n) => doldur(metin("yonetim.siparisFisi.etiket"), { numara: n }))),
  );
  await fis.emulateMedia({ media: "print" });
  expect(
    await fisler(fis).evaluateAll((ogeler) =>
      ogeler.map((oge) => getComputedStyle(oge).breakBefore),
    ),
  ).toEqual(["auto", "page"]);
  await fis.emulateMedia({ media: "screen" });
  expect(await pdfSayfaSayisi(fis)).toBe(2);
  // Seçim kalır: başka bir toplu işlem de yapılabilir.
  await expect(cubuk).toBeVisible();
});

test("fişte fiyatlar ayarı klavyeyle kapatılınca fişte tutar yok, ürün ve kalem sayısı var", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const numara = await siparisAc(2);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await siparisAyarlari(calisanSite()).fisAyarlariniKaydet(vt, yapan, { fisteFiyatlar: true });
  await page.goto("/yonetim/siparis-ayarlari");
  await sayfaHazir(page);
  const bolum = page.getByRole("region", { name: metin("yonetim.siparisAyarlari.fis.baslik") });
  const anahtar = bolum.getByRole("switch", {
    name: metin("yonetim.siparisAyarlari.fis.fiyatlar"),
  });
  await expect(anahtar).toBeChecked();
  await anahtar.focus();
  await page.keyboard.press("Space");
  await expect(anahtar).not.toBeChecked();
  await bolum.getByRole("button", { name: metin("yonetim.siparisAyarlari.kaydet") }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.siparisAyarlari.fis.kaydedildi"))).toBeVisible();
  await ikiRenkUcGenislik(page, "sipariş ayarları fiş bölümü");
  expect((await siparisAyarlari(calisanSite()).oku(vt)).fisteFiyatlar).toBe(false);
  await page.goto(siparisFisiAdresi([numara], false));
  await sayfaHazir(page);
  const kagit = fisler(page);
  await expect(
    kagit.getByRole("columnheader", { name: metin("yonetim.siparisFisi.tutar") }),
  ).toHaveCount(0);
  await expect(kagit).not.toContainText(metin("yonetim.siparis.toplam"));
  await expect(kagit).toContainText(
    doldur(metin("yonetim.siparisFisi.ozet"), { urun: "3", kalem: "2" }),
  );
  await ikiRenkUcGenislik(page, "fiyatsız fiş");
});

test("kişisel bilgisi silinmiş siparişte fiş yok", async ({ page }) => {
  test.setTimeout(180_000);
  const numara = await siparisAc(1);
  await vt
    .update(siparisler)
    .set({ kisisel_veri_silinme_zamani: new Date() })
    .where(eq(siparisler.numara, numara));
  await ayriBaglanti(page);
  await paneleGir(page, yoneticiAc());
  await page.goto(siparisAyrintisiAdresi(numara));
  await sayfaHazir(page);
  await expect(
    page.getByRole("link", { name: metin("yonetim.eylem.fisYazdirYeniSekme") }),
  ).toHaveCount(0);
  const yanit = await page.goto(siparisFisiAdresi([numara], false));
  expect(yanit?.status()).toBe(404);
});
