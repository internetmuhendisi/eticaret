// Ürün ekranının galeri bölümü gerçek tarayıcıda ve gerçek veritabanıyla (kart 0266, karar 0073 ve 0162): ürünün iki
// görseli vardır (büyük "Ön", 600 piksellik "Arka"); ilk görsel "Ana görsel" rozetini, küçük görsel uyarısını taşır.
// Mağaza sahibi klavyeyle dosya seçicisinden iki dosya seçer: görsel yüklenir ve "Alternatif metin eksik" ile görünür,
// görsel olmayan dosya adıyla reddedilir. Yeni görselin alternatif metnini pencerede yazar (pencere kapanınca odak
// Düzenle'ye döner), görseli klavyeyle iki kez öne alır (odak düğmede kalır, ana görsel olur), bir video bağlar ve
// "Arka"yı siler (odak sonraki kartın Düzenle'sine geçer); Kaydet'le galeri bu hâliyle yazılır, vitrinde ürünün ilk görseli yeni görseldir. Başka yerden galeri
// değişince eski ekranın kaydı çakışır: hata galerinin altında, odak yükleme düğmesinde. Bölüm (reddedilen dosyanın
// uyarısıyla), düzenleme ve video pencereleri iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata
// yoktur.
//
// Ürünler sitenin paylaşılan verisidir: test kendi ürününü ("Deneme <6 onaltılık> …") açar ve sonunda siler.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { dosyaSil, gorselKaydet } from "../../moduller/dosya/servis";
import { urunGalerileri } from "../../moduller/urun/galeri";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { urunEkraniAdresi } from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

test.beforeEach(({ page }) => ayriBaglanti(page));
test.afterAll(async () => {
  await vt.$client.end();
});

