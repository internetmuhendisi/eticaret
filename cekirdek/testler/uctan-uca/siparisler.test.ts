// Panelin sipariş ekranları gerçek tarayıcıda (kart 0234, karar 0145; kart 0233'ün taslağı):
// - Mağaza sahibi menüden klavyeyle "Siparişler"e gelir; testin havale siparişi listede havale bildirimi işaretiyle
//   görünür; liste iki renkte ve üç genişlikte taramadan geçer, yana kaymaz. Arama aranan metni adrese yazmaz.
// - Ayrıntı klavyeyle açılır: başlık siparişin numarasıdır. "Havaleyi onayla" onay penceresinde sorulur (önce Vazgeç),
//   onaylanınca sipariş hazırlanıyor olur. "Kargoya ver" yan pencerede firma ve takip numarasını klavyeyle alır; boş
//   gönderimde firma hatası, bozuk takip numarasında alanın hatası. Kargoya verilince kargo kartı takip bağlantısıyla
//   görünür. İç not eklenir, geçmişte görünür. Ayrıntı, onay penceresi ve kargo penceresi iki renkte ve üç genişlikte
//   taramadan geçer.
// - "Sipariş ayarları"nda kargo firması yan pencereden eklenir (bozuk takip adresi alanın hatası), onay penceresiyle
//   silinir; ekran iki renkte ve üç genişlikte taramadan geçer.
// Siparişler ve kargo firmaları sitenin paylaşılan verisidir: test kendi ürününü ve siparişlerini açar, sonunda
// firma listesini eski hâline döndürür (siparişler silinmez, kendi ürünü kullanılır).
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { odemeServisi } from "../../moduller/odeme/servis";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler";
import { siparisAyarlari } from "../../moduller/siparis/ayarlar";
import { havaleBildirimiFormuSemasi } from "../../moduller/siparis/havale-bildirimi-semalari";
import { siparisServisi } from "../../moduller/siparis/servis";
import { siparisYonetimi } from "../../moduller/siparis/yonetim";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { bildirimSuresiniDurdur } from "./bildirim-suresi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-siparisler");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
let ilkFirmalar: { kimlik: string; ad: string; takipAdresi?: string | undefined }[] = [];

test.beforeAll(async () => {
  ilkFirmalar = (await siparisAyarlari(calisanSite()).oku(vt)).kargoFirmalari;
});

