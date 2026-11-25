// Kartla ödeme eklentisi gerçek tarayıcıda (kart 0215, karar 0142). Uygulama gerçek ödeme kuruluşuna değil, ayrı
// süreçte açılan sahte kuruluşa bağlanır (playwright.config.ts); sahte kuruluşun sayfası başka bir adrestedir
// (127.0.0.1), dönüş gerçekten başka siteden gelir. Test kendi ürününü açar, sonunda siler.
// - Üye olmayan müşteri "Kartla öde"yi klavyeyle seçer, onaylar, kuruluşun sayfasına gider, 3 taksitle öder; sitemize
//   döner, sipariş alındı sayfası ödemenin taksitini ve tutarını gösterir, sipariş "hazırlanıyor", sepet boşalır.
// - Kart reddedilince müşteri ödeme adımına döner: hata kutusu odaktadır, form dolu, adreste sonuç kodu kalmaz, stok
//   ve ayırma değişmemiştir.
// - Ürün sayfasında "Kartla N taksite kadar" satırı; "Taksit seçenekleri" klavyeyle pencerede bankalara göre tabloyu
//   açar, Escape kapatır (ilki kapat düğmesinin ipucunu), odak düğmeye döner.
// - Ödeme adımı (kart seçili), sipariş alındı sayfası, hata kutusu ve taksit penceresi iki renkte ve üç genişlikte
//   taramadan geçer, yana kaymaz; konsolda hata yok.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { and, eq, inArray, sql } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { sepetDepoAnahtari } from "../../kayitlar/sepet";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis";
import { odemeOturumlari } from "../../moduller/odeme/model";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler";
import { siparisler } from "../../moduller/siparis/model";
import { birimStoklari, stokAyirmalari } from "../../moduller/stok/model";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = sistemIslemi("tarayici-testi");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

