// Panelin panosu tarayıcıda (kart 0186, karar 0199):
// - Mağaza sahibi açılışta günün selamını, bakılması gerekenleri, son 14 günün satışını, kısa sayıları ve kısayolları
//   görür. Klavyeyle bir satıra gidip Enter ile ilgili listeyi, sayı kutusuyla süzülmüş listeyi, kısayolla ürün
//   ekranını açar. Pano iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; konsolda hata yok.
// - Görevli satış kutusunu ve satış sayılarını görmez, siparişlerin sayılarını görür.
// Paylaşılan veritabanında başka testlerin siparişleri de sayılır: test kendi havale bildirimini koyar, sayının
// kesin değerine bağlanmaz.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { roller, yoneticiler, yoneticiRolleri } from "../../moduller/ekip/model";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { odemeServisi } from "../../moduller/odeme/servis";
import { siparisler } from "../../moduller/siparis/model";
import { siparisServisi } from "../../moduller/siparis/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, panoBasligi, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-pano");

test.afterAll(async () => {
  await vt.$client.end();
});

// Testin kendi havale siparişi ve bildirimi: "Bakılması gerekenler"de havale satırı olur.
const havaleBildir = async () => {
  const ek = randomBytes(4).toString("hex");
  const urunServisi = calisanSiteninUrunServisi();
  const urun = await urunServisi.urunEkle(vt, yapan, {
    ad: `Pano deneme ${ek}`,
    adresAdi: `pano-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await urunServisi.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 12_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 5,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const eposta = `pano-${ek}@ornek.test`;
  const sonuc = await odemeServisi(calisanSite()).siparisVer(
    vt,
    {
      kim: { tur: "misafir", eposta, hesap: { ac: false } },
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: { yontem: "havale" },
        teslimat: {
          ad: "Zeynep",
          soyad: "Kara",
          telefon: "0555 000 00 00",
          adres: {
            ulke: "TR",
            il: "TR-06",
            ilce: "TR-06-007",
            adres: "Deneme Sokak No: 3",
            postaKodu: "06420",
          },
        },
        fatura: { tur: "bireysel", adresAyni: true },
        onBilgilendirmeOnayi: true,
        mesafeliSatisOnayi: true,
        pazarlamaIzni: false,
      }),
      kalemler: [{ birim, adet: 1 }],
    },
    3600,
  );
  const numara = sonuc.siparis.numara;
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  const { bankaHesaplari } = await siteninMagazaAyarlari(vt, calisanSite());
  await siparisServisi(calisanSite()).havaleBildir(
    vt,
    { tur: "eposta", eposta },
    {
      numara,
      gonderen: "Zeynep Kara",
      hesap: bankaHesaplari[0]?.kimlik ?? "",
      tutar: siteninBicimleyicisi(calisanSite().ayarlar).paraYazisi(satir?.toplam ?? 0),
      odemeTarihi: new Date().toISOString().slice(0, 10),
    },
  );
};

const gorevliYap = async (eposta: string) => {
  const [hesap] = await vt
    .select({ kimlik: yoneticiler.kimlik })
    .from(yoneticiler)
    .where(eq(yoneticiler.eposta, eposta));
  const [rol] = await vt
    .select({ kimlik: roller.kimlik })
    .from(roller)
    .where(eq(roller.kod, "gorevli"));
  if (hesap === undefined || rol === undefined) throw new Error("Yönetici ya da rol yok.");
  await vt.delete(yoneticiRolleri).where(eq(yoneticiRolleri.yonetici_kimligi, hesap.kimlik));
  await vt
    .insert(yoneticiRolleri)
    .values({ yonetici_kimligi: hesap.kimlik, rol_kimligi: rol.kimlik });
};

const baslik = (page: Page, ad: string) => page.getByRole("heading", { level: 2, name: ad });
const ikiRenk = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    await tara(page, `${ne} ${renk}`);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${ne} ${renk} yana kaymaz`,
    ).toBe(true);
  }
  await page.emulateMedia({ colorScheme: "light" });
};

test("pano: selam, bakılması gerekenler, satış, sayılar ve kısayollar; klavyeyle gezinti; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page);
  await havaleBildir();
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(panoBasligi);
  await expect(baslik(page, metin("yonetim.pano.bakilacaklar"))).toBeVisible();
  await expect(baslik(page, "Son 14 günün satışı")).toBeVisible();
  await expect(baslik(page, metin("yonetim.pano.kisayollar"))).toBeVisible();
  await expect(page.getByRole("region", { name: metin("yonetim.pano.sayilar") })).toBeVisible();
  for (const boyut of [
    { width: 1280, height: 900 },
    { width: 768, height: 1000 },
    { width: 375, height: 800 },
  ]) {
    await page.setViewportSize(boyut);
    await ikiRenk(page, `pano ${boyut.width}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  // Klavyeyle havale satırı: süzülmüş listeye ya da tek siparişin ayrıntısına gider.
  const havale = page.getByRole("link", { name: /sipariş bakılmayı bekliyor/ });
  await havale.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/siparisler(\?durum=bakilacak|\/ayrinti\?numara=)/);
  await sayfaHazir(page);
  await page.goBack();
  await sayfaHazir(page);

  // Sayı kutusu: hazırlanacak siparişler.
  const hazirlanacak = page.getByRole("link", { name: metin("yonetim.pano.kutu.hazirlanacak") });
  await hazirlanacak.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/siparisler\?durum=hazirlaniyor$/);
  await sayfaHazir(page);
  await page.goBack();
  await sayfaHazir(page);

  // Kısayol: ürün ekle.
  const kisayollar = page
    .getByRole("heading", { level: 2, name: metin("yonetim.pano.kisayollar") })
    .locator("xpath=ancestor::*[@data-slot='kart'][1]");
  await kisayollar.getByRole("link", { name: metin("yonetim.eylem.urunEkle") }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/urunler\/yeni$/);
  await sayfaHazir(page);
  expect(hatalar).toEqual([]);
});

test("görevli satış kutusunu ve satış sayılarını görmez", async ({ page }) => {
  test.setTimeout(300_000);
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const yonetici = yoneticiAc();
  await gorevliYap(yonetici.eposta);
  await paneleGir(page, yonetici);
  await expect(baslik(page, metin("yonetim.pano.bakilacaklar"))).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /günün satışı/ })).toHaveCount(0);
  const sayilar = page.getByRole("region", { name: metin("yonetim.pano.sayilar") });
  await expect(sayilar.getByRole("link", { name: metin("yonetim.pano.kutu.bugun") })).toHaveCount(
    0,
  );
  await expect(
    sayilar.getByRole("link", { name: metin("yonetim.pano.kutu.hazirlanacak") }),
  ).toBeVisible();
  await expect(baslik(page, metin("yonetim.pano.adimlar"))).toHaveCount(0);
});
