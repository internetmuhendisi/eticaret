// Panelin müşteri ekranları tarayıcıda (kart 0271, karar 0173):
// - Mağaza sahibi menüden klavyeyle Müşteriler'e gelir; ad Türkçe harfsiz aranınca müşteri bulunur (arama adrese
//   yazılmaz); satırda ad, e-posta, sipariş sayısı ve kampanya izni; ad ayrıntıya gider.
// - Ayrıntıda sayılar, sipariş bağlantısı, hesap ve adres; boş notta alanın hatası ve odak; not klavyeyle eklenir;
//   silmede onay penceresi, Escape vazgeçer, Sil notu kaldırır ve odak not alanına döner.
// - "Şifre sıfırlama bağlantısı gönder" onayla gider; e-posta müşterinin adresine kuyruğa girer.
// - Sipariş ayrıntısında üye müşterinin adı müşteri ayrıntısına bağlantıdır; hesap silinince değildir.
// - Silinmiş hesabın ayrıntısı bulunamadı (404).
// - Liste, ayrıntı ve onay penceresi iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; konsolda hata yok.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { epostaKayitlari } from "../../moduller/eposta/model";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { musteriler } from "../../moduller/musteri/model";
import { musteriHesabiAc } from "../../moduller/musteri/servis";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { odemeServisi } from "../../moduller/odeme/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import {
  musteriAyrintisiAdresi,
  musterilerAdresi,
  siparisAyrintisiAdresi,
} from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-musteriler");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