test.afterAll(async () => {
  // Testin değiştirdiği firma listesi eski hâline döner.
  const ayarlar = siparisAyarlari(calisanSite());
  const bugun = (await ayarlar.oku(vt)).kargoFirmalari;
  await ayarlar.kargoFirmalariniKaydet(vt, yapan, {
    onceki: bugun.map((firma) => firma.kimlik),
    firmalar: ilkFirmalar,
  });
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

const menudenGit = async (page: Page, ad: string, yol: RegExp) => {
  const baglanti = page
    .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
    .getByRole("link", { name: ad });
  await baglanti.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(yol);
  await sayfaHazir(page);
};

// Testin kendi ürünü ve siparişi (paylaşılan veritabanında başka ürünün stoğuna dokunmaz).
const siparisAc = async (yontem: OdemeYontemiSecimi, eposta: string) => {
  const site = calisanSite();
  const urunServisi = calisanSiteninUrunServisi();
  const ek = randomUUID().slice(0, 8);
  const urun = await urunServisi.urunEkle(vt, yapan, {
    ad: `Sipariş deneme ${ek}`,
    adresAdi: `siparis-deneme-${ek}`,
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
  const bilgiler = odemeBilgileriSemasi.parse({
    odemeYontemi: yontem,
    teslimat: {
      ad: "Deneme",
      soyad: "Müşteri",
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
    onBilgilendirmeOnayi: true,
    mesafeliSatisOnayi: true,
    pazarlamaIzni: false,
  });
  const sonuc = await odemeServisi(site).siparisVer(
    vt,
    {
      kim: { tur: "misafir", eposta, hesap: { ac: false } },
      bilgiler,
      kalemler: [{ birim, adet: 1 }],
    },
    3600,
  );
  return sonuc.siparis.numara;
};

test("siparişler: liste, havale onayı, kargoya verme ve not", async ({ page }) => {
  test.setTimeout(240_000);
  const hatalar = konsoluDinle(page, {
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  const site = calisanSite();
  const eposta = `siparis-${randomUUID().slice(0, 8)}@ornek.test`;
  const numara = await siparisAc({ yontem: "havale" }, eposta);
  const { bankaHesaplari } = await odemeYontemiServisi(site).oku(vt);
  const hesap = bankaHesaplari[0];
  if (hesap === undefined) throw new Error("Sitenin banka hesabı yok.");
  await siparisServisi(site).havaleBildir(
    vt,
    { tur: "eposta", eposta },
    havaleBildirimiFormuSemasi.parse({
      numara,
      gonderen: "Deneme Müşteri",
      hesap: hesap.kimlik,
      tutar: "150,00",
      odemeTarihi: new Date().toISOString().slice(0, 10),
    }),
  );
  // Kargoya verilecek firma: listede yoksa testin firması eklenir.
  const firmaAdi = `Uçtan uca kargo ${randomUUID().slice(0, 6)}`;
  const firmalar = (await siparisAyarlari(site).oku(vt)).kargoFirmalari;
  await siparisAyarlari(site).kargoFirmalariniKaydet(vt, yapan, {
    onceki: firmalar.map((f) => f.kimlik),
    firmalar: [
      ...firmalar,
      { ad: firmaAdi, takipAdresi: "https://takip.deneme-kargo.test/{takip}" },
    ],
  });

  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await menudenGit(page, metin("yonetim.sayfa.siparisler.ad"), /\/yonetim\/siparisler$/);
  await expect(page).toHaveTitle(new RegExp(`^${metin("yonetim.sayfa.siparisler.ad")} \\|`));
  const satir = page.getByRole("row").filter({ hasText: numara });
  await expect(satir).toContainText(metin("yonetim.siparisler.havaleBildirildi"));
  await expect(satir).toContainText(metin("ortak.siparisDurumu.odeme-bekleniyor"));
  await ikiRenkUcGenislik(page, "sipariş listesi");

  // Arama aranan metni adrese yazmaz.
  const arama = page.getByLabel(metin("yonetim.siparisler.ara"));
  await arama.fill(eposta);
  await arama.press("Enter");
  await expect(
    page.getByText(doldur(metin("yonetim.siparisler.aramaSonucu"), { aranan: eposta, sayi: "1" })),
  ).toBeVisible();
  expect(page.url()).not.toContain("siparis-");

  // Ayrıntı klavyeyle açılır.
  const ayrinti = page
    .getByRole("table")
    .getByRole("link", { name: doldur(metin("yonetim.siparisler.ayrintiAdi"), { numara }) });
  await ayrinti.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/siparisler\/ayrinti\?numara=/);
  await sayfaHazir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    doldur(metin("yonetim.siparis.baslik"), { numara }),
  );
  await ikiRenkUcGenislik(page, "sipariş ayrıntısı");

  // Havale onayı: önce Vazgeç, sonra onay.
  const onayDugmesi = page.getByRole("button", { name: metin("yonetim.eylem.havaleOnayla") });
  await onayDugmesi.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("alertdialog");
  await expect(pencere).toBeVisible();
  await tara(page, "havale onay penceresi");
  await page.keyboard.press("Enter");
  await expect(pencere).toBeHidden();
  expect((await siparisYonetimi(site).ayrinti(vt, numara))?.siparis.durum).toBe("odeme-bekleniyor");
  await onayDugmesi.focus();
  await page.keyboard.press("Enter");
  await expect(pencere).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.siparis.basari.havale-onayla"))).toBeVisible();
  await expect
    .poll(async () => (await siparisYonetimi(site).ayrinti(vt, numara))?.siparis.durum)
    .toBe("hazirlaniyor");

  // Kargoya verme: boş gönderimde firma hatası, bozuk takip numarasında alanın hatası.
  const kargoDugmesi = page.getByRole("button", { name: metin("yonetim.eylem.kargoyaVer") });
  await kargoDugmesi.focus();
  await page.keyboard.press("Enter");
  const kargoPenceresi = page.getByRole("dialog", {
    name: metin("yonetim.siparis.pencere.kargoBaslik"),
  });
  await expect(kargoPenceresi).toBeVisible();
  const kaydet = kargoPenceresi.getByRole("button", {
    name: metin("yonetim.siparis.pencere.kaydet"),
  });
  if ((await siparisAyarlari(site).oku(vt)).kargoFirmalari.length > 1) {
    await kaydet.click();
    await expect(kargoPenceresi.getByText(metin("yonetim.siparis.hata.firma"))).toBeVisible();
  }
  const firmaSecimi = kargoPenceresi.getByRole("combobox", {
    name: metin("yonetim.siparis.pencere.firma"),
  });
  await firmaSecimi.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: firmaAdi }).focus();
  await page.keyboard.press("Enter");
  await expect(firmaSecimi).toContainText(firmaAdi);
  const takip = kargoPenceresi.getByLabel(metin("yonetim.siparis.pencere.takip"));
  await takip.fill("!!");
  await takip.press("Enter");
  await expect(kargoPenceresi.getByText(metin("yonetim.siparis.hata.takipNumarasi"))).toBeVisible();
  await tara(page, "kargo penceresi hatalı");
  await takip.fill("UCU 1234");
  await takip.press("Enter");
  await expect(kargoPenceresi).toBeHidden();
  await expect(page.getByText(metin("yonetim.siparis.basari.kargoya-ver"))).toBeVisible();
  await expect(
    page.getByRole("link", { name: metin("yonetim.siparis.kargoBilgisi.takipEt") }),
  ).toHaveAttribute("href", "https://takip.deneme-kargo.test/UCU%201234");
  expect((await siparisYonetimi(site).ayrinti(vt, numara))?.siparis).toMatchObject({
    durum: "kargoda",
    kargo_firmasi: firmaAdi,
    takip_numarasi: "UCU 1234",
  });

  // İç not eklenir ve geçmişte görünür.
  const notAlani = page.getByLabel(metin("yonetim.siparis.notlar.etiket"));
  await notAlani.fill("Uçtan uca iç not");
  await page.getByRole("button", { name: metin("yonetim.siparis.notlar.kaydet") }).click();
  await expect(page.getByText(metin("yonetim.siparis.notlar.eklendi"))).toBeVisible();
  await expect(page.getByText("Uçtan uca iç not")).toBeVisible();
  await ikiRenkUcGenislik(page, "kargodaki sipariş");
  expect(hatalar).toEqual([]);
});

test("sipariş ayarları: kargo firması eklenir ve silinir", async ({ page }) => {
  test.setTimeout(180_000);
  const hatalar = konsoluDinle(page, {
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await menudenGit(page, metin("yonetim.sayfa.siparisAyarlari.ad"), /\/yonetim\/siparis-ayarlari$/);
  await ikiRenkUcGenislik(page, "sipariş ayarları");
  const ad = `Ayar deneme ${randomUUID().slice(0, 6)}`;
  await page
    .getByRole("button", {
      name: doldur(metin("yonetim.eylem.ekle"), {
        ne: metin("yonetim.siparisAyarlari.firmaEkleNe"),
      }).trim(),
    })
    .click();
  const pencere = page.getByRole("dialog", { name: metin("yonetim.siparisAyarlari.yeniFirma") });
  await expect(pencere).toBeVisible();
  await pencere.getByLabel(metin("yonetim.siparisAyarlari.ad")).fill(ad);
  const adres = pencere.getByLabel(metin("yonetim.siparisAyarlari.takipAdresi"));
  await adres.fill("http://takip.deneme.test/");
  await adres.press("Enter");
  await expect(pencere.getByText(metin("yonetim.siparisAyarlari.hata.takipAdresi"))).toBeVisible();
  await tara(page, "firma penceresi hatalı");
  await adres.fill("https://takip.deneme.test/{takip}");
  await adres.press("Enter");
  await expect(pencere).toBeHidden();
  await expect(page.getByText(metin("yonetim.siparisAyarlari.eklendi"))).toBeVisible();
  await expect(page.getByText(ad)).toBeVisible();
  expect(
    (await siparisAyarlari(calisanSite()).oku(vt)).kargoFirmalari.some((f) => f.ad === ad),
  ).toBe(true);
  await page
    .getByRole("button", { name: doldur(metin("yonetim.siparisAyarlari.sil"), { ad }) })
    .click();
  const onay = page.getByRole("alertdialog");
  await onay.getByRole("button", { name: metin("yonetim.siparisAyarlari.silOnay.sil") }).click();
  await expect(page.getByText(metin("yonetim.siparisAyarlari.silindi"))).toBeVisible();
  expect(
    (await siparisAyarlari(calisanSite()).oku(vt)).kargoFirmalari.some((f) => f.ad === ad),
  ).toBe(false);
  expect(hatalar).toEqual([]);
});

// Kart 0241: yönetici bildirimlerinin alıcıları ve anahtarları klavyeyle kaydedilir; hatalı adres alanın altında yazar
// ve odak alana döner. Paylaşılan veritabanında ayar test sonunda eski hâline döner.
test("sipariş ayarları: yönetici bildirimleri klavyeyle kaydedilir", async ({ page }) => {
  test.setTimeout(180_000);
  const ayarlar = siparisAyarlari(calisanSite());
  const once = await ayarlar.oku(vt);
  const hatalar = konsoluDinle(page, {
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  try {
    await ayriBaglanti(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());
    await menudenGit(
      page,
      metin("yonetim.sayfa.siparisAyarlari.ad"),
      /\/yonetim\/siparis-ayarlari$/,
    );
    const bolum = page.getByRole("region", { name: metin("yonetim.siparisAyarlari.bildirimler") });
    await expect(bolum).toBeVisible();
    const adresler = bolum.getByLabel(metin("yonetim.siparisAyarlari.alicilar.ad"));
    await adresler.focus();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("sahip@ornek.test, adres-degil");
    await page.keyboard.press("Enter");
    const hata = bolum.getByText(metin("yonetim.siparisAyarlari.alicilar.hata.eposta"));
    await expect(hata).toBeVisible();
    await expect(adresler).toBeFocused();
    await expect(adresler).toHaveAttribute("aria-invalid", "true");
    await tara(page, "yönetici bildirimleri hatalı");
    // Anahtar boşlukla kapanır, durumunu yazıyla da söyler.
    const yorum = bolum.getByRole("switch", {
      name: metin("yonetim.siparisAyarlari.bildirim.yorum"),
    });
    await expect(yorum).toBeChecked();
    await yorum.focus();
    await page.keyboard.press("Space");
    await expect(yorum).not.toBeChecked();
    await expect(yorum).toContainText(metin("yonetim.siparisAyarlari.kapali"));
    await adresler.focus();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("Bildirim@Ornek.test");
    await page.keyboard.press("Enter");
    await expect(
      page.getByText(metin("yonetim.siparisAyarlari.bildirimlerKaydedildi")),
    ).toBeVisible();
    await expect(hata).toBeHidden();
    const sonra = await ayarlar.oku(vt);
    expect(sonra.yoneticiBildirimAlicilari).toEqual(["bildirim@ornek.test"]);
    expect(sonra.kapaliYoneticiBildirimleri).toContain("yorum");
    await bildirimSuresiniDurdur(page);
    await ikiRenkUcGenislik(page, "yönetici bildirimleri");
    expect(hatalar).toEqual([]);
  } finally {
    await ayarlar.yoneticiBildirimleriniKaydet(vt, yapan, {
      alicilar: once.yoneticiBildirimAlicilari.join(", "),
      kapalilar: once.kapaliYoneticiBildirimleri.filter((b) =>
        ayarlar.gorunenBildirimler().includes(b),
      ),
    });
  }
});
