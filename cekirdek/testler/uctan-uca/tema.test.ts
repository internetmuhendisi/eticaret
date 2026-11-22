// Panelin tema ekranı gerçek tarayıcıda ve gerçek veritabanıyla (kart 0148, karar 0080 ve 0127): mağaza sahibi
// menüden ekrana gelir, "Demoyu gez" ile demoya yeni sekmede gider, temayı klavyeyle değiştirir ve vitrinde görür,
// önceki hâline döner; masaüstünde filtrenin yerini seçer ve kategori sayfasında görür. Ekran ve tema penceresi iki
// renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yoktur.
//
// Tema bütün vitrinin görünüşünü değiştirir: bu dosya öteki tarayıcı testleri bittikten sonra kendi aşamasında
// çalışır (playwright.config.ts, "tema-degisikligi"). Sonunda tema, testten önceki sürüme döndürülür. Demo sitesi
// testte açılmaz: demonun adresine giden istek sahte bir sayfayla karşılanır, açılan sekmenin adresi ölçülür
// (demonun kendisi kart 0116'nın ölçümündedir).
//
// Logo (kart 0094): mağaza sahibi logoyu klavyeyle yükler (tarayıcının dosya seçicisi), vitrinin üst kısmında görür;
// görsel olmayan dosyada hata alanın altında yazar, odak yükleme düğmesindedir, ekran taramadan geçer; logoyu onayla
// kaldırır. Logo da bütün vitrinde görünür: sonunda yüklenen logo kaldırılır.
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { temaDemosuAdresi, temaDemosuBaglantisi } from "../../ayar-semasi/tema-demosu-adresi";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { yuklenebilenTurAdlari } from "../../kayitlar/dosya";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { logoyuKaldir } from "../../moduller/magaza-ayarlari/logo";
import { siteninTemaServisi } from "../../moduller/tema/servis";
import { yeniTemaninAyarlari } from "../../temalar/ayarlar";
import { sitenTasarimCss } from "../../temalar/birlesim";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { temaninAdi } from "../../vitrin/tema-demosu-seridi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, type DenemeYoneticisi, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const servis = siteninTemaServisi();
const kim = sistemIslemi("uctan-uca-tema");
const temaAdresi = "/yonetim/tema";

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

test.use({ actionTimeout: 15_000 });

let yonetici: DenemeYoneticisi;
// Testten önceki sürüm: sonunda ona dönülür (tema, ayarlar ve düzen).
let ilkSira: number;

test.beforeAll(async () => {
  ilkSira = (await servis.temaDurumu(vt)).sira;
});
test.beforeEach(({ page }) => {
  yonetici = yoneticiAc();
  return ayriBaglanti(page);
});
test.afterAll(async () => {
  if ((await servis.temaDurumu(vt)).sira !== ilkSira) {
    await servis.oncekiSurumeDon(vt, kim, ilkSira);
  }
  // Yarıda kalan logo testinin yüklediği logo (yoksa bir şey yazılmaz).
  await logoyuKaldir(vt, kim);
  await vt.$client.end();
});

