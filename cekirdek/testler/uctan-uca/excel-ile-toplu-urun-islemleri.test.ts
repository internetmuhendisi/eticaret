// Excel ile toplu ürün işlemleri eklentisi tarayıcıda (kart 0315). Tarayıcı testlerinde arka plan süreci yoktur:
// eklentinin işlerini test kendisi çalıştırır (dışa aktarma, denetim, uygulama), sayfa kendini yeniler.
// - Ürünler listesinde aranan ürünle "Excel" klavyeyle sayfaya götürür; "Ürünler listesindeki süzgeçlerle" seçili
//   gelir; "Excel dosyasını hazırla" Enter ile; hazır olunca "Dosyayı indir" dosyayı indirir, dosyada testin ürünü var.
// - Stoğu değiştirilen dosya dosya seçicisiyle (klavye) yüklenir; önizlemede değişecek 1, tablo ve şimdiki-yeni değer;
//   "Uygula" Enter ile, ilerleme ve sonuç; ürünün stoğu değişti.
// - Olmayan kategorili dosyada hatalı satır nedeniyle görünür, "Uygula" aria-disabled ve nedeni bağlı; "Vazgeç".
// - Sayfa, önizleme ve hatalı önizleme iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; konsolda hata yok.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { desc, eq } from "drizzle-orm";
import readXlsxFile from "read-excel-file/node";
import writeXlsxFile from "write-excel-file/node";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { calisanExcelServisi } from "../../eklentiler/excel-ile-toplu-urun-islemleri/isler";
import {
  excelDisaAktarmalari,
  excelIceAktarmalari,
} from "../../eklentiler/excel-ile-toplu-urun-islemleri/model";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-excel");

test.afterAll(async () => {
  await vt.$client.end();
});

const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
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

