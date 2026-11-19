// Panelden iptal ve iade gerçek tarayıcıda (kart 0235, karar 0147; kart 0233'ün taslağı):
// - Testin kapıda ödemeli, iki adetlik siparişi teslim edilmiştir. Mağaza sahibi ayrıntıda "İade yap"ı klavyeyle açar;
//   pencere iki renkte ve üç genişlikte taramadan geçer, yana kaymaz.
// - Boş gönderimde ürün seçimi ve neden hatası görünür, odak ürün seçimine gider.
// - Klavyeyle bir adet seçilir: düğme ve özet sunucunun hesabıyla aynı tutarı yazar (kalemin yarısı); neden listeden
//   klavyeyle seçilir; Enter ile kaydedilir. Sipariş "kısmi iade" olur, ayrıntıda iade satırı görünür ve sayfa
//   taramadan geçer.
// - Hazırlanan siparişte "İptal et" aynı pencereyi ürün seçimsiz açar; iptal edilen siparişte iade düğmeleri yoktur.
// Siparişler sitenin paylaşılan verisidir: test kendi ürününü ve siparişini açar, eklediği kargo firmasını sonunda
// kaldırır.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { odemeServisi } from "../../moduller/odeme/servis";
import { siparisAyarlari } from "../../moduller/siparis/ayarlar";
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
const yapan = sistemIslemi("uctan-uca-iade");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
let firma = "";

test.beforeAll(async () => {
  const ayarlar = siparisAyarlari(calisanSite());
  const firmalar = (await ayarlar.oku(vt)).kargoFirmalari;
  const ad = `İade denemesi ${randomUUID().slice(0, 6)}`;
  const sonra = await ayarlar.kargoFirmalariniKaydet(vt, yapan, {
    onceki: firmalar.map((f) => f.kimlik),
    firmalar: [...firmalar, { ad }],
  });
  firma = sonra.kargoFirmalari.find((f) => f.ad === ad)?.kimlik ?? "";
});

