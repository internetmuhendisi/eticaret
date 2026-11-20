// Müşteri hesabı gerçek tarayıcıda (kart 0237, karar 0149; kart 0187). Her test kendi müşterisini açar; ürünü kendisi
// açıp siler.
// - Girişsiz müşteri Hesabım'a girmek isteyince girişe gider, girişten sonra istediği sayfaya döner; doğrudan girişe
//   gelen müşteri girişten sonra hesabına gider. Hesap sayfaları arama motorlarına kapalıdır.
// - Adreslerim klavyeyle: boş hâl ve düğmesi, boş gönderimde alana bağlı hata ve odak, il ve ilçe listeden, ilk adres
//   iki türde varsayılan, ikinci adres ve "Varsayılan yap", düzenleme, onay penceresinde Vazgeç ve silme, silmeden sonra
//   odak; boş, dolu, açık pencere ve hatalı form iki renkte ve üç genişlikte taramadan geçer, yana kaymaz.
// - Hesap bilgileri: yanlış şifre alanın hatasıdır; doğru şifre değişir, eski şifreyle girilemez, yenisiyle girilir.
//   Kampanya izni boşlukla verilir ve geri alınır, onay satırı yazılır. Taramadan geçer.
// - Favorilerim: hesabın favorisi kartla görünür; üst satırdaki kalp girişli müşteride Favorilerim'e gider; boş hâl.
// - Üst satırın Hesabım menüsü hesabın sayfalarına gider; telefonun yan penceresinde Hesabım hesaba gider.
// - Girişsiz ziyaretçinin hesap sorusu 200 alır, konsolda hata yok (kart 0187).
// - Hesap sayfalarında konsolda hata yok.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { musteriAdresiSinirlari } from "../../kayitlar/musteri-adresleri";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { favoriServisi } from "../../moduller/favori/servis";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { adresServisi } from "../../moduller/musteri/adres";
import { adresFormuSemasi } from "../../moduller/musteri/adres-semalari";
import { musteriAdresleri, musteriOnaylari } from "../../moduller/musteri/model";
import { hesapAc } from "../../moduller/oturum/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { hesapIlkSayfasi, vitrinAdresleri } from "../../vitrin/adresler";
import { hesapDurumuUcu } from "../../vitrin/hesap-durumu";
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
const ek = randomUUID().slice(0, 8);

let vt: Veritabani;
const temizlik: (() => Promise<unknown>)[] = [];

// Her test kendi istemci adresiyle gelir: giriş ve şifre uçlarının sıkı istek sınırı testler arasında dolmaz
// (musteri-hesabi.test.ts ile aynı yol).
test.beforeEach(({ page }) =>
  page.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`,
  }),
);
test.beforeAll(() => {
  vt = baglan(veritabaniAdresi());
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim();
  await vt.$client.end();
});

const musteriAc = async () => {
  const eposta = `hesap-${ek}-${randomUUID().slice(0, 6)}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, "musteri", { eposta, sifre });
  return { eposta, kimlik: hesapKimligi };
};

const alan = (page: Page, etiket: string) => page.getByLabel(etiket, { exact: true });

// haric: taramanın dışında kalan öğe (kart 0217: üst üste binen bildirimlerin kapat düğmesi basılamıyor).
const tara = async (page: Page, ne: string, haric = "nextjs-portal") => {
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
    .exclude(haric)
    .analyze();
  expect(
    sonuc.violations.map((ihlal) => ({
      kural: ihlal.id,
      ogeler: ihlal.nodes.map((oge) => oge.target.join(" ")),
    })),
    ne,
  ).toEqual([]);
};

const ikiRenkUcGenislik = async (page: Page, ne: string, haric?: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.width}`, haric);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${ne} ${renk} ${boyut.width}: yana kayma`,
      ).toBe(true);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

// Giriş sayfasında klavyeyle giriş; giriş sayfasının açılmış olmasını bekler.
const girisYap = async (page: Page, eposta: string, girilenSifre = sifre) => {
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.giris.baslik") }),
  ).toBeVisible();
  await sayfaHazir(page);
  await alan(page, metin("vitrin.giris.eposta")).fill(eposta);
  await alan(page, metin("vitrin.giris.sifre")).fill(girilenSifre);
  await alan(page, metin("vitrin.giris.sifre")).press("Enter");
};

// Hesabın bir sayfasını açar: girişsiz müşteri girişe gider, girişten sonra sayfaya döner.
const hesapSayfasiniAc = async (page: Page, adres: string, eposta: string) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(adres);
  await expect(page).toHaveURL(`${vitrinAdresleri.giris}?donus=${encodeURIComponent(adres)}`);
  await girisYap(page, eposta);
  await expect(page).toHaveURL(adres);
  await sayfaHazir(page);
};

