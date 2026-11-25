// Ödeme adımı ve sipariş gerçek tarayıcıda (kartlar 0213 ve 0214, kararlar 0140 ve 0141). Test kendi ürününü açar
// (fiyatlı ve stoklu), sonunda siler; siparişe dönmeyen ödeme oturumlarını siler. Sipariş kalıcıdır (silinmez): tarayıcı
// testlerinin siparişleri paylaşılan veritabanında kalır.
// - Sepet sayfasındaki "Ödemeye geç" ödeme sayfasını açar; sayfa sade çerçevelidir ("Güvenli ödeme"), arama
//   motorlarına kapalıdır.
// - Üye olmayan müşteri formu klavyeyle baştan sona doldurur (il ve ilçe listeden, ödeme yöntemi ok tuşuyla, onay
//   kutuları boşlukla, gönderim Enter'la); kapıda nakitle sipariş oluşur, stok düşer, sepet boşalır, sipariş alındı
//   sayfası numarayla ve kapıda ödemenin bilgisiyle açılır.
// - Havaleyle sipariş: sipariş alındı sayfası son ödeme anını, tutarı, numarayı ve mağazanın hesaplarını gösterir;
//   "Ödemeyi yaptım, bildir" havale bildirimini numarayla açar, boş gönderimde hata alana bağlıdır, klavyeyle gönderilen
//   bildirim siparişe yazılır, teşekkür odağı alır. Sayfalar iki renkte ve üç genişlikte taramadan geçer.
// - Sipariş alındı sayfası erişim çerezi olmadan bulunamadıdır.
// - Stok sepetteki adedin altına indiyse ödeme sayfası sepetteki adedi stoğa indirir, değişikliği söyler; müşteri
//   onaylayabilir (bağımsız kontrolün bulgusu: onay her seferinde "sepet değişti" alıyordu).
// - Boş gönderimde hatalar alanların altında ve üstte özetlenir, odak özete gider, özetteki bağlantı alana götürür;
//   hatalı form iki renkte ve üç genişlikte taramadan geçer, yana kaymaz.
// - Dolu form iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; konsolda hata yok.
// - Ön bilgilendirme formu pencerede siparişin bilgileriyle açılır, Escape kapatır, odak bağlantıya döner.
// - Üye müşteri iletişim bölümünün bağlantısıyla girer, ödeme sayfasına döner; e-postası hesabındandır. Defteri boşken
//   "Adreslerime kaydet" işaretli gelir (kaldırılınca kaydedilmez), son siparişinin teslimat adresi önerilir, "Bu adresi
//   kullan" alanları doldurur; kaydedilen adres sonraki ödemede seçili ve dolu gelir, öneri görünmez, "Yeni adres"
//   alanları boşaltır (kart 0237). Seçimli form iki renkte ve üç genişlikte taramadan geçer.
// - Üye olmadan alışveriş kapalıyken girişsiz müşteri girişe yönlenir.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { and, eq, inArray, sql } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { sepetDepoAnahtari } from "../../kayitlar/sepet";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { epostaKayitlari } from "../../moduller/eposta/model";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis";
import { musteriAdresleri } from "../../moduller/musteri/model";
import { odemeOturumlari } from "../../moduller/odeme/model";
import { hesapAc } from "../../moduller/oturum/servis";
import { havaleBildirimleri, siparisler } from "../../moduller/siparis/model";
import { birimStoklari, stokAyirmalari } from "../../moduller/stok/model";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { siparisTakibiAdresi, vitrinAdresleri } from "../../vitrin/adresler";
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
const sifre = "uzun-bir-deneme-sifresi";

