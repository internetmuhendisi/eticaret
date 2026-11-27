// Panelin satış raporu tarayıcıda (kart 0317, karar 0195):
// - Mağaza sahibi menüden klavyeyle Raporlar'a gelir; rapor sitenin varsayılan dönemiyle açılır, iki renkte ve üç
//   genişlikte taramadan geçer.
// - Dönem paneli klavyeyle açılır ve taranır; özel aralıkta bitiş başlangıçtan önceyse alanın hatası ve odak bitişte.
// - Testin kendi geçmiş günü (siparişi o gün ödenmiş): satış kutusu servisin satışıdır; karşılaştırma kapatılınca
//   karşılaştırma yazısı kalkar. "Tablo olarak göster" serinin tablosunu gösterir. "Dışa aktar" CSV'yi indirir,
//   satışı aynıdır.
// - Satışsız gün boş hâli ve varsayılan döneme dönüş bağlantısını gösterir, taranır.
// - Konsolda hata yok.
//
// Testin günü 2002–2019 arasında rastgele seçilir: paylaşılan veritabanında başka teste ve önceki çalışmaya karışmaz.
import { randomBytes, randomInt } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { gunEkle, gununBasi, takvimGunuYazisi } from "../../metinler/bicimleyici";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { kuponlar } from "../../moduller/kampanya/model";
import { kuponServisi } from "../../moduller/kampanya/servis";
import { musteriHesabiAc } from "../../moduller/musteri/servis";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { odemeServisi } from "../../moduller/odeme/servis";
import { satisRaporu } from "../../moduller/rapor/satis";
import { siparisler } from "../../moduller/siparis/model";
import { siparisYonetimi } from "../../moduller/siparis/yonetim";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { raporlarAdresi } from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = sistemIslemi("tarayici-testi");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
const gun = `${randomInt(2002, 2020)}-${String(randomInt(1, 13)).padStart(2, "0")}-${String(randomInt(1, 28)).padStart(2, "0")}`;
let vt: Veritabani;
let urun = "";
let kupon = "";
let urunAdi = "";
let uyeAdi = "";

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const site = calisanSite();
  const ek = randomBytes(3).toString("hex");
  const servis = calisanSiteninUrunServisi();
  urun = await servis.urunEkle(vt, yapan, {
    ad: `Rapor ürünü ${ek}`,
    adresAdi: `rapor-urunu-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
    stokTakibi: true,
  });
  const birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 23_456 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 20,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  // Testin gününde ödenen üç sipariş: üye olmayan (2 adet), üye (1 adet) ve kuponlu (1 adet).
  const ver = async (
    kim: Parameters<ReturnType<typeof odemeServisi>["siparisVer"]>[1]["kim"],
    adet: number,
    kupon?: string,
  ) => {
    const { siparis } = await odemeServisi(site).siparisVer(
      vt,
      {
        kim,
        bilgiler: odemeBilgileriSemasi.parse({
          odemeYontemi: { yontem: "havale" },
          teslimat: {
            ad: "Deniz",
            soyad: `Rapor${ek}`,
            telefon: "0555 000 00 00",
            adres: {
              ulke: "TR",
              il: "TR-06",
              ilce: "TR-06-007",
              adres: "Deneme Sokak No: 5",
              postaKodu: "06420",
            },
          },
          fatura: { tur: "bireysel", adresAyni: true },
          onBilgilendirmeOnayi: true,
          mesafeliSatisOnayi: true,
          pazarlamaIzni: false,
        }),
        kalemler: [{ birim, adet }],
        ...(kupon === undefined ? {} : { kupon }),
      },
      3600,
    );
    await siparisYonetimi(site).islemYap(vt, yapan, {
      numara: siparis.numara,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    // Ödeme testin gününde alınmış sayılır.
    await vt
      .update(siparisler)
      .set({
        odeme_zamani: new Date(gununBasi(gun, site.ayarlar.saatDilimi).getTime() + 3_600_000),
      })
      .where(eq(siparisler.numara, siparis.numara));
  };
  await ver({ tur: "misafir", eposta: `rapor-${ek}@ornek.test`, hesap: { ac: false } }, 2);
  const musteri = await vt.transaction(
    async (islem) =>
      (
        await musteriHesabiAc(
          islem,
          {
            eposta: `rapor-uye-${ek}@ornek.test`,
            sifre: "uzun-bir-sifre-123",
            uyelikOnayi: true,
            kvkkOnayi: true,
            pazarlamaIzni: false,
          },
          3600,
        )
      ).musteri,
  );
  await ver({ tur: "uye", musteri }, 1);
  kupon = `RP${ek.toUpperCase()}`;
  await vt.transaction((islem) =>
    kuponServisi(site).ekle(islem, yapan, { kod: kupon, tur: "yuzde", deger: 10, kapsam: "hepsi" }),
  );
  await ver({ tur: "misafir", eposta: `rapor-k-${ek}@ornek.test`, hesap: { ac: false } }, 1, kupon);
  urunAdi = `Rapor ürünü ${ek}`;
  uyeAdi = `Deniz Rapor${ek}`;
});
test.afterAll(async () => {
  await vt
    .update(kuponlar)
    .set({ silinme_zamani: sql`now()` })
    .where(eq(kuponlar.kod, kupon))
    .catch(() => undefined);
  await calisanSiteninUrunServisi()
    .urunSil(vt, yapan, urun)
    .catch(() => undefined);
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
        `${ne} ${renk} ${boyut.width} yana kaymaz`,
      ).toBe(true);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

test("raporlar: mağaza sahibi klavyeyle dönem seçer, karşılaştırmayı kapatır, tabloyu görür, CSV indirir; boş dönem; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const konsol = konsoluDinle(page);
  const site = calisanSite();
  const b = siteninBicimleyicisi(site.ayarlar);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());

  const menu = page.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
  await menu.getByRole("link", { name: metin("yonetim.sayfa.raporlar.ad"), exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${raporlarAdresi}$`));
  await sayfaHazir(page);
  await expect(
    page.getByRole("heading", { level: 1, name: metin("yonetim.sayfa.raporlar.ad") }),
  ).toBeVisible();
  // Varsayılan dönem (son 30 gün) düğmede.
  const dugme = page.getByRole("button", {
    name: new RegExp(`^${metin("yonetim.rapor.hazir.son-30-gun")}:`),
  });
  await expect(dugme).toBeVisible();
  await ikiRenkUcGenislik(page, "rapor");

  // Dönem paneli: özel aralık, ters sırada bitişin hatası ve odak.
  await dugme.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: metin("yonetim.rapor.donemSecimi") });
  await expect(panel).toBeVisible();
  const ozel = panel.getByRole("radio", { name: metin("yonetim.rapor.ozel") });
  await ozel.focus();
  await page.keyboard.press("Space");
  const baslangic = panel.getByLabel(metin("yonetim.rapor.baslangic"));
  const bitis = panel.getByLabel(metin("yonetim.rapor.bitis"));
  await baslangic.fill(gun);
  await bitis.fill(gunEkle(gun, -1));
  const uygula = panel.getByRole("button", { name: metin("yonetim.rapor.uygula") });
  await uygula.focus();
  await page.keyboard.press("Enter");
  await expect(bitis).toBeFocused();
  await expect(bitis).toHaveAttribute("aria-invalid", "true");
  await expect(panel.getByText(metin("yonetim.rapor.hata.sira"))).toBeVisible();
  await ikiRenkUcGenislik(page, "dönem paneli hatalı");

  // Testin günü: karşılaştırma kapalı.
  await bitis.fill(gun);
  const kiyas = panel.getByRole("checkbox", { name: metin("yonetim.rapor.karsilastir") });
  await expect(kiyas).toBeChecked();
  await kiyas.focus();
  await page.keyboard.press("Space");
  await uygula.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`\\?donem=${gun}_${gun}&karsilastir=0$`));
  await expect(panel).toBeHidden();
  await sayfaHazir(page);
  const ozet = await satisRaporu(site).ozet(vt, { baslangic: gun, bitis: gun });
  expect(ozet.siparisSayisi).toBeGreaterThan(0);
  const satisKutusu = page.getByRole("group", { name: metin("yonetim.rapor.kutu.satis") });
  await expect(satisKutusu).toContainText(b.para(ozet.satis));
  await expect(page.getByText(/^Karşılaştırma:/)).toHaveCount(0);
  await expect(dugme).toHaveCount(0);
  await ikiRenkUcGenislik(page, "testin günü");

  // Seri tablosu: ekran okuyucuda her zaman, düğmeyle ekranda.
  const tablo = page.getByRole("table", { name: metin("yonetim.rapor.seri.gunluk") });
  await expect(tablo).toBeAttached();
  await expect(tablo).toContainText(b.para(ozet.satis));
  const goster = page.getByRole("button", { name: metin("yonetim.rapor.tabloyuGoster") });
  await goster.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: metin("yonetim.rapor.tabloyuGizle") }),
  ).toBeFocused();
  await expect(
    page.getByRole("cell", { name: b.para(ozet.satis), exact: true }).first(),
  ).toBeVisible();

  // CSV: ekrandaki satış.
  const indirilen = page.waitForEvent("download");
  await page.getByRole("link", { name: metin("yonetim.eylem.disaAktar") }).focus();
  await page.keyboard.press("Enter");
  const dosya = await indirilen;
  expect(dosya.suggestedFilename()).toBe(`satis-raporu-${gun}-${gun}.csv`);
  const icerik = readFileSync(await dosya.path(), "utf8");
  expect(icerik).toContain(
    `${metin("yonetim.rapor.csv.satir.satis")}${b.csvAyraci()}${b.csvTutari(ozet.satis)}\r\n`,
  );

  // Satışsız gün: boş hâl, varsayılan döneme dönüş.
  const bosGun = gunEkle(gun, 1);
  await page.goto(`${raporlarAdresi}?donem=${bosGun}_${bosGun}`);
  await sayfaHazir(page);
  await expect(
    page.getByRole("heading", { name: metin("yonetim.rapor.bos.baslik") }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: metin("yonetim.eylem.disaAktar") })).toHaveCount(0);
  await ikiRenkUcGenislik(page, "boş dönem");
  const donus = page.getByRole("link", {
    name: doldur(metin("yonetim.rapor.bos.donus"), {
      donem: metin("yonetim.rapor.hazir.son-30-gun"),
    }),
  });
  await donus.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${raporlarAdresi}\\?donem=son-30-gun$`));
  await sayfaHazir(page);

  // Dönem paneli açıkken taranır.
  await dugme.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await ikiRenkUcGenislik(page, "dönem paneli");
  await page.keyboard.press("Escape");
  await expect(dugme).toBeFocused();

  expect(konsol).toEqual([]);
});

test("raporlar: ürün, müşteri ve kupon sekmeleri klavyeyle; sıralama, bağlantılar, CSV; iki renkte ve üç genişlikte tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const konsol = konsoluDinle(page);
  const site = calisanSite();
  const b = siteninBicimleyicisi(site.ayarlar);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await page.goto(`${raporlarAdresi}?donem=${gun}_${gun}`);
  await sayfaHazir(page);
  const sekmeler = page.getByRole("navigation", { name: metin("yonetim.rapor.sekmeler") });
  const sekme = (kod: "urunler" | "musteriler" | "kuponlar") =>
    sekmeler.getByRole("link", { name: metin(`yonetim.rapor.sekme.${kod}`) });

  // Ürünler: dönem korunur; testin ürünü 4 adetle; adede göre sıralama.
  await sekme("urunler").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`\\?rapor=urunler&donem=${gun}_${gun}$`));
  await sayfaHazir(page);
  await expect(sekme("urunler")).toHaveAttribute("aria-current", "page");
  const urunSatiri = page.getByRole("row", { name: new RegExp(urunAdi) });
  await expect(urunSatiri).toContainText(b.sayi(4));
  await ikiRenkUcGenislik(page, "ürün raporu");
  await page.getByRole("link", { name: metin("yonetim.rapor.urun.adedeGore") }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/&sirala=adet$/);
  await sayfaHazir(page);
  await expect(
    page.getByRole("table", { name: metin("yonetim.rapor.urun.tablo.adet") }),
  ).toBeAttached();
  const indirilen = page.waitForEvent("download");
  await page.getByRole("link", { name: metin("yonetim.eylem.disaAktar") }).focus();
  await page.keyboard.press("Enter");
  const dosya = await indirilen;
  expect(dosya.suggestedFilename()).toBe(`rapor-urunler-${gun}-${gun}.csv`);
  expect(readFileSync(await dosya.path(), "utf8")).toContain(urunAdi);

  // Müşteriler: üye listede, müşteri ayrıntısına bağlantı; kutular.
  await sekme("musteriler").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`\\?rapor=musteriler&donem=${gun}_${gun}$`));
  await sayfaHazir(page);
  await expect(
    page.getByRole("group", { name: metin("yonetim.rapor.musteri.kutu.yeni") }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: uyeAdi })).toHaveAttribute(
    "href",
    /\/yonetim\/musteriler\/ayrinti\?kimlik=/,
  );
  await ikiRenkUcGenislik(page, "müşteri raporu");

  // Kuponlar: testin kuponu kuponun sayfasına bağlantı.
  await sekme("kuponlar").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`\\?rapor=kuponlar&donem=${gun}_${gun}$`));
  await sayfaHazir(page);
  await expect(page.getByRole("link", { name: kupon })).toHaveAttribute(
    "href",
    /\/yonetim\/kuponlar\/kupon\?kimlik=/,
  );
  await ikiRenkUcGenislik(page, "kupon raporu");

  // Dönem değişince açık sekmede kalınır.
  await page
    .getByRole("button", { name: new RegExp(takvimGunuYazisi(site.ayarlar.dil, gun, "uzun")) })
    .focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: metin("yonetim.rapor.donemSecimi") });
  await panel.getByRole("radio", { name: metin("yonetim.rapor.hazir.bugun") }).focus();
  await page.keyboard.press("Space");
  await panel.getByRole("button", { name: metin("yonetim.rapor.uygula") }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?rapor=kuponlar&donem=bugun$/);
  await sayfaHazir(page);

  // Kuponsuz gün: kupon raporunun boş hâli.
  const bosGun = gunEkle(gun, 1);
  await page.goto(`${raporlarAdresi}?rapor=kuponlar&donem=${bosGun}_${bosGun}`);
  await sayfaHazir(page);
  await expect(page.getByRole("heading", { name: metin("yonetim.rapor.kupon.bos") })).toBeVisible();
  await ikiRenkUcGenislik(page, "boş kupon raporu");

  expect(konsol).toEqual([]);
});