// Klavyeyle listeden seçim (odeme.test.ts ile aynı yol: yalnız İngiliz alfabesindeki baş harfler yazılır).
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

// Adres kartları (başlığı olan öğeler); listenin sonundaki "Yeni adres ekle" sayılmaz.
const kartlar = (page: Page) =>
  page
    .getByRole("list", { name: metin("vitrin.hesap.adresler.liste") })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading") });

test("girişsiz müşteri hesabına girmek isteyince girişe gider ve döner; doğrudan girişte hesabına gider", async ({
  page,
}) => {
  const { eposta } = await musteriAc();
  const hatalar = konsoluDinle(page);
  await hesapSayfasiniAc(page, vitrinAdresleri.hesapBilgileri, eposta);
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.hesap.bilgiler.baslik") }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(
    page
      .getByRole("navigation", { name: metin("vitrin.hesap.menu") })
      .getByRole("link", { name: metin("vitrin.hesap.bilgiler.baslik") }),
  ).toHaveAttribute("aria-current", "page");
  // Çıkış yapıp doğrudan girişe gelen müşteri hesabının açılış sayfasına gider.
  await page
    .getByRole("navigation", { name: metin("vitrin.hesap.menu") })
    .getByRole("button", { name: metin("vitrin.hesap.cikis") })
    .click();
  await expect(page).toHaveURL(vitrinAdresleri.anasayfa);
  await page.goto(vitrinAdresleri.giris);
  await girisYap(page, eposta);
  await expect(page).toHaveURL(hesapIlkSayfasi);
  expect(hatalar).toEqual([]);
});