const tara = async (page: Page, ne: string) => {
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

const yanaKayma = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const bildirim = (page: Page, anahtar: Parameters<typeof metin>[0]) =>
  page
    .getByRole("region", { name: metin("ortak.parca.bildirimler") })
    .getByText(metin(anahtar), { exact: true });

// Sitenin bir teması: adı ve vitrinin o temayla, verilen ayarlarla çizdiği değerler.
const temasi = (kod: string) => {
  const tema = calisanSite().temalar.find((aday) => aday.kod === kod);
  if (tema === undefined) throw new Error(`Sitede ${kod} teması yok.`);
  return tema;
};
const vitrinCssi = async (kod: string) => {
  const tema = temasi(kod);
  const { ayarlar } = await servis.temaDurumu(vt);
  return sitenTasarimCss(async () => ({ tema, ayarlar: yeniTemaninAyarlari(tema.tanim, ayarlar) }));
};
// Vitrinin sayfaya yazdığı tema değerleri (kök düzenin <style>'ı).
const sayfaninCssleri = async (page: Page) => {
  await page.goto("/");
  await sayfaHazir(page);
  return page.evaluate(() =>
    [...document.querySelectorAll("head style")].map((stil) => stil.textContent ?? ""),
  );
};

// Geçerli temadan başka, sitenin kullanabileceği ilk hazır tema.
const baskaTema = async () => {
  const { tema } = await servis.temaDurumu(vt);
  const aday = calisanSite().temalar.find((t) => t.kaynak === "cekirdek" && t.kod !== tema);
  if (aday === undefined) throw new Error("Sitede ikinci bir hazır tema yok.");
  return aday;
};

test("mağaza sahibi demoya gider, temayı klavyeyle değiştirip vitrinde görür ve önceki hâline döner", async ({
  page,
  context,
}) => {
  // Vitrinde girişsiz müşterinin oturum sorusu 401 alır (karar 0098); başka hata sayılır.
  const konsol = konsoluDinle(page, { haric: (ileti) => ileti.includes("status of 401") });
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yonetici);
  // Menüden ekrana.
  const menudeki = page
    .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
    .getByRole("link", { name: metin("yonetim.sayfa.tema.ad") });
  await menudeki.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${temaAdresi}$`));
  await sayfaHazir(page);
  await expect(page).toHaveTitle(new RegExp(`^${metin("yonetim.sayfa.tema.ad")} \\|`));

  const eski = await servis.temaDurumu(vt);
  const yeni = await baskaTema();
  const yeniAdi = temaninAdi(yeni);
  const eskiKart = page.getByRole("group", { name: temaninAdi(temasi(eski.tema)) });
  await expect(eskiKart.getByText(metin("yonetim.tema.kullaniliyor"))).toBeVisible();

  // Demo: adres demonun adresi ve temanın kodu; yeni sekmede açılır.
  const demoAdresi = temaDemosuAdresi();
  expect(
    demoAdresi,
    "tarayıcı testlerinde demo adresi verilir (playwright.config.ts)",
  ).toBeDefined();
  await context.route(`${demoAdresi}/**`, (istek) =>
    istek.fulfill({ contentType: "text/html", body: "<!doctype html><title>demo</title>" }),
  );
  const demo = page.getByRole("link", {
    name: doldur(metin("yonetim.tema.demoyuGezEtiketi"), { ad: yeniAdi }),
  });
  await expect(demo).toHaveAttribute("href", temaDemosuBaglantisi(yeni.kod) ?? "");
  const [sekme] = await Promise.all([context.waitForEvent("page"), demo.click()]);
  await sekme.waitForLoadState();
  expect(sekme.url()).toBe(temaDemosuBaglantisi(yeni.kod));
  await sekme.close();

  // Temayı klavyeyle değiştirmek: düzen sorusu seçilmeden yayınlanmaz.
  const kullan = page.getByRole("button", {
    name: doldur(metin("yonetim.tema.kullanEtiketi"), { ad: yeniAdi }),
  });
  await kullan.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog", {
    name: doldur(metin("yonetim.tema.pencere.baslik"), { ad: yeniAdi }),
  });
  await expect(pencere).toBeVisible();
  await tara(page, "tema penceresi");
  const yayinla = pencere.getByRole("button", { name: metin("yonetim.tema.pencere.yayinla") });
  await yayinla.focus();
  await page.keyboard.press("Enter");
  await expect(pencere.getByText(metin("yonetim.tema.pencere.secimYok"))).toBeVisible();
  const koru = pencere.getByRole("radio", { name: metin("yonetim.tema.pencere.koru") });
  // Odak ilk seçeneğe gider; ok tuşu ikinciye geçer, boşluk seçer.
  await expect(pencere.getByRole("radio").first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(koru).toBeFocused();
  await page.keyboard.press("Space");
  await expect(koru).toHaveAttribute("aria-checked", "true");
  await expect(pencere.getByText(metin("yonetim.tema.pencere.secimYok"))).toBeHidden();
  await tara(page, "tema penceresi, yol seçili");
  await yayinla.focus();
  await page.keyboard.press("Enter");
  await expect(pencere).toBeHidden();
  await expect(bildirim(page, "yonetim.tema.yayinlandi")).toBeVisible();
  const yeniKart = page.getByRole("group", { name: yeniAdi });
  await expect(yeniKart.getByText(metin("yonetim.tema.kullaniliyor"))).toBeVisible();
  // Kullan düğmesi kalktı: odak yeni temanın başlığında.
  await expect(yeniKart.getByRole("heading", { name: yeniAdi })).toBeFocused();
  expect((await servis.temaDurumu(vt)).tema).toBe(yeni.kod);

  // Vitrin yeni temanın değerleriyle çizilir.
  const yeniCss = await vitrinCssi(yeni.kod);
  expect(await sayfaninCssleri(page)).toContain(yeniCss);

  // Önceki hâline dön: vitrin eski temaya döner.
  await page.goto(temaAdresi);
  await sayfaHazir(page);
  await page.getByRole("button", { name: metin("yonetim.eylem.oncekiHaleDon") }).click();
  await expect(bildirim(page, "yonetim.tema.geriDonuldu")).toBeVisible();
  await expect(eskiKart.getByText(metin("yonetim.tema.kullaniliyor"))).toBeVisible();
  const donus = await servis.temaDurumu(vt);
  expect({ tema: donus.tema, ayarlar: donus.ayarlar }).toEqual({
    tema: eski.tema,
    ayarlar: eski.ayarlar,
  });
  expect(await sayfaninCssleri(page)).not.toContain(yeniCss);
  expect(konsol).toEqual([]);
});

test("masaüstünde filtrenin yeri seçilir ve kategori sayfasında görünür", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const kategori = kayitAdresleri.kategori("giyim");
  const yerler = async () => {
    await page.goto(kategori);
    await sayfaHazir(page);
    const filtre = await page
      .getByRole("region", { name: metin("vitrin.liste.filtreler") })
      .boundingBox();
    const liste = await page
      .getByRole("list", { name: metin("vitrin.liste.urunler") })
      .boundingBox();
    if (filtre === null || liste === null) throw new Error("Filtre ya da liste çizilmedi.");
    return {
      solda: filtre.x + filtre.width <= liste.x && filtre.y < liste.y + liste.height,
      ustte: filtre.y + filtre.height <= liste.y && filtre.width > liste.width / 2,
    };
  };
  const { ayarlar } = await servis.temaDurumu(vt);
  const bugunku = ayarlar.urunFiltresi ?? "solda";
  const oteki = bugunku === "solda" ? "ustte" : "solda";
  expect(await yerler()).toEqual({ solda: bugunku === "solda", ustte: bugunku === "ustte" });

  await paneleGir(page, yonetici);
  await page.goto(temaAdresi);
  await sayfaHazir(page);
  const grup = page.getByRole("radiogroup", { name: metin("yonetim.tema.liste.filtreYeri") });
  await expect(
    grup.getByRole("radio", { name: metin(`yonetim.tema.liste.${bugunku}`) }),
  ).toHaveAttribute("aria-checked", "true");
  const kaydet = page.getByRole("button", { name: metin("yonetim.tema.liste.kaydet") });
  await expect(kaydet).toBeDisabled();
  await grup.getByRole("radio", { name: metin(`yonetim.tema.liste.${oteki}`) }).click();
  await kaydet.focus();
  await page.keyboard.press("Enter");
  await expect(bildirim(page, "yonetim.tema.filtreKaydedildi")).toBeVisible();
  expect((await servis.temaDurumu(vt)).ayarlar.urunFiltresi).toBe(oteki);
  expect(await yerler()).toEqual({ solda: oteki === "solda", ustte: oteki === "ustte" });
});

test("mağaza sahibi logoyu klavyeyle yükler ve vitrinde görür; hatalı dosyada alan hatası; onayla kaldırır", async ({
  page,
  context,
}) => {
  const konsol = konsoluDinle(page, {
    // Reddedilen dosyanın yanıtı (400) beklenir: tarayıcı onu konsola yazar.
    haric: (ileti) => ileti.includes("status of 400"),
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yonetici);
  await page.goto(temaAdresi);
  await sayfaHazir(page);
  const yukle = page.getByRole("button", { name: metin("yonetim.tema.logo.yukle") });
  const onizleme = page.getByRole("img", { name: metin("yonetim.tema.logo.onizleme") });
  const ilkAdres = await onizleme.getAttribute("src");
  await expect(page.getByText(metin("yonetim.tema.logo.ilk"))).toBeVisible();

  // Görsel olmayan dosya: hata alanın altında, düğmeye bağlı, odak düğmede.
  let secici = page.waitForEvent("filechooser");
  await yukle.focus();
  await page.keyboard.press("Enter");
  await (await secici).setFiles({
    name: "not.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("logo değil"),
  });
  const turler = siteninBicimleyicisi(calisanSite().ayarlar).veyaListesi(yuklenebilenTurAdlari);
  const hata = page.getByText(doldur(metin("yonetim.dosya.hata.tur-izinsiz"), { turler }));
  await expect(hata).toBeVisible();
  await expect(yukle).toHaveAttribute("aria-invalid", "true");
  await expect(yukle).toHaveAttribute("aria-describedby", (await hata.getAttribute("id")) ?? "");
  await expect(yukle).toBeFocused();
  await tara(page, "logo hatası");

  // Gerçek görsel: yüklenir, hata kalkar, önizleme ve vitrin yeni logoyu gösterir.
  const gorsel = await sharp({
    create: { width: 240, height: 60, channels: 3, background: { r: 20, g: 90, b: 160 } },
  })
    .png()
    .toBuffer();
  secici = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await (await secici).setFiles({ name: "logo.png", mimeType: "image/png", buffer: gorsel });
  await expect(bildirim(page, "yonetim.tema.logo.yuklendi")).toBeVisible();
  await expect(page.getByText(metin("yonetim.tema.logo.yuklenen"))).toBeVisible();
  await expect(hata).toBeHidden();
  const yeniAdres = await onizleme.getAttribute("src");
  expect(yeniAdres).not.toBe(ilkAdres);
  const vitrin = await context.newPage();
  await vitrin.goto("/");
  await sayfaHazir(vitrin);
  const ustLogo = vitrin.locator(`header img[src="${yeniAdres}"]`).first();
  await expect(ustLogo).toBeVisible();
  expect(await ustLogo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(240);
  await vitrin.close();

  // Onayla kaldırma: Vazgeç değiştirmez, onay ilk logoya döndürür.
  const kaldir = page.getByRole("button", { name: metin("yonetim.tema.logo.kaldir") });
  await kaldir.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("alertdialog", { name: metin("yonetim.tema.logo.kaldirBaslik") });
  await expect(pencere).toBeVisible();
  await tara(page, "logo kaldırma onayı");
  await page.keyboard.press("Escape");
  await expect(pencere).toBeHidden();
  await expect(page.getByText(metin("yonetim.tema.logo.yuklenen"))).toBeVisible();
  await kaldir.focus();
  await page.keyboard.press("Enter");
  await pencere.getByRole("button", { name: metin("yonetim.tema.logo.kaldir") }).click();
  await expect(bildirim(page, "yonetim.tema.logo.kaldirildi")).toBeVisible();
  await expect(page.getByText(metin("yonetim.tema.logo.ilk"))).toBeVisible();
  await expect(onizleme).toHaveAttribute("src", ilkAdres ?? "");
  expect(konsol).toEqual([]);
});

test("ekran ve tema penceresi iki renkte ve üç genişlikte taramadan geçer, yana kaymaz", async ({
  page,
}) => {
  const konsol = konsoluDinle(page);
  await paneleGir(page, yonetici);
  const yeniAdi = temaninAdi(await baskaTema());
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const { ad, width, height } of genislikler) {
      await page.setViewportSize({ width, height });
      await page.goto(temaAdresi);
      await sayfaHazir(page);
      await tara(page, `${renk}, ${ad}`);
      expect(await yanaKayma(page), `${renk}, ${ad}`).toBe(0);
      await page
        .getByRole("button", { name: doldur(metin("yonetim.tema.kullanEtiketi"), { ad: yeniAdi }) })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await tara(page, `${renk}, ${ad}, pencere`);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
    }
  }
  expect(konsol).toEqual([]);
});
