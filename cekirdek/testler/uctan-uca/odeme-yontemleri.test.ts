// Panelin ödeme yöntemleri ve banka hesapları ekranları gerçek tarayıcıda (kart 0214, karar 0141):
// - Mağaza sahibi menüden klavyeyle "Ödeme yöntemleri"ne gelir; ekran iki renkte ve üç genişlikte taramadan geçer, yana
//   kaymaz. Bütün yöntemler anahtarla kapatılıp kaydedilince "en az bir yöntem" uyarısı görünür, hiçbir şey kaydedilmez;
//   Vazgeç formu geri alır. Boş iptal süresi alanın "zorunlu" hatasını alır (kart 0284). İptal süresi klavyeyle değişip kaydedilir, sonra eski hâline döner.
// - Kayıttan sonraki yenileme geç gelirse arada yazılan değer ezilmez (kart 0223).
// - Yöntemlerin sırası taşınır taşınmaz kaydedilir, vitrinde yeni sırayla görünür; kaydedilmemiş anahtar birlikte
//   gitmez (kart 0224, karar 0144).
// - "Banka hesapları"nda komut çubuğundaki "Hesap ekle" yan pencereyi açar; boş gönderimde alanlar hatalıdır, hatalı
//   IBAN alanın altında söylenir, doğru IBAN kaydedilir ve listede gruplanmış görünür; pencere iki renkte ve üç
//   genişlikte taramadan geçer. Hesap onay penceresiyle silinir (önce Vazgeç).
// Ödeme yöntemleri sitenin paylaşılan ayarıdır: test yalnız iptal süresini ve kendi eklediği hesabı değiştirir, sonunda
// geri alır (öteki tarayıcı testleri ödeme adımında yöntemleri ve hesapları kullanır).
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { sepetDepoAnahtari } from "../../kayitlar/sepet";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../../vitrin/adresler";
import { bildirimSuresiniDurdur } from "./bildirim-suresi";
import { ozetOdaktaOlmali } from "./form-hatasi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const servis = () => odemeYontemiServisi(calisanSite());
const yapan = sistemIslemi("uctan-uca-odeme-yontemleri");
// Testin eklediği hesabın numarası: geçerli, mağazanın hesaplarında olmayan bir örnek.
const denemeIbani = "TR750009900000000000000099";
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

test.afterAll(async () => {
  // Yarıda kalan çalışmanın hesabı da kaldırılır.
  const { bankaHesaplari } = await servis().oku(vt);
  for (const hesap of bankaHesaplari.filter((h) => h.iban === denemeIbani)) {
    await servis().hesapSil(vt, sistemIslemi("uctan-uca-odeme-yontemleri"), hesap.kimlik);
  }
  await vt.$client.end();
});