test("adres defteri klavyeyle: ekleme, hata, varsayılan, düzenleme ve silme; taramadan geçer", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const { eposta, kimlik } = await musteriAc();
  const hatalar = konsoluDinle(page);
  await hesapSayfasiniAc(page, vitrinAdresleri.hesapAdresleri, eposta);
  await expect(page.getByText(metin("vitrin.hesap.adresler.bosBaslik"))).toBeVisible();
  await ikiRenkUcGenislik(page, "boş defter");

  // İlk adres: boş gönderimde alanların hatası, odak ilk hatalı alanda.
  const ekle = page.getByRole("button", { name: metin("vitrin.hesap.adresler.ekle") });
  await ekle.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: metin("vitrin.hesap.adresler.yeniBaslik") });
  await expect(pencere).toBeVisible();
  // İlk adres iki türde varsayılan olur: kutular işaretli gelir.
  await expect(
    pencere.getByRole("checkbox", { name: metin("vitrin.hesap.adresler.varsayilanTeslimatAlani") }),
  ).toBeChecked();
  await sayfaHazir(page);
  await pencere.getByRole("button", { name: metin("vitrin.hesap.adresler.kaydet") }).focus();
  await page.keyboard.press("Enter");
  const baslikAlani = alan(page, metin("vitrin.hesap.adresler.baslikAlani"));
  await expect(baslikAlani).toHaveAttribute("aria-invalid", "true");
  await expect(baslikAlani).toBeFocused();
  await expect(alan(page, metin("vitrin.odeme.ad"))).toHaveAttribute("aria-invalid", "true");
  await ikiRenkUcGenislik(page, "hatalı form");

  await baslikAlani.fill("Ev");
  await alan(page, metin("vitrin.odeme.ad")).fill("Deniz");
  await alan(page, metin("vitrin.odeme.soyad")).fill("Yılmaz");
  await alan(page, metin("vitrin.odeme.telefon")).fill("0555 000 00 00");
  await listedenSec(page, metin("vitrin.odeme.il"), "Ankara");
  await listedenSec(page, metin("vitrin.odeme.ilce"), "Altındağ", "Alt");
  await alan(page, metin("vitrin.odeme.adres")).fill("Atatürk Bulvarı No: 10");
  await alan(page, metin("vitrin.odeme.postaKodu")).fill("06420");
  await ikiRenkUcGenislik(page, "dolu form");
  await pencere.getByRole("button", { name: metin("vitrin.hesap.adresler.kaydet") }).focus();
  await page.keyboard.press("Enter");
  await expect(pencere).toBeHidden();
  await expect(page.getByText(metin("vitrin.hesap.adresler.eklendi"))).toBeVisible();
  await expect(kartlar(page)).toHaveCount(1);
  await expect(kartlar(page).first()).toContainText(metin("vitrin.hesap.adresler.varsayilanIkisi"));
  await expect(kartlar(page).first()).toContainText("Altındağ / Ankara");

  // İkinci adres: varsayılan değil; "Varsayılan yap" onu iki türde varsayılan yapar ve en üste alır.
  await page.getByRole("button", { name: metin("vitrin.hesap.adresler.ekle") }).click();
  await alan(page, metin("vitrin.hesap.adresler.baslikAlani")).fill("İş");
  await alan(page, metin("vitrin.odeme.ad")).fill("Deniz");
  await alan(page, metin("vitrin.odeme.soyad")).fill("Yılmaz");
  await alan(page, metin("vitrin.odeme.telefon")).fill("0555 000 00 01");
  await listedenSec(page, metin("vitrin.odeme.il"), "Ankara");
  await listedenSec(page, metin("vitrin.odeme.ilce"), "Polatlı", "Po");
  await alan(page, metin("vitrin.odeme.adres")).fill("Cumhuriyet Caddesi No: 5");
  await alan(page, metin("vitrin.odeme.postaKodu")).fill("06900");
  await page.getByRole("button", { name: metin("vitrin.hesap.adresler.kaydet") }).click();
  await expect(kartlar(page)).toHaveCount(2);
  await expect(kartlar(page).nth(1)).toContainText("İş");
  const varsayilanYap = page.getByRole("button", {
    name: doldur(metin("vitrin.hesap.adresler.varsayilanYapEtiket"), { baslik: "İş" }),
  });
  await varsayilanYap.focus();
  await page.keyboard.press("Enter");
  // Düğme kalktı, kart başa taşındı: odak kartın "Düzenle"sine geçer (bağımsız kontrolün bulgusu).
  await expect(
    page.getByRole("button", {
      name: doldur(metin("vitrin.hesap.adresler.duzenleEtiket"), { baslik: "İş" }),
    }),
  ).toBeFocused();
  await expect(kartlar(page).first()).toContainText("İş");
  await expect(kartlar(page).first()).toContainText(metin("vitrin.hesap.adresler.varsayilanIkisi"));
  // Eklemenin ve varsayılanın bildirimleri üst üste duruyor (kart 0217).
  await ikiRenkUcGenislik(page, "dolu defter", "[data-sonner-toaster]");

  // Düzenleme: alanlar dolu açılır, değişiklik kaydedilir.
  await page
    .getByRole("button", {
      name: doldur(metin("vitrin.hesap.adresler.duzenleEtiket"), { baslik: "Ev" }),
    })
    .click();
  const duzenle = page.getByRole("dialog", {
    name: metin("vitrin.hesap.adresler.duzenleBaslik"),
  });
  await expect(alan(page, metin("vitrin.odeme.adres"))).toHaveValue("Atatürk Bulvarı No: 10");
  await alan(page, metin("vitrin.hesap.adresler.baslikAlani")).fill("Annemler");
  await duzenle.getByRole("button", { name: metin("vitrin.hesap.adresler.kaydet") }).click();
  await expect(duzenle).toBeHidden();
  await expect(kartlar(page).nth(1)).toContainText("Annemler");

  // Silme onay penceresiyle: Vazgeç silmez; onaylanınca adres kalkar, odak "Yeni adres ekle"ye geçer.
  const sil = page.getByRole("button", {
    name: doldur(metin("vitrin.hesap.adresler.silEtiket"), { baslik: "İş" }),
  });
  await sil.click();
  await page.getByRole("button", { name: metin("vitrin.hesap.adresler.vazgec") }).click();
  await expect(kartlar(page)).toHaveCount(2);
  await sil.click();
  await page.getByRole("button", { name: metin("vitrin.hesap.adresler.silOnay") }).click();
  await expect(kartlar(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: metin("vitrin.hesap.adresler.ekle") }),
  ).toBeFocused();
  // Silinen varsayılanın yerine kalan adres geçer.
  await expect(kartlar(page).first()).toContainText(metin("vitrin.hesap.adresler.varsayilanIkisi"));
  const satirlar = await vt
    .select({ baslik: musteriAdresleri.baslik })
    .from(musteriAdresleri)
    .where(eq(musteriAdresleri.musteri_kimligi, kimlik));
  expect(satirlar).toEqual([{ baslik: "Annemler" }]);
  expect(hatalar).toEqual([]);
});