let vt: Veritabani;
const ek = randomUUID().slice(0, 8);
const urunAdresi = kayitAdresleri.urun(`kart-deneme-${ek}`);
let birim = "";
let enCok = 0;
const epostalar: string[] = [];
const temizlik: (() => Promise<unknown>)[] = [];

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const site = calisanSite();
  // Kartla öde açık olmalı (tarayıcı testlerinin sitesinin başlangıcı açık; paylaşılan yerel veritabanında eski başlangıçla
  // yazılmış olabilir): değilse açılır, sonunda eski hâline döner.
  const yontemServisi = odemeYontemiServisi(site);
  const ayarlar = await yontemServisi.oku(vt);
  if (!ayarlar.yontemler.some((yontem) => yontem.kod === "kart" && yontem.acik)) {
    const girdi = {
      kapidaOdemeSecenekleri: ayarlar.kapidaOdemeSecenekleri,
      havaleIptalSuresi: String(ayarlar.havaleIptalSuresi),
    };
    await yontemServisi.yontemleriDegistir(vt, yapan, {
      ...girdi,
      yontemler: ayarlar.yontemler.map((yontem) =>
        yontem.kod === "kart" ? { ...yontem, acik: true } : yontem,
      ),
    });
    temizlik.push(() =>
      yontemServisi.yontemleriDegistir(vt, yapan, { ...girdi, yontemler: ayarlar.yontemler }),
    );
  }
  enCok = (await siteninServisi(site).oku(vt)).kartlaOdemeEnCokTaksit;
  const servis = calisanSiteninUrunServisi();
  const kimlik = await servis.urunEkle(vt, yapan, {
    ad: `Kart deneme ${ek}`,
    adresAdi: `kart-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  temizlik.push(() => servis.urunSil(vt, yapan, kimlik));
  birim = (await servis.urunuOku(vt, kimlik))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 20_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 10,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  // Siparişe dönmeyen oturumlar (reddedilen ödeme) ürünü silmeden önce gider; sipariş kalıcıdır.
  temizlik.push(() =>
    vt
      .delete(odemeOturumlari)
      .where(
        and(
          inArray(odemeOturumlari.eposta, epostalar),
          sql`not exists (select 1 from ${siparisler} where ${siparisler.oturum_kimligi} = ${odemeOturumlari.kimlik})`,
        ),
      ),
  );
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim();
  await vt.$client.end();
});

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.width}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${ne} ${renk} ${boyut.width} yana kayma`,
      ).toBe(true);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

const sepetiKur = async (page: Page) => {
  await page.addInitScript(
    ([anahtar, deger, isaret]) => {
      if (window.sessionStorage.getItem(isaret) !== null) return;
      window.sessionStorage.setItem(isaret, "1");
      window.localStorage.setItem(anahtar, deger);
    },
    [
      sepetDepoAnahtari,
      JSON.stringify([{ birim, adet: 1 }]),
      `sepet-kuruldu-${randomUUID()}`,
    ] as const,
  );
};

const alan = (page: Page, etiket: string) => page.getByLabel(etiket, { exact: true });

const listedenSec = async (page: Page, etiket: string, deger: string, yazilan = deger) => {
  const tetikleyici = page.getByRole("combobox", { name: etiket, exact: true });
  await tetikleyici.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.type(yazilan);
  await expect(page.getByRole("option", { name: deger, exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tetikleyici).toContainText(deger);
};

const kutuyuIsaretle = async (page: Page, etiket: string) => {
  const kutu = page.getByRole("checkbox", { name: etiket, exact: true });
  await kutu.focus();
  await page.keyboard.press("Space");
  await expect(kutu).toBeChecked();
};

const stok = async () =>
  (
    await vt
      .select({ miktar: birimStoklari.miktar })
      .from(birimStoklari)
      .where(eq(birimStoklari.birim_kimligi, birim))
  )[0]?.miktar;

// Ödeme adımı doldurulur, "Kartla öde" klavyeyle seçilir (ilk yöntemden yukarı ok: liste başa döner, son yöntem
// kart), onaylanır; müşteri kuruluşun sayfasına gider.
const karttaOde = async (page: Page, eposta: string, tarama: boolean) => {
  await sepetiKur(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(vitrinAdresleri.odeme);
  await sayfaHazir(page);
  await alan(page, metin("vitrin.odeme.eposta")).fill(eposta);
  await alan(page, metin("vitrin.odeme.ad")).fill("Deniz");
  await alan(page, metin("vitrin.odeme.soyad")).fill("Yılmaz");
  await alan(page, metin("vitrin.odeme.telefon")).fill("0555 000 00 00");
  await listedenSec(page, metin("vitrin.odeme.il"), "Ankara");
  await listedenSec(page, metin("vitrin.odeme.ilce"), "Altındağ", "Alt");
  await alan(page, metin("vitrin.odeme.adres")).fill("Atatürk Bulvarı No: 10 Daire 3");
  await alan(page, metin("vitrin.odeme.postaKodu")).fill("06420");
  const yontemler = page.getByRole("radiogroup", { name: metin("vitrin.odeme.bolum.yontem") });
  const kart = yontemler.getByRole("radio", { name: metin("ortak.odemeYontemi.kartla") });
  await yontemler.getByRole("radio", { checked: true }).focus();
  for (let adim = 0; adim < 5 && !(await kart.isChecked()); adim += 1) {
    // Radix'in radyo grubu ok tuşunda seçimi tuş bırakılmadan önce yapar: tuşa gerçek bir süre basılı tutulur.
    await page.keyboard.press("ArrowUp", { delay: 50 });
  }
  await expect(kart).toBeChecked();
  await expect(page.getByText(metin("vitrin.odeme.yontem.kartlaAciklamasi"))).toBeVisible();
  await kutuyuIsaretle(page, metin("vitrin.odeme.onBilgilendirmeOnayi"));
  await kutuyuIsaretle(page, metin("vitrin.odeme.mesafeliSatisOnayi"));
  if (tarama) await ikiRenkUcGenislik(page, "kart seçili ödeme adımı");
  await page.getByRole("button", { name: metin("vitrin.odeme.onayla") }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:\d+\/odeme-sayfasi\//);
};

test("kartla 3 taksit: kuruluşun sayfasından dönüşte sipariş alındı, sipariş hazırlanıyor, sepet boş", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const eposta = `kart-${ek}@ornek.test`;
  epostalar.push(eposta);
  const onceki = (await stok()) ?? 0;
  await karttaOde(page, eposta, true);
  // Sahte kuruluşun sayfası: en çok taksite kadar seçenek, 3 taksit, Öde.
  const taksitler = await page.getByLabel("Taksit").locator("option").allTextContents();
  expect(taksitler.map(Number)).toEqual([1, 2, 3, 6, 9, 12].filter((sayi) => sayi <= enCok));
  await page.getByLabel("Taksit").selectOption("3");
  await page.getByRole("button", { name: "Öde" }).click();
  await expect(page).toHaveURL(
    new RegExp(`^http://localhost:3000${vitrinAdresleri.siparisAlindi}$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.siparisAlindi.baslik") }),
  ).toBeVisible();
  await sayfaHazir(page);

  const [kayit] = await vt.select().from(siparisler).where(eq(siparisler.eposta, eposta));
  expect(kayit).toMatchObject({
    odeme_yontemi: "kart",
    durum: "hazirlaniyor",
    toplam: 20_000,
    tahsilat: { taksit: 3, odenen: 20_400 },
  });
  expect(await stok()).toBe(onceki - 1);
  await expect(
    page.getByRole("heading", { level: 2, name: metin("vitrin.siparisAlindi.kartBasligi") }),
  ).toBeVisible();
  await expect(page.getByText(/204,00.*3 taksitle/)).toBeVisible();
  // Sepet, ödemeyi başlatan sekmede temizlendi.
  await expect
    .poll(() => page.evaluate((anahtar) => window.localStorage.getItem(anahtar), sepetDepoAnahtari))
    .toBeNull();
  await ikiRenkUcGenislik(page, "sipariş alındı (kart)");
  expect(hatalar).toEqual([]);
});

test("kart reddedilince ödeme adımına dönülür: hata kutusu odakta, form dolu, stok ve ayırma değişmez", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const eposta = `kart-red-${ek}@ornek.test`;
  epostalar.push(eposta);
  const onceki = await stok();
  await karttaOde(page, eposta, false);
  await page.getByRole("button", { name: "Reddet" }).click();
  await expect(page).toHaveURL(new RegExp(`^http://localhost:3000${vitrinAdresleri.odeme}$`));
  await sayfaHazir(page);
  const kutu = page.getByRole("alert").filter({ hasText: metin("vitrin.odeme.kartDonusu.baslik") });
  await expect(kutu).toContainText(metin("vitrin.odeme.kartDonusu.reddedildi"));
  // Odak hata kutusunun bulunduğu özettedir: klavyeyle dolduran kişi sonucu duyar.
  await expect
    .poll(() =>
      page.evaluate(
        () => document.activeElement?.contains(document.querySelector('[role="alert"]')) ?? false,
      ),
    )
    .toBe(true);
  await expect(alan(page, metin("vitrin.odeme.eposta"))).toHaveValue(eposta);
  await expect(alan(page, metin("vitrin.odeme.ad"))).toHaveValue("Deniz");
  await expect(alan(page, metin("vitrin.odeme.adres"))).toHaveValue(
    "Atatürk Bulvarı No: 10 Daire 3",
  );
  await expect(
    page.getByRole("combobox", { name: metin("vitrin.odeme.il"), exact: true }),
  ).toContainText("Ankara");
  await expect(page.getByRole("radio", { name: metin("ortak.odemeYontemi.kartla") })).toBeChecked();
  expect(await stok()).toBe(onceki);
  const [oturum] = await vt
    .select()
    .from(odemeOturumlari)
    .where(eq(odemeOturumlari.eposta, eposta));
  expect(
    await vt
      .select()
      .from(stokAyirmalari)
      .where(eq(stokAyirmalari.oturum_kimligi, oturum?.kimlik ?? "")),
  ).toEqual([]);
  await ikiRenkUcGenislik(page, "kart reddedildi");
  expect(hatalar).toEqual([]);
});

test("ürün sayfasında taksit satırı; taksit seçenekleri klavyeyle pencerede açılır, Escape kapatır", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(urunAdresi);
  await sayfaHazir(page);
  await expect(
    page.getByText(doldur(metin("eklenti.kartlaOdeme.taksitSatiri"), { sayi: String(enCok) })),
  ).toBeVisible();
  const dugme = page.getByRole("button", { name: metin("eklenti.kartlaOdeme.taksitSecenekleri") });
  await dugme.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: metin("eklenti.kartlaOdeme.taksitPenceresi") });
  await expect(pencere).toBeVisible();
  const tablo = pencere.getByRole("table", { name: /Deneme Bankası/ });
  await expect(tablo).toBeVisible();
  await expect(tablo.getByRole("row")).toHaveCount(
    1 + [1, 2, 3, 6, 9, 12].filter((sayi) => sayi <= enCok).length,
  );
  await expect(
    tablo.getByRole("rowheader", { name: metin("eklenti.kartlaOdeme.tekCekim") }),
  ).toBeVisible();
  await ikiRenkUcGenislik(page, "taksit penceresi");
  // Odak pencerenin kapat düğmesindedir ve ipucu açıktır: ilk Escape ipucunu, ikincisi pencereyi kapatır (kart 0103).
  await page.keyboard.press("Escape");
  await expect(pencere).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(pencere).toBeHidden();
  await expect(dugme).toBeFocused();
  expect(hatalar).toEqual([]);
});