const tara = async (page: Page, ne: string) => {
  // Bildirimin süresi tarama sürerken dolmasın (kart 0220).
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

const menudenGit = async (page: Page, ad: string, yol: RegExp) => {
  const baglanti = page
    .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
    .getByRole("link", { name: ad });
  await baglanti.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(yol);
  await sayfaHazir(page);
};

// Yöntemin panelde görünen adı (kart 0215: kartla ödeme eklentisi açıkken "Kartla öde" de vardır).
const yontemAdlari = {
  havale: "ortak.odemeYontemi.havale",
  "kapida-odeme": "ortak.odemeYontemi.kapidaOdeme",
  kart: "ortak.odemeYontemi.kartla",
} as const;

test("ödeme yöntemleri: tarama, en az bir yöntem, iptal süresinin kaydı", async ({ page }) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, {
    // Bütün yöntemler kapalıyken kayıt bilerek gönderilir: uç 400 döner.
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  const ilk = await servis().oku(vt);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await menudenGit(page, metin("yonetim.sayfa.odemeYontemleri.ad"), /\/yonetim\/odeme-yontemleri$/);
  await expect(page).toHaveTitle(new RegExp(`^${metin("yonetim.sayfa.odemeYontemleri.ad")} \\|`));
  await ikiRenkUcGenislik(page, "ödeme yöntemleri");

  // Bütün açık yöntemler anahtarla (boşluk) kapatılır: kayıt "en az bir yöntem" der, ayar değişmez.
  for (const yontem of ilk.yontemler.filter((y) => y.acik)) {
    const anahtar = page.getByRole("switch", {
      name: doldur(metin("yonetim.odemeYontemleri.vitrindeAcik"), {
        ad: metin(yontemAdlari[yontem.kod]),
      }),
    });
    await anahtar.focus();
    await page.keyboard.press("Space");
    await expect(anahtar).toHaveAttribute("aria-checked", "false");
  }
  const kaydet = page.getByRole("button", { name: metin("yonetim.odemeYontemleri.kaydet") });
  await kaydet.focus();
  await page.keyboard.press("Enter");
  // Tek hata (kart 0259): özet yok, odak listenin hata yazısında.
  const listeHatasi = page.locator("[data-alan='yontemler'] [data-hata-odagi]");
  await expect(listeHatasi).toHaveText(metin("yonetim.odemeYontemleri.hata.enAzBir"));
  await expect(listeHatasi).toBeFocused();
  await expect(page.locator('[data-slot="hata-ozeti"]')).toHaveCount(0);
  await tara(page, "ödeme yöntemleri hatalı");
  // İki hata: süre de bozuk; odak özette, satır süreye götürür.
  const sure = page.getByLabel(metin("yonetim.odemeYontemleri.iptalSuresi"));
  await sure.fill("0");
  await kaydet.focus();
  await page.keyboard.press("Enter");
  const satirlar = await ozetOdaktaOlmali(
    page,
    [
      `${metin("yonetim.sayfa.odemeYontemleri.ad")}: ${metin("yonetim.odemeYontemleri.hata.enAzBir")}`,
      `${metin("yonetim.odemeYontemleri.iptalSuresi")}: ${metin("yonetim.odemeYontemleri.hata.gunGecersiz")}`,
    ],
    2,
  );
  await satirlar.nth(1).getByRole("button").press("Enter");
  await expect(sure).toBeFocused();
  await expect(sure).toHaveAttribute("aria-invalid", "true");
  expect((await servis().oku(vt)).yontemler).toEqual(ilk.yontemler);
  await page.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
  for (const yontem of ilk.yontemler) {
    await expect(page.getByRole("switch").nth(ilk.yontemler.indexOf(yontem))).toHaveAttribute(
      "aria-checked",
      String(yontem.acik),
    );
  }
  // Boş iptal süresi (kart 0284): uç şemasının kodu alanın "zorunlu" hatasıyla döner, odak alanda, genel hata yok.
  await sure.fill("");
  await sure.press("Enter");
  await expect(
    page.locator("[data-alan='sure']").getByText(metin("yonetim.bolumFormu.hata.zorunlu")),
  ).toBeVisible();
  await expect(sure).toBeFocused();
  await expect(sure).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(metin("yonetim.odemeYontemleri.hata.genel"))).toHaveCount(0);
  expect((await servis().oku(vt)).havaleIptalSuresi).toBe(ilk.havaleIptalSuresi);
  // Kapıda ödemenin bütün seçenekleri kaldırılınca (bağımsız kontrolün bulgusu): seçeneklerin altında kendi metni,
  // genel hata yok, hiçbir şey kaydedilmez; Vazgeç formu geri alır.
  await sure.fill(String(ilk.havaleIptalSuresi));
  const secenekAdlari = {
    nakit: "ortak.odemeYontemi.nakit",
    kart: "ortak.odemeYontemi.kart",
  } as const;
  for (const secenek of ilk.kapidaOdemeSecenekleri) {
    const kutu = page.getByRole("checkbox", { name: metin(secenekAdlari[secenek]) });
    await kutu.focus();
    await page.keyboard.press("Space");
    await expect(kutu).toHaveAttribute("aria-checked", "false");
  }
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .locator("[data-alan='secenekler']")
      .getByText(metin("yonetim.odemeYontemleri.hata.secenekGerekli")),
  ).toBeVisible();
  await expect(page.getByText(metin("yonetim.odemeYontemleri.hata.genel"))).toHaveCount(0);
  expect((await servis().oku(vt)).kapidaOdemeSecenekleri).toEqual(ilk.kapidaOdemeSecenekleri);
  await page.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();

  // İptal süresi: kaydedilir, sonra eski hâline döner.
  const yeni = String(ilk.havaleIptalSuresi === 30 ? 29 : ilk.havaleIptalSuresi + 1);
  await sure.fill(yeni);
  await sure.press("Enter");
  await expect(page.getByText(metin("yonetim.odemeYontemleri.kaydedildi"))).toBeVisible();
  expect((await servis().oku(vt)).havaleIptalSuresi).toBe(Number(yeni));
  await expect(sure).toHaveValue(yeni);
  await sure.fill(String(ilk.havaleIptalSuresi));
  await sure.press("Enter");
  await expect
    .poll(async () => (await servis().oku(vt)).havaleIptalSuresi)
    .toBe(ilk.havaleIptalSuresi);
  expect(hatalar).toEqual([]);
});