let vt: Veritabani;
const ek = randomUUID().slice(0, 8);
let birim = "";
// Stoğu 2 olan ürün: sepette 3 adet durur (bağımsız kontrolün bulgusu).
let azBirim = "";
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
  const az = await servis.urunEkle(vt, yapan, {
    ad: `Ödeme az stok ${ek}`,
    adresAdi: `odeme-az-stok-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  temizlik.push(() => servis.urunSil(vt, yapan, az));
  azBirim = (await servis.urunuOku(vt, az))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, azBirim, { satisFiyati: 5_000 });
  await stokServisi().stokDuzelt(vt, yapan, azBirim, {
    yeniMiktar: 2,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  // Siparişe dönmeyen oturumlar ürünü silmeden önce gider (ayırma birime bağlıdır); siparişe dönen oturum ve sipariş
  // kalıcıdır.
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

// Sepet sekmede bir kez kurulur: betik her sayfa açılışında çalışır, siparişten sonra boşalan sepeti yeniden
// doldurmasın (her çağrının kendi işareti vardır, ikinci çağrı sepeti yeniden kurar).
const sepetiKur = async (page: Page, kalemler = [{ birim, adet: 1 }]) => {
  await page.addInitScript(
    ([anahtar, deger, isaret]) => {
      if (window.sessionStorage.getItem(isaret) !== null) return;
      window.sessionStorage.setItem(isaret, "1");
      window.localStorage.setItem(anahtar, deger);
    },
    [sepetDepoAnahtari, JSON.stringify(kalemler), `sepet-kuruldu-${randomUUID()}`] as const,
  );
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

// Sipariş oluşunca sipariş alındı sayfası açılır.
const basariBekle = async (page: Page) => {
  await expect(page).toHaveURL(new RegExp(`${vitrinAdresleri.siparisAlindi}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.siparisAlindi.baslik") }),
  ).toBeVisible();
  await sayfaHazir(page);
};

const siparisi = async (eposta: string) => {
  const [kayit] = await vt.select().from(siparisler).where(eq(siparisler.eposta, eposta));
  if (kayit === undefined) throw new Error("Sipariş yok.");
  return kayit;
};

const stok = async (hangi: string) =>
  (
    await vt
      .select({ miktar: birimStoklari.miktar })
      .from(birimStoklari)
      .where(eq(birimStoklari.birim_kimligi, hangi))
  )[0]?.miktar;

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

test("üye olmayan müşteri formu klavyeyle doldurur, kapıda nakit seçer; sipariş oluşur, sepet boşalır", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const eposta = `misafir-${ek}@ornek.test`;
  epostalar.push(eposta);
  const onceki = (await stok(birim)) ?? 0;
  await sepetiKur(page);
  await odemeyiAc(page);
  await alan(page, metin("vitrin.odeme.eposta")).fill(eposta);
  await teslimatiDoldur(page);
  await alan(page, metin("vitrin.odeme.notu")).fill("Akşam teslim edin.");
  // Ödeme yöntemi: seçili yönteme odaklanılır, ok tuşu sonrakini (kapıda ödeme, nakit) seçer.
  const yontemler = page.getByRole("radiogroup", { name: metin("vitrin.odeme.bolum.yontem") });
  await yontemler.getByRole("radio", { checked: true }).focus();
  // Radix'in radyo grubu ok tuşunda seçimi tuş bırakılmadan önce yapar: tuşa gerçek bir süre basılı tutulur.
  await page.keyboard.press("ArrowDown", { delay: 50 });
  const nakit = yontemler.getByRole("radio", {
    name: doldur(metin("vitrin.odeme.yontem.kapida"), {
      secenek: metin("vitrin.odeme.yontem.nakit"),
    }),
  });
  await expect(nakit).toBeChecked();
  await onaylariVer(page);
  await ikiRenkUcGenislik(page, "dolu form");
  await onayla(page);
  await basariBekle(page);
  const kayit = await siparisi(eposta);
  expect(kayit).toMatchObject({
    musteri_kimligi: null,
    not: "Akşam teslim edin.",
    odeme_yontemi: "kapida-odeme",
    kapida_secenegi: "nakit",
    durum: "odeme-bekleniyor",
    toplam: 15_000,
  });
  expect(kayit.teslimat).toMatchObject({
    ad: "Deniz",
    telefon: "+90 555 000 00 00",
    adres: { il: "TR-06", postaKodu: "06420" },
  });
  expect(kayit.onaylar.find((o) => o.tur === "pazarlama")?.verildi).toBe(false);
  // Stok düştü, ayırma siparişe geçti, sepet boşaldı.
  expect(await stok(birim)).toBe(onceki - 1);
  expect(
    await vt
      .select()
      .from(stokAyirmalari)
      .where(eq(stokAyirmalari.oturum_kimligi, kayit.oturum_kimligi)),
  ).toEqual([]);
  expect(
    await page.evaluate((anahtar) => window.localStorage.getItem(anahtar), sepetDepoAnahtari),
  ).toBeNull();
  // Sipariş alındı sayfası: numara, kapıda ödemenin bilgisi, ürün ve toplam.
  await expect(
    page.getByText(doldur(metin("vitrin.siparisAlindi.numara"), { numara: kayit.numara })),
  ).toBeVisible();
  // E-posta gönderilebilen sitede sipariş e-postasının gittiği söylenir (kart 0240); e-posta kuyrukta.
  await expect(
    page.getByText(
      doldur(metin("vitrin.siparisAlindi.tesekkurEposta"), { ad: "Deniz", eposta: kayit.eposta }),
    ),
  ).toBeVisible();
  expect(
    (
      await vt
        .select({ sablon: epostaKayitlari.sablon })
        .from(epostaKayitlari)
        .where(eq(epostaKayitlari.alici, kayit.eposta))
    ).map((satir) => satir.sablon),
  ).toEqual(["siparis-alindi"]);
  await expect(
    page.getByRole("heading", { level: 2, name: metin("vitrin.siparisAlindi.kapidaBasligi") }),
  ).toBeVisible();
  await expect(page.getByText(`Ödeme deneme ${ek}`)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // Üye olmayan siparişini takip sayfasından numarayla izler (kart 0238).
  await expect(
    page.getByRole("link", { name: metin("vitrin.siparisAlindi.takipEt") }),
  ).toHaveAttribute("href", siparisTakibiAdresi(kayit.numara));
  await expect(
    page.getByRole("link", { name: metin("vitrin.siparisAlindi.goruntule") }),
  ).toHaveCount(0);
  await ikiRenkUcGenislik(page, "sipariş alındı (kapıda)");
  expect(hatalar).toEqual([]);
});

