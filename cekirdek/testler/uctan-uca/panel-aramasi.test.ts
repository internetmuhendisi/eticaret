// Panelin araması tarayıcıda (kart 0321, karar 0191):
// - Masaüstünde Ctrl K üst şeritteki kutuya götürür; müşterinin soyadı Türkçe harfsiz yazılınca sonuçlar gruplu gelir
//   (Siparişler, Müşteriler), sayısı duyurulur; ok tuşu ve Enter siparişin ayrıntısını açar. Ürünün stok koduyla
//   Enter ürün ekranını açar. Sonuçsuz aramada aranabilecekler yazar. Açık liste ve sonuçsuz hâl iki renkte taranır.
// - Telefon ve tablette üst çubuktaki büyüteç Enter ile tam genişlikte kutuyu açar, kutu odaktadır; liste açıkken iki
//   renkte taranır, yana kaymaz; Escape önce listeyi, sonra kutuyu kapatır ve odak büyütece döner.
// - Görevli (müşteri izni yok) aynı aramada yalnız Siparişler'i görür; müşteri ucuna hiç istek gitmez.
// - Konsolda hata yok.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { roller, yoneticiler, yoneticiRolleri } from "../../moduller/ekip/model";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { musteriHesabiAc } from "../../moduller/musteri/servis";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar";
import { odemeServisi } from "../../moduller/odeme/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { siparisAyrintisiAdresi, urunEkraniAdresi } from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-panel-aramasi");

test.afterAll(async () => {
  await vt.$client.end();
});