test("sınıra ulaşan eklemede 'Yeni adres ekle' kalkar, odak sayaca geçer", async ({ page }) => {
  const { eposta, kimlik } = await musteriAc();
  const servis = adresServisi(calisanSite());
  for (let sira = 1; sira < musteriAdresiSinirlari.enCok; sira += 1) {
    await servis.adresEkle(
      vt,
      kimlik,
      adresFormuSemasi.parse({
        baslik: `A${sira}`,
        teslimat: {
          ad: "Deniz",
          soyad: "Yılmaz",
          telefon: "0555 000 00 00",
          adres: {
            ulke: "TR",
            il: "TR-06",
            ilce: "TR-06-007",
            adres: `No: ${sira}`,
            postaKodu: "06420",
          },
        },
        varsayilanTeslimat: false,
        varsayilanFatura: false,
      }),
    );
  }
  await hesapSayfasiniAc(page, vitrinAdresleri.hesapAdresleri, eposta);
  await page.getByRole("button", { name: metin("vitrin.hesap.adresler.ekle") }).click();
  await alan(page, metin("vitrin.hesap.adresler.baslikAlani")).fill("Son");
  await alan(page, metin("vitrin.odeme.ad")).fill("Deniz");
  await alan(page, metin("vitrin.odeme.soyad")).fill("Yılmaz");
  await alan(page, metin("vitrin.odeme.telefon")).fill("0555 000 00 00");
  await listedenSec(page, metin("vitrin.odeme.il"), "Ankara");
  await listedenSec(page, metin("vitrin.odeme.ilce"), "Altındağ", "Alt");
  await alan(page, metin("vitrin.odeme.adres")).fill("Son No: 20");
  await alan(page, metin("vitrin.odeme.postaKodu")).fill("06420");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: metin("vitrin.hesap.adresler.kaydet") })
    .click();
  await expect(kartlar(page)).toHaveCount(musteriAdresiSinirlari.enCok);
  await expect(page.getByRole("button", { name: metin("vitrin.hesap.adresler.ekle") })).toHaveCount(
    0,
  );
  await expect(
    page.getByText(
      doldur(metin("vitrin.hesap.adresler.sinir"), { sinir: String(musteriAdresiSinirlari.enCok) }),
    ),
  ).toBeFocused();
});

test("hesap bilgileri: şifre değiştirme ve kampanya izni; taramadan geçer", async ({ page }) => {
  test.setTimeout(120_000);
  const { eposta, kimlik } = await musteriAc();
  const hatalar = konsoluDinle(page);
  await hesapSayfasiniAc(page, vitrinAdresleri.hesapBilgileri, eposta);
  await expect(page.getByText(eposta).last()).toBeVisible();
  await ikiRenkUcGenislik(page, "hesap bilgileri");

  // Yanlış şu anki şifre alanın hatasıdır.
  await alan(page, metin("vitrin.hesap.bilgiler.mevcutSifre")).fill("yanlis-bir-sifre");
  await alan(page, metin("vitrin.hesap.bilgiler.yeniSifre")).fill("yepyeni-bir-sifre-123");
  await page.getByRole("button", { name: metin("vitrin.hesap.bilgiler.sifreDegistir") }).click();
  const mevcut = alan(page, metin("vitrin.hesap.bilgiler.mevcutSifre"));
  await expect(mevcut).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(metin("vitrin.hesap.bilgiler.sifreYanlis"))).toBeVisible();
  await expect(mevcut).toBeFocused();
  // Doğru şifre: değişir, sayfa açık kalır.
  await mevcut.fill(sifre);
  await alan(page, metin("vitrin.hesap.bilgiler.yeniSifre")).fill("yepyeni-bir-sifre-123");
  await page.getByRole("button", { name: metin("vitrin.hesap.bilgiler.sifreDegistir") }).click();
  await expect(page.getByText(metin("vitrin.hesap.bilgiler.sifreDegisti"))).toBeVisible();
  await expect(alan(page, metin("vitrin.hesap.bilgiler.mevcutSifre"))).toHaveValue("");

  // Kampanya izni boşlukla verilir ve geri alınır.
  const izin = page.getByRole("checkbox", { name: metin("vitrin.onay.pazarlama") });
  await expect(izin).not.toBeChecked();
  await izin.focus();
  await page.keyboard.press("Space");
  await expect(page.getByText(metin("vitrin.hesap.bilgiler.izinVerildi"))).toBeVisible();
  await expect(izin).toBeChecked();
  await expect(izin).toBeEnabled();
  await page.keyboard.press("Space");
  await expect(page.getByText(metin("vitrin.hesap.bilgiler.izinGeriAlindi"))).toBeVisible();
  await expect(izin).not.toBeChecked();
  const onaylar = await vt
    .select({ verildi: musteriOnaylari.verildi })
    .from(musteriOnaylari)
    .where(and(eq(musteriOnaylari.musteri_kimligi, kimlik), eq(musteriOnaylari.tur, "pazarlama")));
  expect(onaylar.map(({ verildi }) => verildi).sort()).toEqual([false, true]);

  // Yeni şifreyle girilir, eskisiyle girilmez.
  await page
    .getByRole("navigation", { name: metin("vitrin.hesap.menu") })
    .getByRole("button", { name: metin("vitrin.hesap.cikis") })
    .click();
  await expect(page).toHaveURL(vitrinAdresleri.anasayfa);
  await page.goto(vitrinAdresleri.giris);
  await girisYap(page, eposta);
  await expect(page.getByText(metin("vitrin.giris.hataBilgi"))).toBeVisible();
  await alan(page, metin("vitrin.giris.sifre")).fill("yepyeni-bir-sifre-123");
  await alan(page, metin("vitrin.giris.sifre")).press("Enter");
  await expect(page).toHaveURL(hesapIlkSayfasi);
  // Bilerek yanlış şifre: şifre değiştirme 400, eski şifreyle giriş 401 alır (hesap sorusu değil).
  expect(
    hatalar.filter((hata) => !hata.includes("status of 400") && !hata.includes("status of 401")),
  ).toEqual([]);
});