// Testin kendi ürünü: adı her çalışmada ayrı.
const urunAc = async () => {
  const ek = randomBytes(4)
    .toString("hex")
    .replace(/[0-9]/g, (r) => "abcdefghij"[Number(r)] ?? "a");
  const servis = calisanSiteninUrunServisi();
  const urun = await servis.urunEkle(vt, yapan, {
    ad: `Excel deneme ${ek}`,
    adresAdi: `excel-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await siteninFiyatServisi(calisanSite()).fiyatYaz(vt, yapan, birim, { satisFiyati: 15_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 4,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  return { ek, urun, birim };
};

// Yöneticinin son kaydı ve onun işi (test çalıştırır).
const sonDisaAktarma = async () =>
  (
    await vt
      .select()
      .from(excelDisaAktarmalari)
      .orderBy(desc(excelDisaAktarmalari.olusturma_zamani))
      .limit(1)
  )[0];
const sonIceAktarma = async () =>
  (
    await vt
      .select()
      .from(excelIceAktarmalari)
      .orderBy(desc(excelIceAktarmalari.olusturma_zamani))
      .limit(1)
  )[0];

const dosyayiDegistir = async (dosya: Buffer, hucreler: Record<string, string | number>) => {
  const sayfalar = await readXlsxFile(dosya);
  return writeXlsxFile(
    sayfalar.map((sayfa, i) => {
      const baslik = (sayfa.data[0] ?? []) as (string | null)[];
      return {
        sheet: sayfa.sheet,
        data: sayfa.data.map((satir, j) =>
          satir.map((h, k) => {
            const deger =
              i === 0 && j > 0 && baslik[k] !== null && baslik[k] !== undefined
                ? (hucreler[baslik[k] as string] ?? h)
                : h;
            return deger === null
              ? null
              : typeof deger === "number"
                ? { value: deger, type: Number }
                : { value: String(deger), type: String };
          }),
        ),
      };
    }),
  ).toBuffer();
};

const dosyaYukle = async (page: Page, dosya: Buffer) => {
  const secici = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: /^(Dosya seç|Başka dosya seç)$/ })
    .first()
    .focus();
  await page.keyboard.press("Enter");
  await (await secici).setFiles({
    name: "urunler.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: dosya,
  });
  // Yükleme bitince iş denetlenir (test çalıştırır).
  await expect
    .poll(async () => (await sonIceAktarma())?.durum, { timeout: 30_000 })
    .toBe("denetleniyor");
  const is = await sonIceAktarma();
  if (is === undefined) throw new Error("İçe aktarma yok.");
  await calisanExcelServisi().iceAktarmayiDenetle(vt, is.kimlik);
  return is.kimlik;
};

test("Excel: listeden gelme, dışa aktarma ve indirme, değişiklik yükleme, önizleme, uygulama; hatalı dosya; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page);
  const u = await urunAc();
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());

  // Ürünler listesi aranan ürünle; "Excel" klavyeyle.
  await page.goto(`/yonetim/urunler?ara=${u.ek}`);
  await sayfaHazir(page);
  await page.getByRole("link", { name: metin("yonetim.eylem.urunlerExcel"), exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/yonetim\/urunler\/excel\?liste=/);
  await sayfaHazir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    metin("yonetim.sayfa.urunlerExcel.ad"),
  );
  await expect(
    page.getByRole("radio", { name: metin("eklenti.excel.ekran.listedekiler") }),
  ).toBeChecked();
  await ikiRenkUcGenislik(page, "Excel sayfası");

  // Dışa aktarma: iş test tarafından çalıştırılır, sayfa yenilenince indirme bağlantısı görünür.
  await page.getByRole("button", { name: metin("eklenti.excel.ekran.hazirla") }).focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await sonDisaAktarma())?.durum, { timeout: 30_000 })
    .toBe("hazirlaniyor");
  const disa = await sonDisaAktarma();
  if (disa === undefined) throw new Error("Dışa aktarma yok.");
  await calisanExcelServisi().disaAktarmayiHazirla(vt, disa.kimlik);
  const indir = page.getByRole("link", { name: metin("eklenti.excel.ekran.indir") });
  await expect(indir).toBeVisible({ timeout: 15_000 });
  const indirme = page.waitForEvent("download");
  await indir.focus();
  await page.keyboard.press("Enter");
  const yol = await (await indirme).path();
  const dosya = readFileSync(yol);
  const satirlar = (await readXlsxFile(dosya))[0]?.data ?? [];
  expect(satirlar).toHaveLength(2);
  expect(satirlar[1]?.[0]).toBe(`excel-deneme-${u.ek}`);

  // Stoğu değiştirilen dosya: önizleme, uygulama.
  await dosyaYukle(page, await dosyayiDegistir(dosya, { Stok: 9 }));
  const degisecekler = page
    .getByRole("region", { name: metin("eklenti.excel.ekran.degiseceklerBaslik") })
    .first();
  await expect(degisecekler).toBeVisible({ timeout: 15_000 });
  await expect(degisecekler).toContainText("Stok");
  await expect(degisecekler).toContainText("9");
  await ikiRenkUcGenislik(page, "Excel önizleme");
  const uygula = page.getByRole("button", {
    name: doldur(metin("eklenti.excel.ekran.uygula"), { sayi: "1" }),
  });
  await uygula.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await sonIceAktarma())?.durum, { timeout: 30_000 })
    .toBe("uygulaniyor");
  const is = await sonIceAktarma();
  await calisanExcelServisi().uygulamaPartisi(vt, is?.kimlik ?? "");
  await expect(page.getByText(metin("eklenti.excel.ekran.bitti"))).toBeVisible({ timeout: 15_000 });
  expect((await stokServisi().stoklariOku(vt, [u.birim])).get(u.birim)?.miktar).toBe(9);
  await ikiRenkUcGenislik(page, "Excel sonuç");

  // Olmayan kategorili dosya: hatalı satır, Uygula kapalı ve nedeni bağlı, Vazgeç.
  await dosyaYukle(page, await dosyayiDegistir(dosya, { Kategoriler: `Bahçe ${u.ek}` }));
  const hatali = page
    .getByRole("region", {
      name: doldur(metin("eklenti.excel.ekran.hatalilarBaslik"), { sayi: "1" }),
    })
    .first();
  await expect(hatali).toBeVisible({ timeout: 15_000 });
  await expect(hatali).toContainText(`Bahçe ${u.ek}`);
  const kapali = page.getByRole("button", { name: /satırı uygula$/ });
  await expect(kapali).toHaveAttribute("aria-disabled", "true");
  await expect(kapali).toHaveAccessibleDescription(metin("eklenti.excel.ekran.uygulaHatali"));
  await ikiRenkUcGenislik(page, "Excel hatalı önizleme");
  await page.getByRole("button", { name: metin("eklenti.excel.ekran.vazgec") }).focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await sonIceAktarma())?.durum, { timeout: 15_000 })
    .toBe("vazgecildi");
  const [son] = await vt
    .select()
    .from(excelIceAktarmalari)
    .where(eq(excelIceAktarmalari.kimlik, (await sonIceAktarma())?.kimlik ?? ""));
  expect(son?.dosya).toBeNull();
  expect(hatalar).toEqual([]);
});
