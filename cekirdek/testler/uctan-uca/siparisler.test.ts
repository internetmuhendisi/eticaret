// Panelin sipariş ekranları gerçek tarayıcıda (kart 0234, karar 0145; kart 0233'ün taslağı):
// - Mağaza sahibi menüden klavyeyle "Siparişler"e gelir; testin havale siparişi listede havale bildirimi işaretiyle
//   görünür; liste iki renkte ve üç genişlikte taramadan geçer, yana kaymaz. Arama aranan metni adrese yazmaz.
// - Ayrıntı klavyeyle açılır: başlık siparişin numarasıdır. "Havaleyi onayla" onay penceresinde sorulur (önce Vazgeç),
//   onaylanınca sipariş hazırlanıyor olur. "Kargoya ver" yan pencerede firma ve takip numarasını klavyeyle alır; boş
//   gönderimde firma hatası, bozuk takip numarasında alanın hatası. Kargoya verilince kargo kartı takip bağlantısıyla
//   görünür. İç not eklenir, geçmişte görünür. Ayrıntı, onay penceresi ve kargo penceresi iki renkte ve üç genişlikte
//   taramadan geçer.
// - Tarih süzgeci panelde klavyeyle (boş gönderimde alanın hatası ve odak, iki gün, hazır aralık, Escape), kargo
//   firması süzgeci (virgüllü ad) ve "Bakılması gereken" sekmesi; açık ve hatalı panel ile sekme iki renkte ve üç
//   genişlikte taramadan geçer (kart 0267).
// - Ayrıntıda fatura klavyeyle eklenir: boş numarada alanın hatası ve odak, PDF olmayan dosyanın reddi, PDF'in yüklenip
//   kaydedilmesi, indirilen dosyanın aynı içerik ve "fatura-<numara>.pdf" adı; müşteri takip sayfasında faturayı
//   görür ve indirir; düzenlenir ve onay penceresiyle kaldırılır (Vazgeç önce). Pencere ve sayfalar iki renkte ve üç
//   genişlikte taramadan geçer (kart 0268).
// - "Sipariş ayarları"nda kargo firması yan pencereden eklenir (bozuk takip adresi alanın hatası), onay penceresiyle
//   silinir; ekran iki renkte ve üç genişlikte taramadan geçer.
// Siparişler ve kargo firmaları sitenin paylaşılan verisidir: test kendi ürününü ve siparişlerini açar, sonunda
// firma listesini eski hâline döndürür (siparişler silinmez, kendi ürünü kullanılır).
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { epostaKayitlari } from "../../moduller/eposta/model";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { odemeServisi } from "../../moduller/odeme/servis";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler";
import { siparisAyarlari } from "../../moduller/siparis/ayarlar";
import { havaleBildirimiFormuSemasi } from "../../moduller/siparis/havale-bildirimi-semalari";
import { siparisler } from "../../moduller/siparis/model";
import { siparisServisi } from "../../moduller/siparis/servis";
import { siparisYonetimi } from "../../moduller/siparis/yonetim";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { siparisTakibiAdresi } from "../../vitrin/adresler";
import { bildirimSuresiniDurdur } from "./bildirim-suresi";
import { ozetOdaktaOlmali } from "./form-hatasi";
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
  // 403: not formunda yetki hatası bilerek üretilir (kart 0259).
  const hatalar = konsoluDinle(page, {
    haric: (m) => m.includes("401") || m.includes("status of 400") || m.includes("status of 403"),
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

  // Arama aranan metni adrese yazmaz: sonuç aynı tabloda, duyurulur.
  const arama = page.getByRole("searchbox", { name: metin("yonetim.siparisler.ara") });
  await arama.fill(eposta);
  await arama.press("Enter");
  await expect(
    page.getByText(doldur(metin("yonetim.liste.aramaSonucu"), { aranan: eposta, sayi: "1" })),
  ).toHaveCount(1);
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
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
    // Tek hata (kart 0259): odak firma seçiminde.
    await expect(
      kargoPenceresi.getByRole("combobox", { name: metin("yonetim.siparis.pencere.firma") }),
    ).toBeFocused();
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
  await expect(takip).toBeFocused();
  await expect(takip).toHaveAttribute("aria-invalid", "true");
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

  // Boş not (kart 0259): alanın hatası, odak alanda. Sunucunun alanı olmayan hatası (yetki) özette, odak özette.
  const notAlani = page.getByLabel(metin("yonetim.siparis.notlar.etiket"));
  const notKaydet = page.getByRole("button", { name: metin("yonetim.siparis.notlar.kaydet") });
  await notKaydet.click();
  await expect(notAlani).toBeFocused();
  await expect(notAlani).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(metin("yonetim.siparis.notlar.gerekli"))).toBeVisible();
  await page.route("**/kapi/yonetici/siparis-notu", (yol) =>
    yol.fulfill({ status: 403, json: { basarili: false, hata: { kod: "yetki" } } }),
  );
  await notAlani.fill("Gitmeyecek not");
  await notKaydet.click();
  await ozetOdaktaOlmali(page, [metin("yonetim.siparis.notlar.yetki")], 1);
  await expect(
    page.locator('[data-slot="hata-ozeti"]').getByText(metin("yonetim.form.ozet.kaydedilemedi")),
  ).toBeVisible();
  await page.unroute("**/kapi/yonetici/siparis-notu");
  // İç not eklenir ve geçmişte görünür.
  await notAlani.fill("Uçtan uca iç not");
  await page.getByRole("button", { name: metin("yonetim.siparis.notlar.kaydet") }).click();
  await expect(page.getByText(metin("yonetim.siparis.notlar.eklendi"))).toBeVisible();
  await expect(page.getByText("Uçtan uca iç not")).toBeVisible();
  await ikiRenkUcGenislik(page, "kargodaki sipariş");
  expect(hatalar).toEqual([]);
});