test("favorilerim: hesabın favorisi görünür, üstteki kalp Favorilerim'e gider; menüler hesaba gider", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { eposta, kimlik } = await musteriAc();
  const servis = calisanSiteninUrunServisi();
  const urun = await servis.urunEkle(vt, yapan, {
    ad: `Hesap favorisi ${ek}`,
    adresAdi: `hesap-favorisi-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  temizlik.push(async () => {
    await favoriServisi(calisanSite()).favoriDegistir(vt, kimlik, urun, false);
    await servis.urunSil(vt, yapan, urun);
  });
  const birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 9_900 });
  await favoriServisi(calisanSite()).favoriDegistir(vt, kimlik, urun, true);
  const hatalar = konsoluDinle(page);
  await hesapSayfasiniAc(page, vitrinAdresleri.hesapFavorileri, eposta);
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.favori.baslik") }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: `Hesap favorisi ${ek}` })).toBeVisible();
  await ikiRenkUcGenislik(page, "favorilerim");

  // Üst satırdaki kalp girişli müşteride Favorilerim'e gider.
  await page.goto(vitrinAdresleri.anasayfa);
  await sayfaHazir(page);
  const kalp = page
    .getByRole("banner")
    .getByRole("link", { name: metin("vitrin.bolum.ustSatir.favoriler") });
  await expect(kalp).toHaveAttribute("href", vitrinAdresleri.hesapFavorileri);

  // Hesabım menüsü hesabın sayfalarına gider.
  await page
    .getByRole("banner")
    .getByRole("button", { name: metin("vitrin.bolum.ustSatir.hesap") })
    .click();
  await page.getByRole("menuitem", { name: metin("vitrin.hesap.adresler.baslik") }).click();
  await expect(page).toHaveURL(vitrinAdresleri.hesapAdresleri);

  // Telefonda yan penceredeki Hesabım hesaba gider.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(vitrinAdresleri.anasayfa);
  await sayfaHazir(page);
  await page.getByRole("button", { name: metin("vitrin.bolum.ustSatir.menuyuAc") }).click();
  const yan = page.getByRole("dialog");
  await expect(yan.getByText(eposta)).toBeVisible();
  await yan.getByRole("link", { name: metin("vitrin.bolum.ustSatir.hesap") }).click();
  await expect(page).toHaveURL(hesapIlkSayfasi);

  // Favori çıkınca boş hâl görünür.
  await favoriServisi(calisanSite()).favoriDegistir(vt, kimlik, urun, false);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(vitrinAdresleri.hesapFavorileri);
  await sayfaHazir(page);
  await expect(page.getByText(metin("vitrin.favori.bosBaslik"))).toBeVisible();
  expect(hatalar).toEqual([]);
});

test("girişsiz ziyaretçinin hesap sorusu 200 alır, konsolda hata yok (kart 0187)", async ({
  page,
}) => {
  const hatalar = konsoluDinle(page);
  const soru = page.waitForResponse((yanit) => new URL(yanit.url()).pathname === hesapDurumuUcu);
  await page.goto(vitrinAdresleri.anasayfa);
  expect((await soru).status()).toBe(200);
  await sayfaHazir(page);
  expect(hatalar).toEqual([]);
});
