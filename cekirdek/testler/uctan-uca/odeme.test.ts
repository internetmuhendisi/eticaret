// Ödeme adımı gerçek tarayıcıda (kart 0213, karar 0140). Test kendi ürününü açar (fiyatlı ve stoklu), sonunda siler;
// açtığı ödeme oturumlarını ve hesapları siler.
// - Sepet sayfasındaki "Ödemeye geç" ödeme sayfasını açar; sayfa sade çerçevelidir ("Güvenli ödeme"), arama
//   motorlarına kapalıdır.
// - Üye olmayan müşteri formu klavyeyle baştan sona doldurur (il ve ilçe listeden, onay kutuları boşlukla, gönderim
//   Enter'la); oturum yazılır, stok ayrılır, başarı ve ayırmanın bitiş saati söylenir.
// - Boş gönderimde hatalar alanların altında ve üstte özetlenir, odak özete gider, özetteki bağlantı alana götürür;
//   hatalı form iki renkte ve üç genişlikte taramadan geçer, yana kaymaz.
// - Dolu form iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; konsolda hata yok.
// - Ön bilgilendirme formu pencerede siparişin bilgileriyle açılır, Escape kapatır, odak bağlantıya döner.
// - Üye müşteri iletişim bölümünün bağlantısıyla girer, ödeme sayfasına döner; e-postası hesabındandır.
// - Üye olmadan alışveriş kapalıyken girişsiz müşteri girişe yönlenir.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { sepetDepoAnahtari } from "../../kayitlar/sepet";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis";
import { odemeOturumlari } from "../../moduller/odeme/model";
import { hesapAc } from "../../moduller/oturum/servis";
import { stokAyirmalari } from "../../moduller/stok/model";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = sistemIslemi("tarayici-testi");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
const sifre = "uzun-bir-deneme-sifresi";

let vt: Veritabani;
const ek = randomUUID().slice(0, 8);
let birim = "";
const epostalar: string[] = [];
const temizlik: (() => Promise<unknown>)[] = [];

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const servis = calisanSiteninUrunServisi();
  const kimlik = await servis.urunEkle(vt, yapan, {
    ad: `Ödeme deneme ${ek}`,
    adresAdi: `odeme-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  temizlik.push(() => servis.urunSil(vt, yapan, kimlik));
  birim = (await servis.urunuOku(vt, kimlik))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 15_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 20,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  // Oturumlar ürünü silmeden önce gider (ayırma birime bağlıdır).
  temizlik.push(() => vt.delete(odemeOturumlari).where(inArray(odemeOturumlari.eposta, epostalar)));
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim();
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

const yanaKaymaz = async (page: Page, ne: string) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ne,
  ).toBe(true);

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.width}`);
      await yanaKaymaz(page, `${ne} ${renk} ${boyut.width}`);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

const sepetiKur = async (page: Page) => {
  await page.addInitScript(([anahtar, deger]) => window.localStorage.setItem(anahtar, deger), [
    sepetDepoAnahtari,
    JSON.stringify([{ birim, adet: 1 }]),
  ] as const);
};

const odemeyiAc = async (page: Page) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const yanit = await page.goto(vitrinAdresleri.odeme);
  expect(yanit?.status()).toBe(200);
  await sayfaHazir(page);
  await expect(page.getByRole("button", { name: metin("vitrin.odeme.onayla") })).toBeEnabled();
};

const alan = (page: Page, etiket: string) => page.getByLabel(etiket, { exact: true });

// Klavyeyle listeden seçim: tetikleyiciye odaklanılır, Enter listeyi açar, yazılan adın başı öğeyi bulur, Enter seçer.
// Playwright İngiliz klavyesinde olmayan harfi tuş olayı olmadan yazar; liste harfle aramayı tuş olayından yapar. Bu
// yüzden yalnız İngiliz alfabesindeki baş harfler yazılır (Türkçe klavyede tuş olayı vardır).
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