test("siparişler listesi: süzgeç, sıralama, geri dönüş, seçim ve toplu işlem klavyeyle (kart 0258)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const site = calisanSite();
  const ek = randomUUID().slice(0, 8);
  const kapidaBir = await siparisAc(
    { yontem: "kapida-odeme", secenek: "nakit" },
    `toplu-${ek}-1@ornek.test`,
  );
  const havaledeki = await siparisAc({ yontem: "havale" }, `toplu-${ek}-2@ornek.test`);
  const kapidaIki = await siparisAc(
    { yontem: "kapida-odeme", secenek: "nakit" },
    `toplu-${ek}-3@ornek.test`,
  );

  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await menudenGit(page, metin("yonetim.sayfa.siparisler.ad"), /\/yonetim\/siparisler$/);
  const tablo = page.getByRole("table");
  await expect(tablo.getByRole("link", { name: new RegExp(kapidaIki) })).toBeVisible();

  // Ödeme yöntemi süzgeci açılır menüden klavyeyle; seçim adrese yazılır, şeritte görünür.
  const odemeDugmesi = page.getByRole("button", { name: metin("yonetim.siparisler.odemeSuzgeci") });
  await odemeDugmesi.focus();
  await page.keyboard.press("Enter");
  const odemeMenusu = page.getByRole("menu");
  await expect(odemeMenusu).toBeVisible();
  await tara(page, "ödeme süzgeci açık");
  await odemeMenusu
    .getByRole("menuitemcheckbox", { name: metin("ortak.odemeYontemi.kapidaOdeme") })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?odeme=kapida-odeme$/);
  await page.keyboard.press("Escape");
  await expect(odemeMenusu).toBeHidden();
  await sayfaHazir(page);
  await expect(tablo.getByRole("link", { name: new RegExp(havaledeki) })).toHaveCount(0);
  await expect(tablo.getByRole("link", { name: new RegExp(kapidaBir) })).toBeVisible();
  const cip = page.getByRole("link", {
    name: doldur(metin("yonetim.liste.suzgeciKaldir"), {
      ad: `${metin("yonetim.siparisler.odemeSuzgeci")}: ${metin("ortak.odemeYontemi.kapidaOdeme")}`,
    }),
  });
  await expect(cip).toBeVisible();

  // Sıralama menüden klavyeyle; ayrıntıya gidip geri dönünce süzgeç ve sıralama yerinde.
  await page
    .getByRole("button", {
      name: doldur(metin("yonetim.liste.siralama"), {
        ad: metin("yonetim.siparisler.siralama.en-yeni"),
      }),
    })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("menuitemradio", { name: metin("yonetim.siparisler.siralama.en-eski") })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?odeme=kapida-odeme&sirala=en-eski$/);
  await sayfaHazir(page);
  await expect(page.getByRole("columnheader", { name: /Tarih/ })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  await page.goto(`/yonetim/siparisler/ayrinti?numara=${kapidaBir}`);
  await sayfaHazir(page);
  await page.goBack();
  await expect(page).toHaveURL(/\?odeme=kapida-odeme&sirala=en-eski$/);
  await sayfaHazir(page);
  await expect(cip).toBeVisible();

  // Şeritten süzgeç kaldırılır, en yeni sıralamaya dönülür.
  await cip.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?sirala=en-eski$/);
  await page.goto("/yonetim/siparisler");
  await sayfaHazir(page);

  // Seçim boşlukla; çubuk ve seçim sayısı. Havale siparişi hazırlamaya alınamaz, nedeni sonuçta yazar.
  const hepsi = tablo.getByRole("checkbox", { name: metin("yonetim.liste.sayfayiSec") });
  for (const numara of [kapidaBir, havaledeki]) {
    await tablo
      .getByRole("checkbox", { name: doldur(metin("yonetim.liste.satiriSec"), { ad: numara }) })
      .focus();
    await page.keyboard.press("Space");
  }
  await expect(hepsi).toHaveAttribute("aria-checked", "mixed");
  const cubuk = page.getByRole("region", { name: metin("yonetim.liste.topluIslem") });
  await expect(cubuk).toContainText(doldur(metin("yonetim.liste.seciliSayisi"), { sayi: "2" }));
  await ikiRenkUcGenislik(page, "seçimli sipariş listesi");
  // Telefonda (tablo yok) sayfanın hepsi ve satırlar listenin kutularıyla klavyeden seçilir (bağımsız kontrolün bulgusu).
  await page.setViewportSize({ width: 390, height: 900 });
  const telefon = page.getByRole("list", { name: metin("yonetim.siparisler.liste") });
  const telefondaHepsi = page
    .getByRole("checkbox", { name: metin("yonetim.liste.sayfayiSec") })
    .filter({ visible: true });
  await telefondaHepsi.focus();
  await page.keyboard.press("Space");
  await expect(cubuk).toBeHidden();
  await page.keyboard.press("Space");
  const satirSayisi = await telefon.getByRole("listitem").count();
  await expect(cubuk).toContainText(
    doldur(metin("yonetim.liste.seciliSayisi"), { sayi: String(satirSayisi) }),
  );
  await tara(page, "telefonda seçimli liste");
  await page.keyboard.press("Space");
  for (const numara of [kapidaBir, havaledeki]) {
    await telefon
      .getByRole("checkbox", { name: doldur(metin("yonetim.liste.satiriSec"), { ad: numara }) })
      .focus();
    await page.keyboard.press("Space");
  }
  await expect(cubuk).toContainText(doldur(metin("yonetim.liste.seciliSayisi"), { sayi: "2" }));
  await page.setViewportSize({ width: 1280, height: 900 });
  const cubukDugmesi = cubuk.getByRole("button", { name: metin("yonetim.eylem.hazirlamayaAl") });
  await cubukDugmesi.focus();
  // Koyu çubukta odak çerçevesi çubuğun yazı rengindedir (iki temada okunur; bağımsız kontrolün bulgusu).
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    const { cerceve, yazi, gorunur } = await cubukDugmesi.evaluate((oge) => ({
      cerceve: getComputedStyle(oge).outlineColor,
      yazi: getComputedStyle(oge).color,
      gorunur: oge.matches(":focus-visible"),
    }));
    expect(gorunur, `odak görünür (${renk})`).toBe(true);
    expect(cerceve, `odak çerçevesi (${renk})`).toBe(yazi);
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("alertdialog");
  await expect(pencere).toContainText(
    doldur(metin("yonetim.siparisler.toplu.hazirlamayaAl.baslik"), { sayi: "2" }),
  );
  await tara(page, "toplu işlem onayı");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const sonuc = page.getByText(
    doldur(metin("yonetim.siparisler.toplu.hazirlamayaAl.basari"), { sayi: "1" }),
  );
  await expect(sonuc).toBeVisible();
  const neden = page.getByText(
    doldur(metin("yonetim.liste.sonuc.satir"), {
      ad: havaledeki,
      neden: metin("yonetim.siparisler.toplu.neden.yontem-uymuyor"),
    }),
  );
  await expect(neden).toBeVisible();
  // Odak sonuçtadır.
  expect(
    await neden.evaluate(
      (oge) =>
        document.activeElement !== document.body && document.activeElement?.contains(oge) === true,
    ),
  ).toBe(true);
  await expect(cubuk).toBeHidden();
  const durumu = async (numara: string) =>
    (await siparisYonetimi(site).ayrinti(vt, numara))?.siparis.durum;
  expect(await durumu(kapidaBir)).toBe("hazirlaniyor");
  expect(await durumu(havaledeki)).toBe("odeme-bekleniyor");
  expect(await durumu(kapidaIki)).toBe("odeme-bekleniyor");
  await expect(tablo.getByRole("row").filter({ hasText: kapidaBir })).toContainText(
    metin("ortak.siparisDurumu.hazirlaniyor"),
  );
  // Yenilemeden sonra başlık yerine gelir (yenileme sırasında bir an boş kalabiliyor, ölçüldü).
  await expect(page).toHaveTitle(/\S/);
  await tara(page, "toplu işlemin sonucu");
  expect(hatalar).toEqual([]);
});