// Kart 0223: kayıttan sonraki yenileme (router.refresh) geç gelirse, o arada yazılan değer ezilmez. Yenileme isteği
// test izin verene kadar tutulur: değer yazıldıktan sonra serbest kalır. Eski hâlde ekran yenileme gelince formu
// kayıtlı değerle baştan kuruyor, Enter onu kaydediyordu (hattaki "3 beklendi, 4 kaldı").
test("kayıttan sonra geç gelen yenileme arada yazılan değeri ezmez", async ({ page }) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const ilk = await servis().oku(vt);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await menudenGit(page, metin("yonetim.sayfa.odemeYontemleri.ad"), /\/yonetim\/odeme-yontemleri$/);

  const yenilemeMi = (istek: { method: () => string; headers: () => Record<string, string> }) =>
    istek.method() === "GET" && istek.headers()["rsc"] === "1";
  let serbestBirak = () => {};
  const kapi = new Promise<void>((bitti) => {
    serbestBirak = bitti;
  });
  await page.route("**/yonetim/odeme-yontemleri**", async (yol) => {
    if (yenilemeMi(yol.request())) await kapi;
    await yol.fallback();
  });

  const sure = page.getByLabel(metin("yonetim.odemeYontemleri.iptalSuresi"));
  const yeni = String(ilk.havaleIptalSuresi === 30 ? 29 : ilk.havaleIptalSuresi + 1);
  const eski = String(ilk.havaleIptalSuresi);
  try {
    await sure.fill(yeni);
    const yenileme = page.waitForResponse((yanit) => yenilemeMi(yanit.request()));
    await sure.press("Enter");
    await expect(page.getByText(metin("yonetim.odemeYontemleri.kaydedildi"))).toBeVisible();
    // Yenileme tutuluyor: müşteri alanı hemen yeniden değiştirir, sonra yenileme gelir.
    await sure.fill(eski);
    serbestBirak();
    await yenileme;
    // Yanıtın ekrana uygulanması React'ın sonraki işidir.
    await page.waitForTimeout(500);
    await expect(sure).toHaveValue(eski);
    await sure.press("Enter");
    await expect.poll(async () => (await servis().oku(vt)).havaleIptalSuresi).toBe(Number(eski));
  } finally {
    await page.unroute("**/yonetim/odeme-yontemleri**");
    if ((await servis().oku(vt)).havaleIptalSuresi !== ilk.havaleIptalSuresi) {
      await servis().yontemleriDegistir(vt, sistemIslemi("uctan-uca-odeme-yontemleri"), {
        yontemler: ilk.yontemler,
        kapidaOdemeSecenekleri: ilk.kapidaOdemeSecenekleri,
        havaleIptalSuresi: eski,
      });
    }
  }
  expect(hatalar).toEqual([]);
});