test("havaleyle sipariş: hesaplar ve son ödeme anı; bildirim numarayla açılır, klavyeyle gönderilir", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const hatalar = konsoluDinle(page, {
    // Boş gönderim sunucuya gitmez; bildirim ucu robot sorusunu ertelemiştir.
    haric: (m) => m.includes("401"),
  });
  const eposta = `havale-${ek}@ornek.test`;
  epostalar.push(eposta);
  await sepetiKur(page);
  await odemeyiAc(page);
  await alan(page, metin("vitrin.odeme.eposta")).fill(eposta);
  await teslimatiDoldur(page);
  await expect(
    page
      .getByRole("radiogroup", { name: metin("vitrin.odeme.bolum.yontem") })
      .getByRole("radio", { name: metin("ortak.odemeYontemi.havale") }),
  ).toBeChecked();
  await onaylariVer(page);
  await onayla(page);
  await basariBekle(page);
  const kayit = await siparisi(eposta);
  expect(kayit).toMatchObject({ odeme_yontemi: "havale", durum: "odeme-bekleniyor" });
  // Mağazanın hesapları numarası gruplanmış olarak, kopyalama düğmesiyle.
  const { bankaHesaplari } = await siteninServisi(calisanSite()).oku(vt);
  expect(bankaHesaplari.length).toBeGreaterThan(0);
  for (const hesap of bankaHesaplari) {
    await expect(page.getByText(hesap.iban.replace(/(.{4})/g, "$1 ").trim())).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: doldur(metin("vitrin.siparisAlindi.ibanKopyalaAdi"), { banka: hesap.banka }),
      }),
    ).toBeVisible();
  }
  await expect(page.getByText(kayit.numara, { exact: false }).first()).toBeVisible();
  await ikiRenkUcGenislik(page, "sipariş alındı (havale)");

  // "Ödemeyi yaptım, bildir": bildirim formu numarayla açılır.
  const bildir = page.getByRole("link", { name: metin("vitrin.siparisAlindi.bildir") });
  await bildir.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${vitrinAdresleri.havaleBildirimi}\\?siparis=`));
  await sayfaHazir(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(alan(page, metin("vitrin.havaleBildirimi.numara"))).toHaveValue(kayit.numara);
  // Boş gönderim: hatalar alanlarda, odak ilk hatalı alanda.
  const gonder = page.getByRole("button", { name: metin("vitrin.havaleBildirimi.gonder") });
  await gonder.focus();
  await page.keyboard.press("Enter");
  const epostaAlani = alan(page, metin("vitrin.havaleBildirimi.eposta"));
  await expect(epostaAlani).toBeFocused();
  await expect(epostaAlani).toHaveAttribute("aria-invalid", "true");
  await ikiRenkUcGenislik(page, "havale bildirimi hatalı");
  await epostaAlani.fill(eposta);
  await alan(page, metin("vitrin.havaleBildirimi.gonderen")).fill("Deniz Yılmaz");
  const [ilkHesap] = bankaHesaplari;
  if (ilkHesap === undefined) throw new Error("Hesap yok.");
  await listedenSec(
    page,
    metin("vitrin.havaleBildirimi.hesap"),
    `${ilkHesap.banka} · ${ilkHesap.iban.slice(-4)}`,
    "D",
  );
  await alan(page, metin("vitrin.havaleBildirimi.tutar")).fill("150,00");
  await alan(page, metin("vitrin.havaleBildirimi.tarih")).fill(
    new Date().toISOString().slice(0, 10),
  );
  await gonder.focus();
  await page.keyboard.press("Enter");
  const tesekkur = page
    .getByRole("status")
    .filter({ hasText: metin("vitrin.havaleBildirimi.alindi") });
  await expect(tesekkur).toBeFocused();
  const bildirimler = await vt
    .select()
    .from(havaleBildirimleri)
    .where(eq(havaleBildirimleri.siparis_kimligi, kayit.kimlik));
  expect(bildirimler).toMatchObject([
    { gonderen: "Deniz Yılmaz", tutar: 15_000, iban: ilkHesap.iban },
  ]);
  await ikiRenkUcGenislik(page, "havale bildirimi teşekkür");
  expect(hatalar).toEqual([]);
});

test("sipariş alındı sayfası erişim çerezi olmadan bulunamadıdır", async ({ page }) => {
  const yanit = await page.goto(vitrinAdresleri.siparisAlindi);
  expect(yanit?.status()).toBe(404);
});

test("stok sepetteki adedin altına indiyse adet stoğa iner, söylenir ve müşteri onaylayabilir", async ({
  page,
}) => {
  const eposta = `az-stok-${ek}@ornek.test`;
  epostalar.push(eposta);
  await sepetiKur(page, [{ birim: azBirim, adet: 3 }]);
  await odemeyiAc(page);
  await expect(page.getByText(metin("vitrin.sepet.degisiklikVar"))).toBeVisible();
  // Sepetin deposundaki adet 2'ye iner: özet ve onay aynı adedi görür.
  await expect
    .poll(() => page.evaluate((anahtar) => window.localStorage.getItem(anahtar), sepetDepoAnahtari))
    .toContain('"adet":2');
  await alan(page, metin("vitrin.odeme.eposta")).fill(eposta);
  await teslimatiDoldur(page);
  await onaylariVer(page);
  await onayla(page);
  await basariBekle(page);
  const kayit = await siparisi(eposta);
  const [oturum] = await vt
    .select()
    .from(odemeOturumlari)
    .where(eq(odemeOturumlari.kimlik, kayit.oturum_kimligi));
  expect(oturum?.kalemler).toEqual([{ birim: azBirim, adet: 2 }]);
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

test("üye müşteri iletişimdeki bağlantıyla girer, döner; e-postası hesabındandır; adres defterinden seçer", async ({
  page,
}) => {
  test.setTimeout(180_000);
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
  // Defteri boş üyede "Adreslerime kaydet" işaretli gelir (kart 0237, kullanıcı kararı); bu sipariş kaydetmez.
  const kaydet = page.getByRole("checkbox", { name: metin("vitrin.odeme.adresiKaydet") });
  await expect(kaydet).toBeChecked();
  await kaydet.focus();
  await page.keyboard.press("Space");
  await expect(kaydet).not.toBeChecked();
  await onaylariVer(page);
  await onayla(page);
  await basariBekle(page);
  const kayit = await siparisi(eposta);
  expect(kayit.musteri_kimligi).toBe(hesapKimligi);
  const defter = () =>
    vt
      .select({ baslik: musteriAdresleri.baslik, adres: musteriAdresleri.adres })
      .from(musteriAdresleri)
      .where(eq(musteriAdresleri.musteri_kimligi, hesapKimligi));
  expect(await defter()).toEqual([]);

  // Defter boşken son siparişin teslimatı önerilir; "Bu adresi kullan" alanları doldurur. Bu kez adres kaydedilir.
  await sepetiKur(page);
  await odemeyiAc(page);
  const kullan = page.getByRole("button", { name: metin("vitrin.odeme.oncekiAdresiKullan") });
  await expect(kullan).toBeVisible();
  await kullan.focus();
  await page.keyboard.press("Enter");
  await expect(alan(page, metin("vitrin.odeme.ad"))).toHaveValue("Deniz");
  await expect(alan(page, metin("vitrin.odeme.adres"))).toHaveValue(
    "Atatürk Bulvarı No: 10 Daire 3",
  );
  await expect(
    page.getByRole("combobox", { name: metin("vitrin.odeme.il"), exact: true }),
  ).toContainText("Ankara");
  await expect(kaydet).toBeChecked();
  await expect(alan(page, metin("vitrin.hesap.adresler.baslikAlani"))).toHaveValue(
    metin("vitrin.odeme.adresAdiVarsayilan"),
  );
  await onaylariVer(page);
  await onayla(page);
  await basariBekle(page);
  // Üyenin siparişi hesabındadır (kart 0238).
  await expect(
    page.getByRole("link", { name: metin("vitrin.siparisAlindi.goruntule") }),
  ).toHaveAttribute("href", new RegExp(`^${vitrinAdresleri.hesapSiparisleri}/[A-Z]+-\\d+$`));
  await expect(page.getByRole("link", { name: metin("vitrin.siparisAlindi.takipEt") })).toHaveCount(
    0,
  );
  expect(await defter()).toEqual([
    { baslik: metin("vitrin.odeme.adresAdiVarsayilan"), adres: "Atatürk Bulvarı No: 10 Daire 3" },
  ]);

  // Kayıtlı adresi olan üyede varsayılan adres seçili ve alanlar dolu gelir, önceki siparişin önerisi yoktur.
  // "Yeni adres" alanları boşaltır, "Adreslerime kaydet" işaretsiz görünür.
  await sepetiKur(page);
  await odemeyiAc(page);
  const kayitli = page.getByRole("radiogroup", { name: metin("vitrin.odeme.kayitliAdresler") });
  await expect(
    kayitli.getByRole("radio", { name: new RegExp(metin("vitrin.odeme.adresAdiVarsayilan")) }),
  ).toBeChecked();
  await expect(alan(page, metin("vitrin.odeme.ad"))).toHaveValue("Deniz");
  await expect(alan(page, metin("vitrin.odeme.adres"))).toHaveValue(
    "Atatürk Bulvarı No: 10 Daire 3",
  );
  await expect(kullan).toHaveCount(0);
  await expect(kaydet).toHaveCount(0);
  const yeni = kayitli.getByRole("radio", { name: metin("vitrin.odeme.yeniAdres") });
  await yeni.focus();
  await page.keyboard.press("Space");
  await expect(yeni).toBeChecked();
  await expect(alan(page, metin("vitrin.odeme.ad"))).toHaveValue("");
  await expect(alan(page, metin("vitrin.odeme.adres"))).toHaveValue("");
  await expect(kaydet).not.toBeChecked();
  await ikiRenkUcGenislik(page, "kayıtlı adresli ödeme");
  // Kayıtlı adres yeniden seçilince alanlar dolar; alan elle değişince seçim "Yeni adres"e geçer, alanlar kalır,
  // "Adreslerime kaydet" görünür (bağımsız kontrolün bulgusu).
  const ev = kayitli.getByRole("radio", {
    name: new RegExp(metin("vitrin.odeme.adresAdiVarsayilan")),
  });
  await ev.focus();
  await page.keyboard.press("Space");
  await expect(alan(page, metin("vitrin.odeme.ad"))).toHaveValue("Deniz");
  await expect(kaydet).toHaveCount(0);
  await alan(page, metin("vitrin.odeme.adres")).fill("Değişen Sokak No: 7");
  await expect(yeni).toBeChecked();
  await expect(alan(page, metin("vitrin.odeme.ad"))).toHaveValue("Deniz");
  await expect(alan(page, metin("vitrin.odeme.adres"))).toHaveValue("Değişen Sokak No: 7");
  await expect(kaydet).not.toBeChecked();
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