test("siparişler listesi: tarih, kargo firması ve bakılması gereken klavyeyle (kart 0267)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const site = calisanSite();
  const ek = randomUUID().slice(0, 8);
  // Üç sipariş: eski tarihli (başka testin siparişi o güne düşmez), kargodaki (testin kendi firma adı), havalesi
  // bildirilmiş (bakılması gereken).
  const eski = await siparisAc(
    { yontem: "kapida-odeme", secenek: "nakit" },
    `tarih-${ek}-1@ornek.test`,
  );
  const kargodaki = await siparisAc(
    { yontem: "kapida-odeme", secenek: "nakit" },
    `tarih-${ek}-2@ornek.test`,
  );
  const havaleEpostasi = `tarih-${ek}-3@ornek.test`;
  const bildirilen = await siparisAc({ yontem: "havale" }, havaleEpostasi);
  // İstanbul'da 15 Ocak 2020 öğle; sitenin saat dilimiyle aynı gün.
  await vt
    .update(siparisler)
    .set({ olusturma_zamani: new Date("2020-01-15T09:00:00Z") })
    .where(eq(siparisler.numara, eski));
  const firma = `Deneme, Kargo ${ek}`;
  await vt
    .update(siparisler)
    .set({ kargo_firmasi: firma, kargo_zamani: new Date() })
    .where(eq(siparisler.numara, kargodaki));
  const hesap = (await odemeYontemiServisi(site).oku(vt)).bankaHesaplari[0];
  if (hesap === undefined) throw new Error("Sitenin banka hesabı yok.");
  await siparisServisi(site).havaleBildir(
    vt,
    { tur: "eposta", eposta: havaleEpostasi },
    havaleBildirimiFormuSemasi.parse({
      numara: bildirilen,
      gonderen: "Deneme Müşteri",
      hesap: hesap.kimlik,
      tutar: "150,00",
      odemeTarihi: new Date().toISOString().slice(0, 10),
    }),
  );

  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await menudenGit(page, metin("yonetim.sayfa.siparisler.ad"), /\/yonetim\/siparisler$/);
  const tablo = page.getByRole("table");
  const satir = (numara: string) => tablo.getByRole("link", { name: new RegExp(numara) });
  await expect(satir(bildirilen)).toBeVisible();

  // Tarih paneli klavyeyle açılır, Escape kapatır ve odak düğmeye döner.
  const tarihDugmesi = page.getByRole("button", {
    name: new RegExp(`^${metin("yonetim.siparisler.tarihSuzgeci")}`),
  });
  const panel = page.getByRole("dialog", { name: metin("yonetim.siparisler.tarihSuzgeci") });
  await tarihDugmesi.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(tarihDugmesi).toBeFocused();

  // "Tarih seç": boş gönderimde başlangıcın hatası ve odak; iki gün de dahil.
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await ikiRenkUcGenislik(page, "tarih paneli açık");
  const ozelSecim = panel.getByRole("radio", { name: metin("yonetim.liste.tarih.ozel") });
  await ozelSecim.focus();
  await page.keyboard.press("Space");
  await expect(ozelSecim).toHaveAttribute("aria-checked", "true");
  const baslangic = panel.getByLabel(metin("yonetim.liste.tarih.baslangic"));
  const bitis = panel.getByLabel(metin("yonetim.liste.tarih.bitis"));
  const uygula = panel.getByRole("button", { name: metin("yonetim.liste.tarih.uygula") });
  await uygula.focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByText(metin("yonetim.liste.tarih.hata.bos"))).toBeVisible();
  await expect(baslangic).toBeFocused();
  await expect(baslangic).toHaveAttribute("aria-invalid", "true");
  await ikiRenkUcGenislik(page, "tarih paneli hatalı");
  // Yarım girilen gün boş uç sayılmaz: alanın hatası (bağımsız kontrolün bulgusu). Gün alanına yalnız ay yazılır.
  await baslangic.fill("2020-01-15");
  await bitis.focus();
  await page.keyboard.press("Home");
  await page.keyboard.type("01");
  expect(await bitis.evaluate((alan) => (alan as HTMLInputElement).validity.badInput)).toBe(true);
  await uygula.focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByText(metin("yonetim.liste.tarih.hata.gecersiz"))).toBeVisible();
  await expect(bitis).toBeFocused();
  await expect(page).not.toHaveURL(/tarih=/);
  await bitis.fill("2020-01-15");
  await uygula.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?tarih=2020-01-15_2020-01-15$/);
  await expect(panel).toBeHidden();
  await sayfaHazir(page);
  await expect(satir(eski)).toBeVisible();
  await expect(satir(bildirilen)).toHaveCount(0);
  const tarihCipi = page.getByRole("link", {
    name: new RegExp(`^${metin("yonetim.liste.suzgeciKaldir").replace("{ad}", "")}Tarih: .*2020`),
  });
  await expect(tarihCipi).toBeVisible();
  await expect(tarihCipi).not.toContainText("2020-01-15");

  // Hazır aralık: bugün; eski sipariş çıkar.
  await tarihDugmesi.focus();
  await page.keyboard.press("Enter");
  await expect(ozelSecim).toHaveAttribute("aria-checked", "true");
  const bugun = panel.getByRole("radio", { name: metin("yonetim.liste.tarih.hazir.bugun") });
  await bugun.focus();
  await page.keyboard.press("Space");
  await uygula.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?tarih=bugun$/);
  await sayfaHazir(page);
  await expect(satir(bildirilen)).toBeVisible();
  await expect(satir(eski)).toHaveCount(0);
  await page.goto("/yonetim/siparisler");
  await sayfaHazir(page);

  // Kargo firması: seçenekler siparişlerdeki adlar; virgüllü ad adreste kodlanır.
  const kargoDugmesi = page.getByRole("button", { name: metin("yonetim.siparisler.kargoSuzgeci") });
  await kargoDugmesi.focus();
  await page.keyboard.press("Enter");
  const kargoMenusu = page.getByRole("menu");
  await expect(kargoMenusu).toBeVisible();
  await tara(page, "kargo süzgeci açık");
  await kargoMenusu.getByRole("menuitemcheckbox", { name: firma }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`\\?kargo=${encodeURIComponent(encodeURIComponent(firma))}$`),
  );
  await page.keyboard.press("Escape");
  await sayfaHazir(page);
  await expect(satir(kargodaki)).toBeVisible();
  await expect(satir(bildirilen)).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: doldur(metin("yonetim.liste.suzgeciKaldir"), {
        ad: `${metin("yonetim.siparisler.kargoSuzgeci")}: ${firma}`,
      }),
    }),
  ).toBeVisible();
  await page.goto("/yonetim/siparisler");
  await sayfaHazir(page);

  // Bakılması gereken sekmesi: bildirilmiş havale işaretiyle, öteki siparişler yok.
  const sekme = page
    .getByRole("navigation", { name: metin("yonetim.siparisler.durumSuzgeci") })
    .getByRole("link", { name: new RegExp(metin("yonetim.siparisler.bakilacak")) });
  await sekme.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?durum=bakilacak$/);
  await sayfaHazir(page);
  await expect(sekme).toHaveAttribute("aria-current", "page");
  await expect(tablo.getByRole("row").filter({ hasText: bildirilen })).toContainText(
    metin("yonetim.siparisler.havaleBildirildi"),
  );
  await expect(satir(kargodaki)).toHaveCount(0);
  await expect(satir(eski)).toHaveCount(0);
  await ikiRenkUcGenislik(page, "bakılması gereken");
  // Telefonda seçili sekme şeridin görünen kısmındadır (sekme şeridin sonlarındadır; taslakla karşılaştırmada
  // ekranın dışında kalıyordu).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await sayfaHazir(page);
  const serit = page.getByRole("navigation", { name: metin("yonetim.siparisler.durumSuzgeci") });
  await expect
    .poll(async () => {
      const s = await serit.boundingBox();
      const k = await sekme.boundingBox();
      return s !== null && k !== null && k.x >= s.x && k.x + k.width <= s.x + s.width;
    })
    .toBe(true);
  expect(hatalar).toEqual([]);
});