test.afterAll(async () => {
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

// Testin kendi müşterisi ve siparişi: adı her çalışmada ayrı (paylaşılan veritabanında başka teste karışmaz).
const musteriVeSiparisAc = async () => {
  const ek = randomBytes(4)
    .toString("hex")
    .replace(/[0-9]/g, (r) => "abcdefghij"[Number(r)] ?? "a");
  const eposta = `musteri-${ek}@ornek.test`;
  const musteri = await vt.transaction(
    async (islem) =>
      (
        await musteriHesabiAc(
          islem,
          {
            eposta,
            sifre: "uzun-bir-sifre-123",
            uyelikOnayi: true,
            kvkkOnayi: true,
            pazarlamaIzni: true,
          },
          3600,
        )
      ).musteri,
  );
  const urunServisi = calisanSiteninUrunServisi();
  const urun = await urunServisi.urunEkle(vt, yapan, {
    ad: `Müşteri deneme ${ek}`,
    adresAdi: `musteri-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
    stokKodu: `MUS-${ek}`,
  });
  const birim = (await urunServisi.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 12_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 5,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const soyad = `Çağlar${ek}`;
  const sonuc = await odemeServisi(calisanSite()).siparisVer(
    vt,
    {
      kim: { tur: "uye", musteri },
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: { yontem: "kapida-odeme", secenek: "nakit" },
        teslimat: {
          ad: "Zeynep",
          soyad,
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
  return {
    musteri,
    eposta,
    ad: `Zeynep ${soyad}`,
    aranan: `caglar${ek}`,
    numara: sonuc.siparis.numara,
  };
};

test("müşteriler: menüden klavyeyle, Türkçe harfsiz arama, ayrıntı, not ekle ve sil, şifre sıfırlama; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page);
  const m = await musteriVeSiparisAc();
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());

  // Menüden klavyeyle.
  const menu = page.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
  await menu.getByRole("link", { name: metin("yonetim.sayfa.musteriler.ad") }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${musterilerAdresi}$`));
  await sayfaHazir(page);

  // Türkçe harfsiz arama: adrese yazılmaz.
  const ara = page.getByRole("searchbox", { name: metin("yonetim.musteriler.ara") });
  await ara.fill(m.aranan);
  await ara.press("Enter");
  const ayrintiBaglantisi = page.getByRole("link", {
    name: doldur(metin("yonetim.musteriler.ayrintiAdi"), { ad: m.ad }),
  });
  await expect(ayrintiBaglantisi.first()).toBeVisible();
  expect(page.url()).not.toContain(m.aranan);
  const satir = page.getByRole("row").filter({ has: ayrintiBaglantisi });
  await expect(satir).toContainText(m.eposta);
  await expect(satir).toContainText(metin("yonetim.musteriler.kampanya.var"));
  await ikiRenkUcGenislik(page, "müşteri listesi");

  // Ayrıntı.
  await ayrintiBaglantisi.first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`kimlik=${m.musteri}`));
  await sayfaHazir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.ad);
  await expect(
    page.getByRole("link", {
      name: doldur(metin("yonetim.siparisler.ayrintiAdi"), { numara: m.numara }),
    }),
  ).toBeVisible();
  await expect(page.getByText(m.eposta).first()).toBeVisible();

  // Boş not: alanın hatası ve odak.
  const notAlani = page.getByRole("textbox", { name: metin("yonetim.musteri.notlar.etiket") });
  const kaydet = page.getByRole("button", { name: metin("yonetim.musteri.notlar.kaydet") });
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(notAlani).toBeFocused();
  await expect(page.getByText(metin("yonetim.musteri.notlar.gerekli"))).toBeVisible();
  // Not klavyeyle eklenir.
  const notMetni = `Kapıda iki kez teslim alınmadı ${randomUUID().slice(0, 6)}`;
  await notAlani.fill(notMetni);
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.musteri.notlar.eklendi"))).toBeVisible();
  await expect(page.getByText(notMetni)).toBeVisible();
  await ikiRenkUcGenislik(page, "müşteri ayrıntısı");

  // Silme: onay, Escape vazgeçer, Sil kaldırır, odak not alanına döner.
  const sil = page.getByRole("button", {
    name: new RegExp(`^${metin("yonetim.musteri.notlar.sil")}:`),
  });
  await sil.focus();
  await page.keyboard.press("Enter");
  const onay = page.getByRole("alertdialog", {
    name: metin("yonetim.musteri.notlar.silOnay.baslik"),
  });
  await expect(onay).toBeVisible();
  await tara(page, "not silme onayı");
  await page.keyboard.press("Escape");
  await expect(onay).toBeHidden();
  await expect(page.getByText(notMetni)).toBeVisible();
  await sil.focus();
  await page.keyboard.press("Enter");
  await onay.getByRole("button", { name: metin("yonetim.musteri.notlar.sil") }).click();
  await expect(page.getByText(metin("yonetim.musteri.notlar.silindi"))).toBeVisible();
  await expect(page.getByText(notMetni)).toBeHidden();
  await expect(notAlani).toBeFocused();

  // Şifre sıfırlama bağlantısı: onayla gider, e-posta müşterinin adresine kuyruğa girer.
  await page.getByRole("button", { name: metin("yonetim.eylem.sifreSifirlamaGonder") }).focus();
  await page.keyboard.press("Enter");
  const sifreOnayi = page.getByRole("alertdialog", {
    name: metin("yonetim.musteri.sifre.onay.baslik"),
  });
  await expect(sifreOnayi).toContainText(m.eposta);
  await tara(page, "şifre sıfırlama onayı");
  await sifreOnayi.getByRole("button", { name: metin("yonetim.musteri.sifre.onay.dugme") }).click();
  await expect(page.getByText(metin("yonetim.musteri.sifre.gonderildi"))).toBeVisible();
  const kuyruk = await vt
    .select()
    .from(epostaKayitlari)
    .where(and(eq(epostaKayitlari.alici, m.eposta), eq(epostaKayitlari.sablon, "sifre-sifirlama")));
  expect(kuyruk).toHaveLength(1);

  // Sipariş ayrıntısında müşterinin adı müşteri ayrıntısına gider.
  await page.goto(siparisAyrintisiAdresi(m.numara));
  await sayfaHazir(page);
  await expect(page.getByRole("link", { name: m.ad })).toHaveAttribute(
    "href",
    musteriAyrintisiAdresi(m.musteri),
  );

  // Silinmiş hesabın ayrıntısı bulunamadı.
  await vt
    .update(musteriler)
    .set({ silinme_zamani: new Date() })
    .where(eq(musteriler.kimlik, m.musteri));
  const yanit = await page.goto(musteriAyrintisiAdresi(m.musteri));
  expect(yanit?.status()).toBe(404);
  // Silinmiş hesabın adı sipariş ayrıntısında bağlantı değildir.
  await page.goto(siparisAyrintisiAdresi(m.numara));
  await sayfaHazir(page);
  await expect(page.getByText(m.ad).first()).toBeVisible();
  await expect(page.getByRole("link", { name: m.ad })).toHaveCount(0);
  expect(hatalar.filter((h) => !h.includes("404"))).toEqual([]);
});