// Testin kendi ürünü, müşterisi ve siparişi: adları her çalışmada ayrı (paylaşılan veritabanında başka teste karışmaz).
const verileriAc = async () => {
  const ek = randomBytes(4)
    .toString("hex")
    .replace(/[0-9]/g, (r) => "abcdefghij"[Number(r)] ?? "a");
  const eposta = `arama-${ek}@ornek.test`;
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
            pazarlamaIzni: false,
          },
          3600,
        )
      ).musteri,
  );
  const urunServisi = calisanSiteninUrunServisi();
  const stokKodu = `ARA-${ek}`.toUpperCase();
  const urun = await urunServisi.urunEkle(vt, yapan, {
    ad: `Arama deneme ${ek}`,
    adresAdi: `arama-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
    stokKodu,
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
  return { ek, urun, stokKodu, aranan: `caglar${ek}`, numara: sonuc.siparis.numara };
};

// Deneme yöneticisinin rolleri yalnız görevli olur.
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

const kutu = (page: Page) => page.getByRole("combobox", { name: metin("yonetim.arama.etiket") });
const grupAdlari = (page: Page) =>
  page.getByRole("listbox", { name: metin("yonetim.arama.sonuclar") }).getByRole("group");
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

test("panelin araması: Ctrl K, gruplar, klavyeyle sonuca gitme, sonuçsuz hâl, telefon; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page);
  const v = await verileriAc();
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());

  // Ctrl K şeritteki kutuya götürür.
  await page.keyboard.press("Control+k");
  await expect(kutu(page)).toBeFocused();
  await page.keyboard.type(v.aranan);
  await expect(grupAdlari(page)).toHaveCount(2);
  await expect(grupAdlari(page).nth(0)).toHaveAccessibleName(metin("yonetim.arama.grup.siparis"));
  await expect(grupAdlari(page).nth(1)).toHaveAccessibleName(metin("yonetim.arama.grup.musteri"));
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: doldur(metin("yonetim.arama.sonucSayisi"), { sayi: "2" }) }),
  ).toHaveCount(1);
  await expect(kutu(page)).toHaveAttribute("aria-expanded", "true");
  await ikiRenk(page, "açık sonuç listesi");
  // Ok tuşu ilk sonucu seçer, Enter siparişin ayrıntısını açar.
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { selected: true })).toContainText(v.numara);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`${siparisAyrintisiAdresi(v.numara).replace("?", "\\?")}$`),
  );
  await sayfaHazir(page);
  await expect(kutu(page)).toHaveValue("");

  // Ürünün stok kodu küçük harfle: Enter (seçim yokken) ilk sonucu, ürün ekranını açar.
  await page.keyboard.press("Control+k");
  await page.keyboard.type(v.stokKodu.toLowerCase());
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option")).toContainText(v.stokKodu);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${urunEkraniAdresi(v.urun).replace("?", "\\?")}$`));
  await sayfaHazir(page);

  // Sonuçsuz arama: neyin aranabildiği yazar.
  await page.keyboard.press("Control+k");
  await page.keyboard.type(`zxq${v.ek}`);
  await expect(page.getByText(metin("yonetim.arama.aranabilenler"))).toBeVisible();
  await expect(
    page.getByText(metin("yonetim.arama.aranan.musteri"), { exact: true }),
  ).toBeVisible();
  await ikiRenk(page, "sonuçsuz arama");
  // Escape listeyi kapatır.
  await page.keyboard.press("Escape");
  await expect(page.getByText(metin("yonetim.arama.aranabilenler"))).toBeHidden();

  // Telefon ve tablet: büyüteç tam genişlikte kutuyu açar.
  for (const boyut of [
    { width: 375, height: 800 },
    { width: 768, height: 1000 },
  ]) {
    await page.setViewportSize(boyut);
    const buyutec = page.getByRole("button", { name: metin("yonetim.arama.ac") });
    await buyutec.focus();
    await page.keyboard.press("Enter");
    await expect(kutu(page)).toBeFocused();
    await page.keyboard.type(v.aranan);
    await expect(grupAdlari(page)).toHaveCount(2);
    await ikiRenk(page, `telefon araması ${boyut.width}`);
    await page.keyboard.press("Escape");
    await expect(kutu(page)).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Escape");
    await expect(buyutec).toBeFocused();
    await expect(
      page.getByRole("combobox", { name: metin("yonetim.arama.etiket") }).filter({ visible: true }),
    ).toHaveCount(0);
    // Ctrl K da telefonun kipini açar; menü açıksa önce menü kapanır.
    await page.getByRole("button", { name: metin("yonetim.cerceve.menuyuAc") }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(kutu(page)).toBeFocused();
    // "Aramayı kapat" kipi kapatır, odak büyütece döner.
    await page.getByRole("button", { name: metin("yonetim.arama.kapat") }).focus();
    await page.keyboard.press("Enter");
    await expect(buyutec).toBeFocused();
  }
  // Telefonda sonuç açılınca kip kapanır, sayfa açılır.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.getByRole("button", { name: metin("yonetim.arama.ac") }).click();
  await page.keyboard.type(v.stokKodu.toLowerCase());
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${urunEkraniAdresi(v.urun).replace("?", "\\?")}$`));
  await expect(page.getByRole("button", { name: metin("yonetim.arama.ac") })).toBeVisible();
  expect(hatalar).toEqual([]);
});

test("görevli yalnız izni olan türleri arar; müşteri ucuna istek gitmez", async ({ page }) => {
  test.setTimeout(300_000);
  const v = await verileriAc();
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const yonetici = yoneticiAc();
  await gorevliYap(yonetici.eposta);
  const istenen: string[] = [];
  page.on("request", (istek) => {
    const yol = new URL(istek.url()).pathname;
    if (yol.startsWith("/kapi/yonetici/panel-")) istenen.push(yol);
  });
  await paneleGir(page, yonetici);
  await page.keyboard.press("Control+k");
  await page.keyboard.type(v.aranan);
  await expect(grupAdlari(page)).toHaveCount(1);
  await expect(grupAdlari(page).first()).toHaveAccessibleName(metin("yonetim.arama.grup.siparis"));
  await expect(page.getByRole("option")).toContainText(v.numara);
  expect(istenen.length).toBeGreaterThan(0);
  expect(istenen.filter((yol) => yol.includes("musteri"))).toEqual([]);
});