test.afterAll(async () => {
  const ayarlar = siparisAyarlari(calisanSite());
  const bugun = (await ayarlar.oku(vt)).kargoFirmalari;
  await ayarlar.kargoFirmalariniKaydet(vt, yapan, {
    onceki: bugun.map((f) => f.kimlik),
    firmalar: bugun.filter((f) => f.kimlik !== firma),
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

// Testin kendi ürünü ve kapıda ödemeli siparişi.
const siparisAc = async (adet: number) => {
  const urunServisi = calisanSiteninUrunServisi();
  const ek = randomUUID().slice(0, 8);
  const ad = `İade deneme ${ek}`;
  const urun = await urunServisi.urunEkle(vt, yapan, {
    ad,
    adresAdi: `iade-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await urunServisi.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 14_999 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 5,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const sonuc = await odemeServisi(calisanSite()).siparisVer(
    vt,
    {
      kim: { tur: "misafir", eposta: `iade-${ek}@ornek.test`, hesap: { ac: false } },
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: { yontem: "kapida-odeme", secenek: "nakit" },
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
      }),
      kalemler: [{ birim, adet }],
    },
    3600,
  );
  return { numara: sonuc.siparis.numara, ad };
};

const ayrintiyaGit = async (page: Page, numara: string) => {
  await page.goto(`/yonetim/siparisler/ayrinti?numara=${numara}`);
  await sayfaHazir(page);
};

test("panelden klavyeyle kısmi iade ve iptal", async ({ page }) => {
  test.setTimeout(240_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const site = calisanSite();
  const b = siteninBicimleyicisi(site.ayarlar);
  const yonetim = siparisYonetimi(site);
  const { numara, ad } = await siparisAc(2);
  await yonetim.islemYap(vt, yapan, {
    numara,
    islem: "hazirlamaya-al",
    gorulenDurum: "odeme-bekleniyor",
  });
  await yonetim.islemYap(vt, yapan, {
    numara,
    islem: "kargoya-ver",
    gorulenDurum: "hazirlaniyor",
    kargo: { firma },
  });
  await yonetim.islemYap(vt, yapan, { numara, islem: "teslim-edildi", gorulenDurum: "kargoda" });
  const kalem = (await yonetim.ayrinti(vt, numara))?.kalemler[0];
  if (kalem === undefined) throw new Error("Kalem yok.");
  // Elle: 2 adetin 1'i, maliyetin yarısı (yarım kuruş yukarı).
  const beklenen = b.para(Math.round((kalem.vergisiz + kalem.vergi) / 2));

  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());
  await ayrintiyaGit(page, numara);

  const iadeDugmesi = page.getByRole("button", { name: metin("yonetim.eylem.iadeYap") });
  await iadeDugmesi.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: metin("yonetim.iade.iadeBaslik") });
  await expect(pencere).toBeVisible();
  await ikiRenkUcGenislik(page, "iade penceresi");

  // Boş gönderim: ürün ve neden hatası, odak ürün seçiminde.
  const gonder = pencere.getByRole("button", {
    name: doldur(metin("yonetim.iade.iadeDugmesi"), { tutar: b.para(0) }),
  });
  await gonder.focus();
  await page.keyboard.press("Enter");
  await expect(pencere.getByText(metin("yonetim.iade.hata.bos"))).toBeVisible();
  await expect(pencere.getByText(metin("yonetim.iade.hata.neden"))).toBeVisible();
  await expect(page.locator('[data-iade-alani="kalemler"]')).toBeFocused();
  await tara(page, "hatalı iade penceresi");

  // Bir adet klavyeyle.
  const artir = pencere.getByRole("button", { name: doldur(metin("yonetim.iade.artir"), { ad }) });
  await artir.focus();
  await page.keyboard.press("Enter");
  const iadeEt = pencere.getByRole("button", {
    name: doldur(metin("yonetim.iade.iadeDugmesi"), { tutar: beklenen }),
  });
  await expect(iadeEt).toBeVisible();
  await expect(pencere.getByRole("textbox", { name: metin("yonetim.iade.tutar") })).toHaveValue(
    beklenen.replace(/[^\d.,]/gu, ""),
  );
  // Neden listeden klavyeyle.
  const neden = pencere.getByRole("combobox", { name: metin("yonetim.iade.iadeNedeni") });
  await neden.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: metin("yonetim.iade.neden.kusurlu-hasarli") }).focus();
  await page.keyboard.press("Enter");
  await expect(neden).toContainText(metin("yonetim.iade.neden.kusurlu-hasarli"));
  await iadeEt.focus();
  await page.keyboard.press("Enter");
  await expect(pencere).toBeHidden();
  await expect(page.getByText(metin("yonetim.iade.basari.iade"))).toBeVisible();
  const sonra = await yonetim.ayrinti(vt, numara);
  expect(sonra?.siparis.durum).toBe("kismi-iade");
  expect(sonra?.iadeler).toMatchObject([
    {
      tur: "iade",
      durum: "tamamlandi",
      yontem: "elle",
      neden: "kusurlu-hasarli",
      kalemler: [{ adet: 1 }],
    },
  ]);
  const bolum = page.getByRole("heading", { name: metin("yonetim.iade.liste.baslik") });
  await expect(bolum).toBeVisible();
  await expect(
    page.getByText(doldur(metin("yonetim.iade.liste.kalem"), { adet: "1", ad })),
  ).toBeVisible();
  await ikiRenkUcGenislik(page, "iadeli sipariş ayrıntısı");

  // İptal: hazırlanan siparişte aynı pencere, ürün seçimi yok; iptalden sonra düğme yok.
  const ikinci = await siparisAc(1);
  await yonetim.islemYap(vt, yapan, {
    numara: ikinci.numara,
    islem: "hazirlamaya-al",
    gorulenDurum: "odeme-bekleniyor",
  });
  await ayrintiyaGit(page, ikinci.numara);
  const iptalDugmesi = page.getByRole("button", { name: metin("yonetim.eylem.siparisIptal") });
  await iptalDugmesi.focus();
  await page.keyboard.press("Enter");
  const iptalPenceresi = page.getByRole("dialog", { name: metin("yonetim.iade.iptalBaslik") });
  await expect(iptalPenceresi).toBeVisible();
  await expect(iptalPenceresi.getByRole("button", { name: /Artır/u })).toHaveCount(0);
  await expect(iptalPenceresi.getByText(metin("yonetim.iade.para.yok"))).toBeVisible();
  await tara(page, "iptal penceresi");
  const iptalNedeni = iptalPenceresi.getByRole("combobox", {
    name: metin("yonetim.iade.iptalNedeni"),
  });
  await iptalNedeni.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: metin("yonetim.iade.neden.musteri-vazgecti") }).focus();
  await page.keyboard.press("Enter");
  await iptalPenceresi.getByRole("button", { name: metin("yonetim.iade.iptalDugmesi") }).focus();
  await page.keyboard.press("Enter");
  await expect(iptalPenceresi).toBeHidden();
  expect((await yonetim.ayrinti(vt, ikinci.numara))?.siparis.durum).toBe("iptal");
  await expect(page.getByRole("button", { name: metin("yonetim.eylem.siparisIptal") })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: metin("yonetim.eylem.iadeYap") })).toHaveCount(0);
  expect(hatalar).toEqual([]);
});