test("sipariş ayrıntısı: fatura klavyeyle eklenir, PDF yüklenir, indirilir, düzenlenir ve kaldırılır; müşteri takipte indirir (kart 0268)", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const hatalar = konsoluDinle(page, {
    haric: (m) => m.includes("401") || m.includes("status of 400"),
  });
  const eposta = `fatura-${randomUUID().slice(0, 8)}@ornek.test`;
  const numara = await siparisAc({ yontem: "kapida-odeme", secenek: "nakit" }, eposta);
  const faturaNo = `ORN-F-${randomUUID().slice(0, 6)}`;
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await page.goto(`/yonetim/siparisler/ayrinti?numara=${numara}`);
  await sayfaHazir(page);
  const kart = page
    .getByRole("heading", { level: 2, name: metin("yonetim.siparis.fatura.baslik"), exact: true })
    .locator("../..");
  await expect(kart).toContainText(metin("yonetim.siparis.fatura.yok"));
  await kart.getByRole("button", { name: metin("yonetim.siparis.fatura.ekle") }).focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", {
    name: metin("yonetim.siparis.fatura.pencere.ekleBaslik"),
  });
  await expect(pencere).toBeVisible();
  const numaraAlani = pencere.getByLabel(metin("yonetim.siparis.fatura.pencere.numara"));
  // Boş numarada alanın hatası ve odak; tarih bugünle gelir, e-posta kutusu işaretli.
  await pencere
    .getByRole("button", { name: metin("yonetim.siparis.fatura.pencere.kaydet") })
    .focus();
  await page.keyboard.press("Enter");
  await expect(numaraAlani).toBeFocused();
  await expect(numaraAlani).toHaveAccessibleDescription(
    metin("yonetim.siparis.fatura.hata.numara"),
  );
  await expect(pencere.getByLabel(metin("yonetim.siparis.fatura.pencere.tarih"))).not.toHaveValue(
    "",
  );
  await expect(
    pencere.getByRole("checkbox", { name: metin("yonetim.siparis.fatura.pencere.eposta") }),
  ).toBeChecked();
  await ikiRenkUcGenislik(page, "fatura penceresi hatalı");
  await numaraAlani.focus();
  await page.keyboard.type(faturaNo);
  // PDF olmayan dosya alanın hatasıyla reddedilir; PDF yüklenir.
  const sec = pencere.getByRole("button", {
    name: metin("yonetim.siparis.fatura.pencere.dosyaSec"),
  });
  const dosyaSec = async (ad: string, mimeType: string, buffer: Buffer) => {
    const secici = page.waitForEvent("filechooser");
    await sec.focus();
    await page.keyboard.press("Enter");
    await (await secici).setFiles({ name: ad, mimeType, buffer });
  };
  await dosyaSec("fatura.txt", "text/plain", Buffer.from("düz metin"));
  await expect(pencere.getByText(/Bu dosya türü yüklenemez/)).toBeVisible();
  const icerik = Buffer.from("%PDF-1.7\n% uçtan uca fatura\n%%EOF\n", "latin1");
  await dosyaSec("fatura.pdf", "application/pdf", icerik);
  await expect(
    pencere.getByText(
      doldur(metin("yonetim.siparis.fatura.pencere.yuklendi"), { ad: "fatura.pdf" }),
    ),
  ).toBeVisible();
  await expect(pencere.getByText(/Bu dosya türü yüklenemez/)).toHaveCount(0);
  await pencere
    .getByRole("button", { name: metin("yonetim.siparis.fatura.pencere.kaydet") })
    .focus();
  await page.keyboard.press("Enter");
  await expect(pencere).toBeHidden();
  await expect(kart).toContainText(faturaNo);
  await expect(kart).toContainText(metin("yonetim.siparis.fatura.eklendi"));
  // Üye olmadan verilmiş sipariş: müşteri faturayı yalnız takip sayfasında görür.
  await expect(kart).toContainText(metin("yonetim.siparis.fatura.musteriTakipteGorur"));
  const indir = kart.getByRole("link", { name: new RegExp(`fatura-${numara}\\.pdf`) });
  const indirilen = page.waitForEvent("download");
  await indir.focus();
  await page.keyboard.press("Enter");
  const dosya = await indirilen;
  expect(dosya.suggestedFilename()).toBe(`fatura-${numara}.pdf`);
  expect(readFileSync(await dosya.path()).equals(icerik)).toBe(true);
  await ikiRenkUcGenislik(page, "faturalı sipariş ayrıntısı");

  // Müşteri takip sayfasında faturayı görür ve indirir.
  const adres = test.info().project.use.baseURL;
  const musteriBaglami = await browser.newContext(adres === undefined ? {} : { baseURL: adres });
  const musteri = await musteriBaglami.newPage();
  await musteri.setViewportSize({ width: 390, height: 844 });
  await musteri.goto(siparisTakibiAdresi(numara));
  await sayfaHazir(musteri);
  const epostaAlani = musteri.getByRole("textbox", { name: metin("vitrin.siparisTakibi.eposta") });
  await epostaAlani.fill(eposta);
  await epostaAlani.press("Enter");
  const faturaBolumu = musteri.getByRole("region", {
    name: metin("vitrin.siparis.fatura.baslik"),
    exact: true,
  });
  await expect(faturaBolumu).toContainText(faturaNo);
  const musteriIndirmesi = musteri.waitForEvent("download");
  await faturaBolumu.getByRole("link", { name: metin("vitrin.siparis.fatura.indir") }).click();
  expect(readFileSync(await (await musteriIndirmesi).path()).equals(icerik)).toBe(true);
  await ikiRenkUcGenislik(musteri, "takipte fatura");
  await musteriBaglami.close();

  // Düzenle: numara değişir; kaldır: onay penceresi, Vazgeç önce.
  await kart.getByRole("button", { name: metin("yonetim.siparis.fatura.duzenle") }).click();
  const duzenle = page.getByRole("dialog", {
    name: metin("yonetim.siparis.fatura.pencere.duzenleBaslik"),
  });
  await duzenle.getByLabel(metin("yonetim.siparis.fatura.pencere.numara")).fill(`${faturaNo}-2`);
  await duzenle
    .getByRole("button", { name: metin("yonetim.siparis.fatura.pencere.kaydet") })
    .click();
  await expect(duzenle).toBeHidden();
  await expect(kart).toContainText(`${faturaNo}-2`);
  await kart.getByRole("button", { name: metin("yonetim.siparis.fatura.kaldir") }).focus();
  await page.keyboard.press("Enter");
  const onay = page.getByRole("alertdialog");
  await expect(onay).toContainText(`${faturaNo}-2`);
  await page.keyboard.press("Enter");
  await expect(onay).toBeHidden();
  await expect(kart).toContainText(`${faturaNo}-2`);
  await kart.getByRole("button", { name: metin("yonetim.siparis.fatura.kaldir") }).click();
  await onay
    .getByRole("button", { name: metin("yonetim.siparis.fatura.kaldirOnay.dugme") })
    .click();
  await expect(kart).toContainText(metin("yonetim.siparis.fatura.yok"));
  expect(hatalar).toEqual([]);
});