// Kart 0224, karar 0144: yöntemlerin sırası taşınır taşınmaz kaydedilir ve vitrinin ödeme adımında yeni sırayla
// görünür; ekrandaki kaydedilmemiş anahtar değişikliği sıralamayla birlikte kaydedilmez, ekranda kalır. Eski hâlde
// sıra yalnız "Kaydet"le gidiyordu, "Kaydet"e basmadan çıkan mağaza sahibinin sırası kayboluyordu (ölçüldü).
test("sıralama hemen kaydedilir, vitrinde yeni sırayla görünür; kaydedilmemiş anahtar birlikte gitmez", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const ilk = await servis().oku(vt);
  const urunServisi = calisanSiteninUrunServisi();
  const ek = randomUUID().slice(0, 8);
  const urun = await urunServisi.urunEkle(vt, yapan, {
    ad: `Sıralama deneme ${ek}`,
    adresAdi: `siralama-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await urunServisi.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 15_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 5,
    gorulenMiktar: 0,
    sebep: "sayim",
  });

  // Vitrinin ödeme adımındaki yöntemlerin sırası (yöntemin adıyla).
  const vitrindekiSira = async () => {
    const vitrin = await context.newPage();
    await vitrin.addInitScript(([anahtar, deger]) => window.localStorage.setItem(anahtar, deger), [
      sepetDepoAnahtari,
      JSON.stringify([{ birim, adet: 1 }]),
    ] as const);
    await vitrin.goto(vitrinAdresleri.odeme);
    await sayfaHazir(vitrin);
    const yazilar = await vitrin
      .getByRole("radiogroup", { name: metin("vitrin.odeme.bolum.yontem") })
      .getByRole("radio")
      .allTextContents();
    await vitrin.close();
    const kodlar = yazilar.flatMap((yazi) =>
      (Object.keys(yontemAdlari) as (keyof typeof yontemAdlari)[]).filter((kod) =>
        yazi.startsWith(metin(yontemAdlari[kod])),
      ),
    );
    return kodlar.filter((kod, sira) => kodlar.indexOf(kod) === sira);
  };

  const [birinci, ikinci] = ilk.yontemler;
  const sonuncu = ilk.yontemler.at(-1);
  if (birinci === undefined || ikinci === undefined || sonuncu === undefined) {
    throw new Error("En az iki yöntem gerekir.");
  }
  try {
    // Tarayıcı testlerinin sitesinde ilk iki yöntem açık ve kullanılabilir: vitrin onları ayarın sırasıyla gösterir.
    expect((await vitrindekiSira()).slice(0, 2)).toEqual([birinci.kod, ikinci.kod]);
    await ayriBaglanti(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());
    await menudenGit(
      page,
      metin("yonetim.sayfa.odemeYontemleri.ad"),
      /\/yonetim\/odeme-yontemleri$/,
    );
    // Kaydedilmemiş değişiklik: son yöntemin anahtarı.
    const anahtar = page.getByRole("switch", {
      name: doldur(metin("yonetim.odemeYontemleri.vitrindeAcik"), {
        ad: metin(yontemAdlari[sonuncu.kod]),
      }),
    });
    await anahtar.focus();
    await page.keyboard.press("Space");
    await expect(anahtar).toHaveAttribute("aria-checked", String(!sonuncu.acik));
    // İlk yöntem bir aşağı alınır; "Kaydet"e basılmaz.
    await page
      .getByRole("button", {
        name: doldur(metin("ortak.parca.siralama.asagi"), { ad: metin(yontemAdlari[birinci.kod]) }),
      })
      .click();
    await expect(page.getByText(metin("yonetim.odemeYontemleri.siralandi"))).toBeVisible();
    const beklenen = [ikinci, birinci, ...ilk.yontemler.slice(2)];
    await expect
      .poll(async () => (await servis().oku(vt)).yontemler)
      .toEqual(beklenen.map(({ kod, acik }) => ({ kod, acik })));
    // Yenilemeden sonra da anahtar kaydedilmemiş değişikliğiyle ekranda kalır.
    await page.waitForLoadState("networkidle");
    await expect(anahtar).toHaveAttribute("aria-checked", String(!sonuncu.acik));
    await expect(page.getByRole("button", { name: metin("ortak.islem.vazgec") })).toBeEnabled();
    // Vitrin yeni sırayı gösterir.
    expect((await vitrindekiSira()).slice(0, 2)).toEqual([ikinci.kod, birinci.kod]);
  } finally {
    await servis().yontemleriDegistir(vt, yapan, {
      yontemler: ilk.yontemler,
      kapidaOdemeSecenekleri: ilk.kapidaOdemeSecenekleri,
      havaleIptalSuresi: String(ilk.havaleIptalSuresi),
    });
    await urunServisi.urunSil(vt, yapan, urun);
  }
  expect(hatalar).toEqual([]);
});

// Kart 0224 bağımsız kontrolünün bulgusu: "Kaydet" sürerken yapılan sıralama Kaydet'i bekler. Kaydet isteği test izin
// verene kadar tutulur; o sırada satır taşınır. Eski hâlde sıralama önce biter, Kaydet eski sırayı yazıp onu geri
// alırdı.
test("Kaydet sürerken yapılan sıralama kaybolmaz; anahtar da sıra da kaydedilir", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const ilk = await servis().oku(vt);
  const [birinci, ikinci] = ilk.yontemler;
  const sonuncu = ilk.yontemler.at(-1);
  if (birinci === undefined || ikinci === undefined || sonuncu === undefined) {
    throw new Error("En az iki yöntem gerekir.");
  }
  let serbestBirak = () => {};
  const kapi = new Promise<void>((bitti) => {
    serbestBirak = bitti;
  });
  try {
    await ayriBaglanti(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());
    await menudenGit(
      page,
      metin("yonetim.sayfa.odemeYontemleri.ad"),
      /\/yonetim\/odeme-yontemleri$/,
    );
    await page.route("**/kapi/yonetici/odeme-yontemleri", async (yol) => {
      await kapi;
      await yol.fallback();
    });
    const anahtar = page.getByRole("switch", {
      name: doldur(metin("yonetim.odemeYontemleri.vitrindeAcik"), {
        ad: metin(yontemAdlari[sonuncu.kod]),
      }),
    });
    await anahtar.focus();
    await page.keyboard.press("Space");
    const kaydetIstegi = page.waitForRequest("**/kapi/yonetici/odeme-yontemleri");
    await page.getByRole("button", { name: metin("yonetim.odemeYontemleri.kaydet") }).click();
    await kaydetIstegi;
    await page
      .getByRole("button", {
        name: doldur(metin("ortak.parca.siralama.asagi"), { ad: metin(yontemAdlari[birinci.kod]) }),
      })
      .click();
    serbestBirak();
    await expect(page.getByText(metin("yonetim.odemeYontemleri.siralandi"))).toBeVisible();
    const beklenen = [ikinci, birinci, ...ilk.yontemler.slice(2)].map(({ kod, acik }) => ({
      kod,
      acik: kod === sonuncu.kod ? !acik : acik,
    }));
    await expect.poll(async () => (await servis().oku(vt)).yontemler).toEqual(beklenen);
    await page.waitForLoadState("networkidle");
    await expect(anahtar).toHaveAttribute("aria-checked", String(!sonuncu.acik));
    await expect(page.getByRole("button", { name: metin("ortak.islem.vazgec") })).toBeDisabled();
  } finally {
    serbestBirak();
    await page.unroute("**/kapi/yonetici/odeme-yontemleri");
    await servis().yontemleriDegistir(vt, yapan, {
      yontemler: ilk.yontemler,
      kapidaOdemeSecenekleri: ilk.kapidaOdemeSecenekleri,
      havaleIptalSuresi: String(ilk.havaleIptalSuresi),
    });
  }
  expect(hatalar).toEqual([]);
});

test("banka hesapları: pencereyle ekleme, IBAN hatası, onayla silme", async ({ page }) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, {
    // Hatalı IBAN bilerek gönderilir: uç 400 döner.
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await menudenGit(page, metin("yonetim.sayfa.bankaHesaplari.ad"), /\/yonetim\/banka-hesaplari$/);
  await ikiRenkUcGenislik(page, "banka hesapları");

  const ekle = page.getByRole("button", {
    name: doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.bankaHesaplari.hesap") }),
  });
  await ekle.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: metin("yonetim.bankaHesaplari.yeniHesap") });
  await expect(pencere).toBeVisible();
  const kaydet = pencere.getByRole("button", { name: metin("yonetim.bankaHesaplari.kaydet") });
  // Boş gönderim (kart 0259): üç alan hatalı; odak özette, satırlar ekrandaki sırayla, satır alana götürür.
  await kaydet.click();
  const satirlar = await ozetOdaktaOlmali(
    pencere,
    [
      `${metin("yonetim.bankaHesaplari.banka")}: ${metin("yonetim.bankaHesaplari.hata.gerekli")}`,
      `${metin("yonetim.bankaHesaplari.sahip")}: `,
      `${metin("yonetim.bankaHesaplari.iban")}: `,
    ],
    3,
  );
  const banka = pencere.getByLabel(metin("yonetim.bankaHesaplari.banka"));
  await expect(banka).toHaveAttribute("aria-invalid", "true");
  await satirlar.nth(0).getByRole("button").click();
  await expect(banka).toBeFocused();
  await banka.fill("Deneme Uçtan Uca Bankası");
  await pencere.getByLabel(metin("yonetim.bankaHesaplari.sahip")).fill("Deneme Ticaret");
  const iban = pencere.getByLabel(metin("yonetim.bankaHesaplari.iban"));
  // Kontrol hanesi tutmayan numara: alanın altında söylenir, hiçbir şey kaydedilmez.
  await iban.fill("TR76 0009 9000 0000 0000 0000 99");
  await iban.press("Enter");
  await expect(pencere.getByText(metin("yonetim.bankaHesaplari.hata.ibanKontrol"))).toBeVisible();
  await expect(iban).toBeFocused();
  await ikiRenkUcGenislik(page, "hesap penceresi hatalı");
  expect((await servis().oku(vt)).bankaHesaplari.some((h) => h.iban === denemeIbani)).toBe(false);
  await iban.fill("tr75 0009 9000 0000 0000 0000 99");
  await iban.press("Enter");
  await expect(pencere).toBeHidden();
  await expect(page.getByText(metin("yonetim.bankaHesaplari.eklendi"))).toBeVisible();
  await expect(page.getByText("TR75 0009 9000 0000 0000 0000 99")).toBeVisible();
  expect((await servis().oku(vt)).bankaHesaplari.some((h) => h.iban === denemeIbani)).toBe(true);

  // Silme onay penceresiyle sorulur; Vazgeç silmez, Sil siler.
  const sil = page.getByRole("button", {
    name: doldur(metin("yonetim.bankaHesaplari.sil"), { ad: "Deneme Uçtan Uca Bankası" }),
  });
  await sil.focus();
  await page.keyboard.press("Enter");
  const onay = page.getByRole("alertdialog");
  await expect(onay).toBeVisible();
  await tara(page, "silme onayı");
  await onay.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
  await expect(onay).toBeHidden();
  expect((await servis().oku(vt)).bankaHesaplari.some((h) => h.iban === denemeIbani)).toBe(true);
  await sil.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: metin("yonetim.bankaHesaplari.silOnay.sil") })
    .click();
  await expect(page.getByText(metin("yonetim.bankaHesaplari.silindi"))).toBeVisible();
  await expect(page.getByText("TR75 0009 9000 0000 0000 0000 99")).toHaveCount(0);
  expect((await servis().oku(vt)).bankaHesaplari.some((h) => h.iban === denemeIbani)).toBe(false);
  expect(hatalar).toEqual([]);
});