const teslimatiDoldur = async (page: Page) => {
  await alan(page, metin("vitrin.odeme.ad")).fill("Deniz");
  await alan(page, metin("vitrin.odeme.soyad")).fill("Yılmaz");
  await alan(page, metin("vitrin.odeme.telefon")).fill("0555 000 00 00");
  await listedenSec(page, metin("vitrin.odeme.il"), "Ankara");
  await listedenSec(page, metin("vitrin.odeme.ilce"), "Altındağ", "Alt");
  await alan(page, metin("vitrin.odeme.adres")).fill("Atatürk Bulvarı No: 10 Daire 3");
  await alan(page, metin("vitrin.odeme.postaKodu")).fill("06420");
};

const onaylariVer = async (page: Page) => {
  await kutuyuIsaretle(page, metin("vitrin.odeme.onBilgilendirmeOnayi"));
  await kutuyuIsaretle(page, metin("vitrin.odeme.mesafeliSatisOnayi"));
};

const onayla = async (page: Page) => {
  await page.getByRole("button", { name: metin("vitrin.odeme.onayla") }).focus();
  await page.keyboard.press("Enter");
};

const basariBekle = (page: Page) =>
  expect(
    page.getByRole("status").filter({ hasText: metin("vitrin.odeme.basariBaslik") }),
  ).toBeVisible();