test("sipariş ayrıntısı: teslimat ve fatura bilgileri klavyeyle düzeltilir; geçmişte önceki bilgi, kargoda düğme yok (kart 0269)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const eposta = `adres-${randomUUID().slice(0, 8)}@ornek.test`;
  const numara = await siparisAc({ yontem: "kapida-odeme", secenek: "nakit" }, eposta);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await page.goto(`/yonetim/siparisler/ayrinti?numara=${numara}`);
  await sayfaHazir(page);
  // Bölümler başlıklı karttır: başlıktan karta çıkılır.
  const bolum = (baslik: string) =>
    page.getByRole("heading", { level: 2, name: baslik, exact: true }).locator("..");
  const teslimat = bolum(metin("yonetim.siparis.teslimat.baslik"));
  const duzelt = teslimat.getByRole("button", { name: metin("yonetim.siparis.adres.duzelt") });
  await duzelt.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: metin("yonetim.siparis.adres.baslik") });
  await expect(pencere).toBeVisible();
  const alan = (ad: string) => pencere.getByLabel(ad, { exact: true });
  await expect(alan(metin("vitrin.odeme.ad"))).toHaveValue("Deneme");
  await expect(
    pencere.getByRole("checkbox", { name: metin("yonetim.siparis.adres.eposta") }),
  ).toBeChecked();
  // Boş adda alanın hatası ve odak.
  await alan(metin("vitrin.odeme.ad")).fill("");
  const kaydet = pencere.getByRole("button", { name: metin("yonetim.siparis.adres.kaydet") });
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(alan(metin("vitrin.odeme.ad"))).toBeFocused();
  await expect(alan(metin("vitrin.odeme.ad"))).toHaveAttribute("aria-invalid", "true");
  await ikiRenkUcGenislik(page, "adres penceresi hatalı");

  // Klavyeyle: ad, açık adres, kurumsal fatura.
  await alan(metin("vitrin.odeme.ad")).focus();
  await page.keyboard.type("Düzeltilmiş");
  await alan(metin("vitrin.odeme.adres")).fill("Yeni Sokak No: 7");
  // Açık adres değişince önceki yazılışı alanın altında (taslak).
  await expect(pencere).toContainText("Deneme Sokak No: 2");
  await pencere.getByRole("radio", { name: metin("vitrin.odeme.bireysel") }).focus();
  await page.keyboard.press("ArrowRight", { delay: 50 });
  await expect(pencere.getByRole("radio", { name: metin("vitrin.odeme.kurumsal") })).toBeChecked();
  await alan(metin("vitrin.odeme.firma")).fill("Deneme Ticaret");
  await alan(metin("vitrin.odeme.vergiDairesi")).fill("Çankaya");
  await alan(metin("vitrin.odeme.vergiNumarasi")).fill("4540536920");
  await ikiRenkUcGenislik(page, "adres penceresi kurumsal");
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(pencere).toBeHidden();
  await expect(teslimat).toContainText("Yeni Sokak No: 7");
  await expect(teslimat).toContainText("Deneme Ticaret");
  const gecmis = bolum(metin("yonetim.siparis.gecmis.baslik"));
  await expect(gecmis).toContainText(metin("yonetim.siparis.neden.adres-duzeltildi"));
  await expect(gecmis).toContainText("Deneme Sokak No: 2");
  await expect(gecmis).toContainText(metin("yonetim.siparis.teslimat.bireysel"));
  const [kayit] = await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, eposta));
  expect(
    (await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, eposta))).map(
      (e) => e.sablon,
    ),
  ).toContain("adres-guncellendi");
  expect(kayit).toBeDefined();
  await ikiRenkUcGenislik(page, "düzeltilmiş ayrıntı");

  // Kargoya verilen siparişte düğme yoktur.
  const yonetim = siparisYonetimi(calisanSite());
  await yonetim.islemYap(vt, yapan, {
    numara,
    islem: "hazirlamaya-al",
    gorulenDurum: "odeme-bekleniyor",
  });
  const [firma] = (await siparisAyarlari(calisanSite()).oku(vt)).kargoFirmalari;
  if (firma === undefined) throw new Error("Kargo firması yok.");
  await yonetim.islemYap(vt, yapan, {
    numara,
    islem: "kargoya-ver",
    gorulenDurum: "hazirlaniyor",
    kargo: { firma: firma.kimlik },
  });
  await page.reload();
  await sayfaHazir(page);
  await expect(duzelt).toHaveCount(0);
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
  await expect(adres).toBeFocused();
  await expect(adres).toHaveAttribute("aria-invalid", "true");
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
    // Düğmeden gönderilir: odak düğmededir, hatadan sonra alana dönmesi ölçülür.
    await bolum.getByRole("button", { name: metin("yonetim.siparisAyarlari.kaydet") }).focus();
    await page.keyboard.press("Enter");
    const hata = bolum.getByText(metin("yonetim.siparisAyarlari.alicilar.hata.eposta"));
    await expect(hata).toBeVisible();
    await expect(adresler).toBeFocused();
    await expect(adresler).toHaveAttribute("aria-invalid", "true");
    await tara(page, "yönetici bildirimleri hatalı");
    // Kaydedilmemiş değişiklikle panel menüsünden başka sayfaya giderken sorulur (kart 0259): "Sayfada kal" kalır ve
    // odağı bağlantıya verir; pencere taramadan geçer.
    const kargoBaglantisi = page
      .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
      .getByRole("link", { name: metin("yonetim.sayfa.kargo.ad") });
    await kargoBaglantisi.focus();
    await page.keyboard.press("Enter");
    const soru = page.getByRole("alertdialog", { name: metin("yonetim.form.cikis.baslik") });
    await expect(soru).toBeVisible();
    await expect(
      soru.getByRole("button", { name: metin("yonetim.form.cikis.kaydet") }),
    ).toBeVisible();
    await tara(page, "çıkarken soru");
    await page.keyboard.press("Enter");
    await expect(soru).toBeHidden();
    await expect(page).toHaveURL(/\/yonetim\/siparis-ayarlari$/);
    await expect(kargoBaglantisi).toBeFocused();
    // İptal ve iade bölümü: sınır dışı süre alanın hatası, odak alanda; Vazgeç geri alır.
    const iptal = page.getByRole("region", { name: metin("yonetim.siparisAyarlari.iptalVeIade") });
    const sure = iptal.getByLabel(metin("yonetim.siparisAyarlari.sure.ad"));
    await sure.fill("0");
    await iptal.getByRole("button", { name: metin("yonetim.siparisAyarlari.kaydet") }).click();
    await expect(sure).toBeFocused();
    await expect(sure).toHaveAttribute("aria-invalid", "true");
    await iptal.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
    await expect(sure).not.toHaveAttribute("aria-invalid", "true");
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
