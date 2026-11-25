// Müşterinin iade talebi ve kendi iptali gerçek tarayıcıda (kart 0239, karar 0151; kart 0233'ün taslağı):
// - Üye teslim edilmiş siparişinin ayrıntısından "İade talebi oluştur"u klavyeyle açar. Form iki renkte ve üç
//   genişlikte taramadan geçer. Boş gönderimde alanlara bağlantılı özet çıkar ve odağı alır; hatalı form taramadan
//   geçer. Ürün onay kutusuyla, adet ve neden klavyeyle seçilir; teşekkür görünür ve odağı alır.
// - Mağaza sahibi Siparişler'in "Bakılması gereken" sekmesinde (kart 0239'un eski "İade talepleri" adresiyle açılır,
//   kart 0267) siparişi görür, ayrıntıda talebi klavyeyle onaylar;
//   "İade yap" talebin ürünleriyle seçili açılır, iade talebe bağlanır. Müşteri sipariş sayfasında onayı ve iadeyi görür.
// - Üye olmayan müşteri takip sayfasından talep açar (robot korumalı uç); mağaza sahibi açıklamayla reddeder; müşteri
//   açıklamayı görür. Ödeme bekleyen siparişini "Siparişi iptal et" ile onay penceresinden iptal eder. "Başka bir
//   sipariş sorgula" takibin veritabanındaki anahtarını da siler (çerez takip uçlarının yoluna da yazılır).
// Siparişler sitenin paylaşılan verisidir: test kendi ürününü, müşterisini ve kargo firmasını açar, firmayı sonunda
// kaldırır.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { type OdemeGirdisi, odemeServisi } from "../../moduller/odeme/servis";
import { hesapAc } from "../../moduller/oturum/servis";
import { siparisAyarlari } from "../../moduller/siparis/ayarlar";
import {
  siparisIadeleri,
  siparisIadeTalepleri,
  siparisler,
  siparisTakipErisimleri,
} from "../../moduller/siparis/model";
import { siparisYonetimi } from "../../moduller/siparis/yonetim";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { hesapSiparisiAdresi, siparisTakibiAdresi, vitrinAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-iade-talebi");
const sifre = "uzun-bir-deneme-sifresi";
const ek = randomUUID().slice(0, 8);
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
let firma = "";
const urunAdi = `Talep deneme ${ek}`;
let birim = "";

test.beforeEach(({ page }) =>
  page.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`,
  }),
);

test.beforeAll(async () => {
  const ayarlar = siparisAyarlari(calisanSite());
  const firmalar = (await ayarlar.oku(vt)).kargoFirmalari;
  const ad = `Talep denemesi ${ek}`;
  const sonra = await ayarlar.kargoFirmalariniKaydet(vt, yapan, {
    onceki: firmalar.map((f) => f.kimlik),
    firmalar: [...firmalar, { ad }],
  });
  firma = sonra.kargoFirmalari.find((f) => f.ad === ad)?.kimlik ?? "";
  const servis = calisanSiteninUrunServisi();
  const urun = await servis.urunEkle(vt, yapan, {
    ad: urunAdi,
    adresAdi: `talep-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 12_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 30,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
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

const siparisVer = async (
  kim: OdemeGirdisi["kim"],
  adet: number,
  yontem: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" },
) => {
  const sonuc = await odemeServisi(calisanSite()).siparisVer(
    vt,
    {
      kim,
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: yontem,
        teslimat: {
          ad: "Deniz",
          soyad: "Talep",
          telefon: "0555 000 00 42",
          adres: {
            ulke: "TR",
            il: "TR-06",
            ilce: "TR-06-007",
            adres: "Talep Sokak No: 3",
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
  return sonuc.siparis.numara;
};

const teslimEt = async (numara: string) => {
  const yonetim = siparisYonetimi(calisanSite());
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
};

const talepleri = async (numara: string) => {
  const [siparis] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  return vt
    .select()
    .from(siparisIadeTalepleri)
    .where(eq(siparisIadeTalepleri.siparis_kimligi, siparis?.kimlik ?? ""));
};

const alan = (page: Page, etiket: string) => page.getByLabel(etiket, { exact: true });

// Formun ürününü, adedini ve nedenini klavyeyle seçip gönderir.
const talebiDoldur = async (page: Page, adet: number) => {
  const kutu = page.getByRole("checkbox", { name: urunAdi });
  await kutu.focus();
  await page.keyboard.press("Space");
  await expect(kutu).toHaveAttribute("aria-checked", "true");
  for (let sira = 1; sira < adet; sira++) {
    const artir = page.getByRole("button", {
      name: doldur(metin("vitrin.iadeTalebi.artir"), { urun: urunAdi }),
    });
    await artir.focus();
    await page.keyboard.press("Enter");
  }
  const neden = page.getByRole("combobox", { name: metin("vitrin.iadeTalebi.neden.baslik") });
  await neden.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: metin("vitrin.iadeTalebi.neden.beden-uymadi") }).focus();
  await page.keyboard.press("Enter");
  await expect(neden).toContainText(metin("vitrin.iadeTalebi.neden.beden-uymadi"));
  await alan(page, metin("vitrin.iadeTalebi.aciklama")).fill(`Küçük geldi ${ek}`);
  const gonder = page.getByRole("button", { name: metin("vitrin.iadeTalebi.gonder") });
  await gonder.focus();
  await page.keyboard.press("Enter");
  const tesekkur = page.getByRole("status").filter({ hasText: metin("vitrin.iadeTalebi.alindi") });
  await expect(tesekkur).toBeVisible();
  await expect(tesekkur).toBeFocused();
};

test("üye klavyeyle iade talebi açar; mağaza onaylar ve talepten iade yapar; müşteri sonucu görür", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const eposta = `talep-${ek}-${randomUUID().slice(0, 6)}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, "musteri", { eposta, sifre });
  const numara = await siparisVer({ tur: "uye", musteri: hesapKimligi }, 2);
  await teslimEt(numara);

  // Giriş, sonra siparişin ayrıntısı.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(hesapSiparisiAdresi(numara));
  await sayfaHazir(page);
  await alan(page, metin("vitrin.giris.eposta")).fill(eposta);
  await alan(page, metin("vitrin.giris.sifre")).fill(sifre);
  await alan(page, metin("vitrin.giris.sifre")).press("Enter");
  await expect(page).toHaveURL(hesapSiparisiAdresi(numara));
  await sayfaHazir(page);
  const olustur = page.getByRole("link", { name: metin("vitrin.siparis.iadeTalebiOlustur") });
  await olustur.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`${hesapSiparisiAdresi(numara)}/iade-talebi`);
  await sayfaHazir(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(
    page.getByRole("heading", { level: 1, name: metin("vitrin.iadeTalebi.baslik") }),
  ).toBeVisible();
  await expect(page.getByText(metin("vitrin.iadeTalebi.kargoMagaza"))).toBeVisible();
  await ikiRenkUcGenislik(page, "iade talebi formu");

  // Boş gönderim: alanlara bağlantılı özet odağı alır.
  const gonder = page.getByRole("button", { name: metin("vitrin.iadeTalebi.gonder") });
  await gonder.focus();
  await page.keyboard.press("Enter");
  const ozet = page.getByText(doldur(metin("vitrin.iadeTalebi.hataOzeti"), { sayi: "2" }));
  await expect(ozet).toBeVisible();
  await expect(page.getByText(metin("vitrin.iadeTalebi.hata.kalemler"))).toBeVisible();
  await expect(
    alan(page, metin("vitrin.iadeTalebi.neden.baslik")).or(
      page.getByRole("combobox", { name: metin("vitrin.iadeTalebi.neden.baslik") }),
    ),
  ).toHaveAccessibleDescription(metin("vitrin.iadeTalebi.hata.neden"));
  await expect(page.locator("div[tabindex='-1']").filter({ has: ozet }).first()).toBeFocused();
  // Özetteki bağlantı alana götürür.
  await page.getByRole("link", { name: metin("vitrin.iadeTalebi.urunlerKisa") }).press("Enter");
  await expect(page.getByRole("checkbox", { name: urunAdi })).toBeFocused();
  await tara(page, "hatalı iade talebi formu");

  await talebiDoldur(page, 2);
  const [talep] = await talepleri(numara);
  expect(talep).toMatchObject({
    durum: "bekliyor",
    kalemler: [{ sira: 0, adet: 2 }],
    neden: "beden-uymadi",
    aciklama: `Küçük geldi ${ek}`,
  });
  await tara(page, "iade talebi alındı");

  // Siparişe dönünce talep geçmişte, yeni talep yerine "inceleniyor".
  await page.getByRole("link", { name: metin("vitrin.iadeTalebi.siparisinizeDonun") }).click();
  await expect(page).toHaveURL(hesapSiparisiAdresi(numara));
  await sayfaHazir(page);
  await expect(page.getByText(metin("vitrin.siparis.olay.talepAlindi"))).toBeVisible();
  await expect(page.getByText(metin("vitrin.siparis.talepInceleniyor"))).toBeVisible();
  await expect(
    page.getByRole("link", { name: metin("vitrin.siparis.iadeTalebiOlustur") }),
  ).toHaveCount(0);

  // Mağaza sahibi: eski "İade talepleri" adresi "Bakılması gereken" sekmesini açar (kart 0267), talep kutusu, onay.
  await paneleGir(page, yoneticiAc());
  await page.goto("/yonetim/siparisler?durum=iade-talebi");
  await sayfaHazir(page);
  await expect(
    page.getByRole("link", { name: metin("yonetim.siparisler.bakilacak") }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByRole("link", { name: doldur(metin("yonetim.siparisler.ayrintiAdi"), { numara }) })
      .first(),
  ).toBeVisible();
  await page.goto(`/yonetim/siparisler/ayrinti?numara=${numara}`);
  await sayfaHazir(page);
  const kutu = page.locator('[aria-labelledby^="iade-talebi-"]');
  await expect(kutu).toContainText(`Küçük geldi ${ek}`);
  await ikiRenkUcGenislik(page, "talepli sipariş ayrıntısı");
  const onayla = page.getByRole("button", { name: metin("yonetim.iadeTalebi.onayla") });
  await onayla.focus();
  await page.keyboard.press("Enter");
  const onayPenceresi = page.getByRole("alertdialog", {
    name: metin("yonetim.iadeTalebi.onay.baslik"),
  });
  await expect(onayPenceresi).toBeVisible();
  await onayPenceresi
    .getByRole("button", { name: metin("yonetim.iadeTalebi.onayla") })
    .press("Enter");
  await expect(page.getByText(metin("yonetim.iadeTalebi.basari.onaylandi"))).toBeVisible();
  await expect(page.getByText(metin("yonetim.iadeTalebi.onaylandiAciklamasi"))).toBeVisible();

  // "İade yap" talebin ürünleriyle seçili açılır.
  const iadeDugmesi = page.getByRole("button", { name: metin("yonetim.eylem.iadeYap") });
  await iadeDugmesi.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", { name: metin("yonetim.iade.iadeBaslik") });
  await expect(pencere).toBeVisible();
  await expect(pencere.getByText(metin("yonetim.iadeTalebi.penceredeSecili"))).toBeVisible();
  await expect(
    pencere.getByRole("combobox", { name: metin("yonetim.iade.iadeNedeni") }),
  ).toContainText(metin("yonetim.iade.neden.beden-uymadi"));
  await tara(page, "talepten iade penceresi");
  await pencere.getByRole("button", { name: /iade et$/u }).press("Enter");
  await expect(pencere).toBeHidden();
  await expect(page.getByText(metin("yonetim.iade.basari.iade"))).toBeVisible();
  const [yapilan] = await vt
    .select()
    .from(siparisIadeleri)
    .where(eq(siparisIadeleri.talep_kimligi, talep?.kimlik ?? ""));
  expect(yapilan).toMatchObject({ durum: "tamamlandi", kalemler: [{ sira: 0, adet: 2 }] });

  // Müşteri onayı ve iadeyi görür.
  await page.goto(hesapSiparisiAdresi(numara));
  await sayfaHazir(page);
  await expect(page.getByText(metin("vitrin.siparis.olay.talepOnaylandi"))).toBeVisible();
  await expect(
    page.getByText(doldur(metin("vitrin.siparis.iadeAdedi"), { adet: "2" })),
  ).toBeVisible();
  await ikiRenkUcGenislik(page, "talebi onaylanmış sipariş");
  expect(hatalar).toEqual([]);
});

test("üye olmayan takipten talep açar, mağaza reddeder, müşteri açıklamayı görür; ödeme bekleyen siparişini iptal eder", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const eposta = `takip-talep-${ek}-${randomUUID().slice(0, 6)}@ornek.test`;
  const misafir: OdemeGirdisi["kim"] = { tur: "misafir", eposta, hesap: { ac: false } };
  const numara = await siparisVer(misafir, 1);
  await teslimEt(numara);

  const takipEt = async (hangi: string) => {
    await page.goto(siparisTakibiAdresi(hangi));
    await sayfaHazir(page);
    await alan(page, metin("vitrin.siparisTakibi.eposta")).fill(eposta);
    await alan(page, metin("vitrin.siparisTakibi.eposta")).press("Enter");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: doldur(metin("vitrin.siparis.baslik"), { numara: hangi }),
      }),
    ).toBeVisible();
    await sayfaHazir(page);
  };
  await page.setViewportSize({ width: 1280, height: 900 });
  await takipEt(numara);
  await page.getByRole("link", { name: metin("vitrin.siparis.iadeTalebiOlustur") }).press("Enter");
  await expect(page).toHaveURL(vitrinAdresleri.takipIadeTalebi);
  await sayfaHazir(page);
  await talebiDoldur(page, 1);
  const [talep] = await talepleri(numara);
  expect(talep).toMatchObject({ durum: "bekliyor", kim_adi: "uye-olmayan-musteri" });

  // Mağaza sahibi reddeder: açıklama zorunludur.
  await paneleGir(page, yoneticiAc());
  await page.goto(`/yonetim/siparisler/ayrinti?numara=${numara}`);
  await sayfaHazir(page);
  await page.getByRole("button", { name: metin("yonetim.iadeTalebi.reddet") }).press("Enter");
  const retPenceresi = page.getByRole("dialog", { name: metin("yonetim.iadeTalebi.ret.baslik") });
  await expect(retPenceresi).toBeVisible();
  const retAlani = retPenceresi.getByLabel(metin("yonetim.iadeTalebi.ret.alan"));
  await retPenceresi
    .getByRole("button", { name: metin("yonetim.iadeTalebi.reddet") })
    .press("Enter");
  await expect(retAlani).toBeFocused();
  await expect(retAlani).toHaveAccessibleDescription(
    new RegExp(metin("yonetim.iadeTalebi.ret.gerekli")),
  );
  await tara(page, "hatalı ret penceresi");
  const aciklama = `Etiket yok ${ek}`;
  await retAlani.fill(aciklama);
  await retPenceresi
    .getByRole("button", { name: metin("yonetim.iadeTalebi.reddet") })
    .press("Enter");
  await expect(retPenceresi).toBeHidden();
  await expect(page.getByText(metin("yonetim.iadeTalebi.basari.reddedildi"))).toBeVisible();
  expect((await talepleri(numara))[0]).toMatchObject({
    durum: "reddedildi",
    ret_aciklamasi: aciklama,
  });

  // Müşteri reddi ve açıklamayı görür (takip yolu, çerez hâlâ geçerli).
  await page.goto(siparisTakibiAdresi(numara));
  await sayfaHazir(page);
  const talepBolumu = page.locator('[aria-labelledby="siparis-iade-talepleri"]');
  await expect(
    talepBolumu.getByRole("heading", { name: metin("vitrin.siparis.talepler") }),
  ).toBeVisible();
  await expect(talepBolumu).toContainText(metin("vitrin.siparis.olay.talepReddedildi"));
  await expect(talepBolumu).toContainText(aciklama);
  // Reddedilen adet yeniden istenebilir.
  await expect(
    page.getByRole("link", { name: metin("vitrin.siparis.iadeTalebiOlustur") }),
  ).toBeVisible();

  // Ödeme bekleyen sipariş: takipten iptal.
  const bekleyen = await siparisVer(misafir, 1);
  await takipEt(bekleyen);
  await page.getByRole("button", { name: metin("vitrin.siparis.iptalEt") }).press("Enter");
  const iptalPenceresi = page.getByRole("alertdialog", {
    name: metin("vitrin.siparis.iptalSorusu"),
  });
  await expect(iptalPenceresi).toBeVisible();
  await tara(page, "iptal penceresi");
  await iptalPenceresi
    .getByRole("button", { name: metin("vitrin.siparis.iptalEt") })
    .press("Enter");
  await expect(page.getByText(metin("vitrin.siparis.iptalBasari"))).toBeVisible();
  await expect(page.getByText(metin("vitrin.siparis.iptal"))).toBeVisible();
  const [iptalEdilen] = await vt.select().from(siparisler).where(eq(siparisler.numara, bekleyen));
  expect(iptalEdilen?.durum).toBe("iptal");
  await ikiRenkUcGenislik(page, "iptal edilmiş sipariş (takip)");

  // "Başka bir sipariş sorgula" veritabanındaki anahtarı da siler.
  const anahtarlar = () =>
    vt
      .select()
      .from(siparisTakipErisimleri)
      .where(eq(siparisTakipErisimleri.siparis_kimligi, iptalEdilen?.kimlik ?? ""));
  expect(await anahtarlar()).toHaveLength(1);
  await page
    .getByRole("button", { name: metin("vitrin.siparisTakibi.baskaSiparis") })
    .press("Enter");
  await expect(alan(page, metin("vitrin.siparisTakibi.numara"))).toBeVisible();
  expect(await anahtarlar()).toHaveLength(0);
  expect(hatalar).toEqual([]);
});