const yanaKayma = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.ad}`);
      expect(await yanaKayma(page), `${ne} ${renk} ${boyut.ad}`).toBeLessThanOrEqual(0);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

const png = (kenar: number, mavi: number) =>
  sharp({
    create: { width: kenar, height: kenar, channels: 3, background: { r: 30, g: 80, b: mavi } },
  })
    .png()
    .toBuffer();

const gorselUret = async (vt: Veritabani, kenar: number, mavi: number) => {
  const kayit = await gorselKaydet(vt, await png(kenar, mavi));
  if (!kayit.tamam) throw new Error(kayit.hata);
  return kayit.dosya.kimlik;
};

// Reddedilen dosya ve eski ekranın çakışması tarayıcının konsoluna yazılır; beklenen hatadır.
const beklenenHata = (ileti: string) =>
  ileti.includes("status of 409") || ileti.includes("status of 400");

const bas = async (page: Page, oge: Locator) => {
  await oge.focus();
  await page.keyboard.press("Enter");
};

const g = (anahtar: string) => metin(`yonetim.urunEkrani.galeri.${anahtar}` as never);

test("mağaza sahibi klavyeyle görsel yükler, metnini yazar, sıralar, video bağlar, siler ve kaydeder", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const ek = randomBytes(3).toString("hex");
  const servis = calisanSiteninUrunServisi();
  const temizlik: (() => Promise<unknown>)[] = [];
  const konsol = konsoluDinle(page, { haric: beklenenHata });
  try {
    const urun = await servis.urunEkle(vt, yapan, {
      ad: `Deneme ${ek} Kupa`,
      vergiSinifi: null,
      durum: "yayinda",
    });
    temizlik.push(() => servis.urunSil(vt, yapan, urun));
    const buyuk = await gorselUret(vt, 1000, 200);
    const kucuk = await gorselUret(vt, 600, 20);
    for (const dosya of [buyuk, kucuk]) temizlik.push(() => dosyaSil(vt, dosya));
    await servis.galeriyeGorselEkle(vt, yapan, urun, { dosya: buyuk, alternatifMetin: `Ön ${ek}` });
    await servis.galeriyeGorselEkle(vt, yapan, urun, {
      dosya: kucuk,
      alternatifMetin: `Arka ${ek}`,
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());
    await page.goto(urunEkraniAdresi(urun));
    await sayfaHazir(page);
    const bolum = page.locator("#urun-galeri");
    const liste = bolum.getByRole("list", { name: g("liste") });
    const kart = (ad: string) =>
      liste.getByRole("listitem").filter({ has: page.getByRole("img", { name: ad, exact: true }) });
    await expect(kart(`Ön ${ek}`).getByText(g("ana"))).toBeVisible();
    await expect(kart(`Arka ${ek}`).getByText(g("kucuk"))).toBeVisible();
    await expect(kart(`Ön ${ek}`).getByText(g("kucuk"))).toHaveCount(0);

    // Dosya seçicisi klavyeyle açılır; görsel yüklenir, görsel olmayan dosya adıyla reddedilir.
    const sec = bolum.getByRole("button", { name: g("sec") });
    const secici = page.waitForEvent("filechooser");
    await bas(page, sec);
    await (await secici).setFiles([
      { name: `yeni-${ek}.png`, mimeType: "image/png", buffer: await png(900, 120) },
      { name: `metin-${ek}.png`, mimeType: "image/png", buffer: Buffer.from("görsel değil") },
    ]);
    await expect(bolum.getByRole("alert")).toContainText(`metin-${ek}.png`);
    const yeniKart = liste.getByRole("listitem").nth(2);
    await expect(yeniKart.getByText(g("altMetinEksik"))).toBeVisible();
    await expect(bolum.getByRole("progressbar")).toHaveCount(0);
    await ikiRenkUcGenislik(page, "galeri bölümü, reddedilen dosyayla");

    // Alternatif metin pencerede; kapanınca odak Düzenle'ye döner.
    const duzenle = (ad: string) =>
      bolum.getByRole("button", { name: doldur(g("duzenle"), { ad }), exact: true });
    await bas(page, duzenle(g("adsizGorsel")));
    const pencere = page.getByRole("dialog");
    await expect(pencere.getByRole("textbox", { name: new RegExp(g("altMetin")) })).toBeFocused();
    await ikiRenkUcGenislik(page, "düzenleme penceresi");
    await page.keyboard.type(`Yeni ${ek}`);
    await page.keyboard.press("Enter");
    await expect(pencere).toBeHidden();
    await expect(duzenle(`Yeni ${ek}`)).toBeFocused();

    // Klavyeyle iki kez öne alınır; odak düğmede kalır, ilk görsel olunca ana görseldir.
    const one = bolum.getByRole("button", {
      name: doldur(metin("ortak.parca.siralama.one"), { ad: `Yeni ${ek}` }),
      exact: true,
    });
    await bas(page, one);
    await expect(one).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(one).toBeDisabled();
    await expect(kart(`Yeni ${ek}`).getByText(g("ana"))).toBeVisible();
    await expect(kart(`Ön ${ek}`).getByText(g("ana"))).toHaveCount(0);

    // Video bağlanır (önizleme dış siteye bağlanır, testte basılmaz).
    await bas(page, bolum.getByRole("button", { name: g("videoBagla") }));
    const videoPenceresi = page.getByRole("dialog");
    await expect(
      videoPenceresi.getByRole("textbox", { name: new RegExp(g("baglanti")) }),
    ).toBeFocused();
    await ikiRenkUcGenislik(page, "video penceresi");
    await page.keyboard.type("https://youtu.be/dQw4w9WgXcQ");
    await videoPenceresi.getByRole("textbox", { name: new RegExp(g("videoBaslik")) }).focus();
    await page.keyboard.type(`Tanıtım ${ek}`);
    await page.keyboard.press("Enter");
    await expect(videoPenceresi).toBeHidden();
    await expect(bolum.getByRole("button", { name: g("videoBagla") })).toBeFocused();
    await expect(liste.getByText(`Tanıtım ${ek}`)).toBeVisible();

    // "Arka" silinir; kaydedilince galeri bu hâliyle yazılır.
    await bas(
      page,
      bolum.getByRole("button", { name: doldur(g("sil"), { ad: `Arka ${ek}` }), exact: true }),
    );
    await expect(kart(`Arka ${ek}`)).toHaveCount(0);
    // Odak sonraki kartın Düzenle'sine geçer.
    await expect(duzenle(`Tanıtım ${ek}`)).toBeFocused();
    await bas(
      page,
      page.getByRole("button", { name: metin("yonetim.urunEkrani.kaydet"), exact: true }),
    );
    await expect(page.getByText(metin("yonetim.urunEkrani.kaydedildi"))).toBeVisible();
    const galeri = (await urunGalerileri(vt, [urun])).get(urun) ?? [];
    for (const oge of galeri) {
      if (oge.tur === "gorsel" && oge.dosya !== buyuk) temizlik.push(() => dosyaSil(vt, oge.dosya));
    }
    expect(galeri.map((oge) => [oge.tur, oge.alternatifMetin])).toEqual([
      ["gorsel", `Yeni ${ek}`],
      ["gorsel", `Ön ${ek}`],
      ["video", `Tanıtım ${ek}`],
    ]);

    // Vitrinde ürünün ilk görseli yeni görseldir.
    const okunan = await servis.urunuOku(vt, urun);
    await page.goto(kayitAdresleri.urun(okunan?.adresAdi ?? ""));
    await sayfaHazir(page);
    await expect(page.getByRole("img", { name: `Yeni ${ek}` }).first()).toBeVisible();

    // Başka yerden galeri değişir; eski ekranın kaydı çakışır, hata galerinin altında, odak yükleme düğmesinde.
    await page.goto(urunEkraniAdresi(urun));
    await sayfaHazir(page);
    const ilk = galeri[0];
    if (ilk === undefined) throw new Error("Galeri boş.");
    await servis.galeriOgesiSil(vt, yapan, ilk.kimlik);
    await bas(page, duzenle(`Ön ${ek}`));
    await page.keyboard.press("End");
    await page.keyboard.type(", yakın");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeHidden();
    await bas(
      page,
      page.getByRole("button", { name: metin("yonetim.urunEkrani.kaydet"), exact: true }),
    );
    await expect(bolum.getByText(metin("yonetim.urun.hata.galeri-degisti"))).toBeVisible();
    await expect(sec).toBeFocused();
    expect(
      ((await urunGalerileri(vt, [urun])).get(urun) ?? []).map((o) => o.alternatifMetin),
    ).toEqual([`Ön ${ek}`, `Tanıtım ${ek}`]);

    expect(konsol).toEqual([]);
  } finally {
    for (const is of temizlik.toReversed()) await is().catch(() => undefined);
  }
});