test("sepetteki düğme ödeme sayfasını açar; sayfa sade çerçeveli ve arama motorlarına kapalı", async ({
  page,
}) => {
  await sepetiKur(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(vitrinAdresleri.sepet);
  await sayfaHazir(page);
  await page
    .getByRole("link", { name: metin("vitrin.sepet.odemeyeGec") })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${vitrinAdresleri.odeme}$`));
  await sayfaHazir(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText(metin("vitrin.odeme.guvenliOdeme"))).toBeVisible();
  // Vitrinin menüsü ve araması yoktur.
  await expect(page.getByRole("search")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.odeme.baslik") }),
  ).toBeVisible();
});

test("üye olmayan müşteri formu klavyeyle doldurur; stok ayrılır, başarı ve bitiş saati söylenir", async ({
  page,
}) => {
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const eposta = `misafir-${ek}@ornek.test`;
  epostalar.push(eposta);
  await sepetiKur(page);
  await odemeyiAc(page);
  await alan(page, metin("vitrin.odeme.eposta")).fill(eposta);
  await teslimatiDoldur(page);
  await alan(page, metin("vitrin.odeme.notu")).fill("Akşam teslim edin.");
  await onaylariVer(page);
  await ikiRenkUcGenislik(page, "dolu form");
  await onayla(page);
  await basariBekle(page);
  const [oturum] = await vt
    .select()
    .from(odemeOturumlari)
    .where(eq(odemeOturumlari.eposta, eposta));
  expect(oturum).toMatchObject({
    musteri_kimligi: null,
    not: "Akşam teslim edin.",
    kalemler: [{ birim, adet: 1 }],
    toplam: 15_000,
  });
  expect(oturum?.teslimat).toMatchObject({
    ad: "Deniz",
    telefon: "+90 555 000 00 00",
    adres: { il: "TR-06", postaKodu: "06420" },
  });
  expect(oturum?.onaylar.find((o) => o.tur === "pazarlama")?.verildi).toBe(false);
  const ayirmalar = await vt
    .select()
    .from(stokAyirmalari)
    .where(eq(stokAyirmalari.oturum_kimligi, oturum?.kimlik ?? ""));
  expect(ayirmalar.map((s) => [s.birim_kimligi, s.adet])).toEqual([[birim, 1]]);
  expect(hatalar).toEqual([]);
});

test("boş gönderimde hatalar özetlenir, odak özete gider, bağlantı alana götürür; hatalı form taramadan geçer", async ({
  page,
}) => {
  await sepetiKur(page);
  await odemeyiAc(page);
  await onayla(page);
  // Özetin başı: "Siparişi vermek için … alanı düzeltin:" (sayı forma göre değişir).
  const ozetBasi = metin("vitrin.odeme.hata.ozet").split("{sayi}")[0] ?? "";
  const ozet = page.getByRole("alert").filter({ hasText: ozetBasi });
  await expect(ozet.first()).toBeVisible();
  await expect(page.locator("[tabindex='-1']").filter({ has: ozet.first() })).toBeFocused();
  const eposta = alan(page, metin("vitrin.odeme.eposta"));
  await expect(eposta).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByRole("checkbox", { name: metin("vitrin.odeme.onBilgilendirmeOnayi"), exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await ozet
    .first()
    .getByRole("button", { name: metin("vitrin.odeme.eposta") })
    .click();
  await expect(eposta).toBeFocused();
  await ikiRenkUcGenislik(page, "hatalı form");
});

test("ön bilgilendirme formu pencerede siparişin bilgileriyle açılır, Escape kapatır", async ({
  page,
}) => {
  await sepetiKur(page);
  await odemeyiAc(page);
  await alan(page, metin("vitrin.odeme.ad")).fill("Deniz");
  await alan(page, metin("vitrin.odeme.soyad")).fill("Yılmaz");
  const ac = page.getByRole("button", {
    name: doldur(metin("vitrin.odeme.metniOku"), {
      metin: metin("vitrin.odeme.sozlesme.onBilgilendirme"),
    }),
  });
  await ac.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", {
    name: metin("vitrin.odeme.sozlesme.onBilgilendirme"),
  });
  await expect(pencere).toBeVisible();
  await expect(pencere.getByText("Deniz Yılmaz")).toBeVisible();
  await expect(pencere.getByText(`Ödeme deneme ${ek}`, { exact: false })).toBeVisible();
  await expect(pencere.getByText(metin("vitrin.yasal.taslak"))).toBeVisible();
  await tara(page, "sözleşme penceresi");
  // Odak açılışta kapat düğmesindedir ve ipucu açıktır: ilk Escape ipucunu, ikincisi pencereyi kapatır (kart 0103).
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(pencere).toBeHidden();
  await expect(ac).toBeFocused();
});

test("üye müşteri iletişimdeki bağlantıyla girer, döner; e-postası hesabındandır", async ({
  page,
}) => {
  const eposta = `uye-${ek}@ornek.test`;
  epostalar.push(eposta);
  const { hesapKimligi } = await hesapAc(vt, "musteri", { eposta, sifre });
  await sepetiKur(page);
  await odemeyiAc(page);
  await page
    .getByRole("link", { name: metin("vitrin.odeme.girisBaglanti") })
    .first()
    .click();
  // Giriş sayfası açılmadan yazılırsa ödeme sayfasının aynı adlı alanına yazılır.
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.giris.baslik") }),
  ).toBeVisible();
  await sayfaHazir(page);
  await alan(page, metin("vitrin.giris.eposta")).fill(eposta);
  await alan(page, metin("vitrin.giris.sifre")).fill(sifre);
  await page.getByRole("button", { name: metin("vitrin.giris.gonder") }).click();
  await expect(page).toHaveURL(new RegExp(`${vitrinAdresleri.odeme}$`));
  await sayfaHazir(page);
  await expect(page.getByText(eposta)).toBeVisible();
  await expect(alan(page, metin("vitrin.odeme.eposta"))).toHaveCount(0);
  await teslimatiDoldur(page);
  await onaylariVer(page);
  await onayla(page);
  await basariBekle(page);
  const [oturum] = await vt
    .select()
    .from(odemeOturumlari)
    .where(eq(odemeOturumlari.musteri_kimligi, hesapKimligi));
  expect(oturum?.eposta).toBe(eposta);
});

test("üye olmadan alışveriş kapalıyken girişsiz müşteri girişe yönlenir", async ({ page }) => {
  const ayarlar = siteninServisi(calisanSite());
  await ayarlar.degistir(vt, yapan, { uyeOlmadanAlisveris: false });
  try {
    await sepetiKur(page);
    await page.goto(vitrinAdresleri.odeme);
    await expect(page).toHaveURL(
      new RegExp(`${vitrinAdresleri.giris}\\?donus=${encodeURIComponent(vitrinAdresleri.odeme)}`),
    );
  } finally {
    await ayarlar.degistir(vt, yapan, { uyeOlmadanAlisveris: true });
  }
});
