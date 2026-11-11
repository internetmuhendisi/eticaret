// Vitrinin "bulunamadı" ve hata sayfası gerçek tarayıcıda (kart 0120). Olmayan vitrin adresi ve olmayan kayıt 404
// ile, sitenin dilinde, üst ve alt kısımla açılır; altında sitenin üst düzey kategorileri görselleriyle durur.
// Hata veren vitrin sayfası (yalnız geliştirmede ve deneme ortamında açılan deneme sayfası) üst ve alt kısmı
// koruyarak hata ekranını içerikte gösterir, mağazanın telefonunu yazar, "Yeniden dene" sayfayı yeniden ister. İki
// sayfa da iki renkte ve üç genişlikte taramadan geçer, yana kaymaz. Kapı, geliştirme ve panel adresleri vitrinin
// "bulunamadı" sayfasına düşmez.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin, siteDili } from "../../metinler/site-metni";
import { dosyaSil, gorselKaydet } from "../../moduller/dosya/servis";
import { doldur } from "../../moduller/eposta/sablon";
import {
  type Kategori,
  kategoriEkle,
  kategorileriOku,
  kategoriSil,
} from "../../moduller/kategori/servis";
import { magazaninAdi, siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../../vitrin/adresler";
import { girisAdresi } from "../../yonetim-paneli/adresler";
import { sayfaHazir } from "./sayfa-hazir";

if (existsSync(".env")) process.loadEnvFile(".env");

const hataDenemesi = "/gelistirme/hata-denemesi";

const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

const tara = async (page: Page, ne: string) => {
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

const yanaKaymaz = async (page: Page, ne: string) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      undefined,
    ),
    ne,
  ).toBe(0);

const cerceveGorunur = async (page: Page) => {
  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.locator("footer").first()).toBeVisible();
};

const veritabani = () => baglan(veritabaniAdresi());

const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;

const ustKategoriler = async (vt: Veritabani) =>
  (await kategorileriOku(vt)).filter((kategori) => kategori.ust === null);

// Test kendi kategorilerini açar: görselli geçici bir üst kategori (görselin vitrin görseli ucundan yüklendiği
// ölçülür) ve onun altında bir alt kategori (sayfa yalnız üst düzeyi gösterir, görünmemeli). Sitenin kendi üst
// kategorileri de sırasıyla görünür (bölümün liste sınırı testin sitesinde dolmaz). Hazırlık adımlarından biri
// düşse de açılanlar temizlenir.
test("olmayan vitrin adresi ve olmayan kayıt 404 ile, sitenin dilinde, üst ve alt kısımla açılır; iki renkte ve üç genişlikte taramadan geçer", async ({
  page,
}) => {
  const vt = veritabani();
  const ek = randomUUID().slice(0, 8);
  const temizlik: (() => Promise<unknown>)[] = [];
  try {
    const gorsel = await gorselKaydet(
      vt,
      await sharp({
        create: { width: 300, height: 300, channels: 3, background: { r: 10, g: 120, b: 60 } },
      })
        .png()
        .toBuffer(),
    );
    if (!gorsel.tamam) throw new Error(gorsel.hata);
    temizlik.push(() => dosyaSil(vt, gorsel.dosya.kimlik));
    const ust = await kategoriEkle(vt, yapan, {
      ad: `Deneme üst ${ek}`,
      adresAdi: `deneme-ust-${ek}`,
      gorsel: gorsel.dosya.kimlik,
    });
    temizlik.push(() => kategoriSil(vt, yapan, ust));
    const altAdi = `Deneme alt ${ek}`;
    const alt = await kategoriEkle(vt, yapan, { ad: altAdi, adresAdi: `deneme-alt-${ek}`, ust });
    temizlik.push(() => kategoriSil(vt, yapan, alt));
    const kendi = (await ustKategoriler(vt)).find(({ kimlik }) => kimlik === ust);
    if (kendi === undefined) throw new Error("Testin açtığı üst kategori okunamadı.");
    expect(kendi.gorsel).toBe(gorsel.dosya.kimlik);
    const magaza = await magazaninAdi(vt, calisanSite());
    await bulunamadiSayfalari(page, () => ustKategoriler(vt), { kendi, altAdi, magaza });
  } finally {
    for (const adim of temizlik.reverse()) await adim();
    await vt.$client.end();
  }
});

const bulunamadiSayfalari = async (
  page: Page,
  ustleriOku: () => Promise<Kategori[]>,
  { kendi, altAdi, magaza }: { kendi: Kategori; altAdi: string; magaza: string },
) => {
  const ek = randomUUID().slice(0, 8);
  const adresler = [
    `/olmayan-${ek}`,
    `/olmayan-${ek}/ic/ice`,
    kayitAdresleri.kategori(`olmayan-${ek}`),
  ];
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const genislik of genislikler) {
      await page.setViewportSize(genislik);
      for (const adres of adresler) {
        const ne = `${adres}, ${renk}, ${genislik.width}`;
        const oncesi = await ustleriOku();
        const yanit = await page.goto(adres);
        await sayfaHazir(page);
        const sonrasi = await ustleriOku();
        expect(yanit?.status(), ne).toBe(404);
        await expect(page.locator("html")).toHaveAttribute("lang", siteDili());
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
        await expect(page).toHaveTitle(
          doldur(metin("vitrin.sayfaBilgisi.kalip"), {
            baslik: metin("vitrin.bulunamadi.sekmeBasligi"),
            magaza,
          }),
        );
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          metin("vitrin.bulunamadi.baslik"),
        );
        await cerceveGorunur(page);
        const icerik = page.getByRole("main");
        await expect(
          icerik.getByRole("link", { name: metin("vitrin.bulunamadi.anasayfayaDon") }),
        ).toHaveAttribute("href", vitrinAdresleri.anasayfa);
        const kategoriler = icerik.getByRole("region", {
          name: metin("vitrin.bulunamadi.kategoriler"),
        });
        // Testin kendi üst kategorisi görseliyle ve kendi sayfasına; alt kategorisi yok.
        const kendiBaglantisi = kategoriler.getByRole("link", { name: kendi.ad, exact: true });
        await expect(kendiBaglantisi).toHaveAttribute(
          "href",
          kayitAdresleri.kategori(kendi.adresAdi),
        );
        const gorsel = kendiBaglantisi.locator("img");
        await expect(gorsel).toBeVisible();
        expect(
          await gorsel.evaluate((oge: HTMLImageElement) => oge.complete && oge.naturalWidth),
          `${ne}: görsel`,
        ).toBeGreaterThan(0);
        const adlar = await kategoriler.getByRole("link").allTextContents();
        expect(adlar, ne).not.toContain(altAdi);
        // Testler veritabanını paylaşır: başka bir test sayfa açılırken geçici bir üst kategori açıp silebilir. Sayfanın
        // öncesinde ve sonrasında var olan üst kategoriler sayfada sırasıyla görünür; arada gelip giden ölçülmez.
        const sonrakiler = new Set(sonrasi.map(({ kimlik }) => kimlik));
        const kalici = oncesi.filter(({ kimlik }) => sonrakiler.has(kimlik)).map(({ ad }) => ad);
        expect(
          adlar.filter((ad) => kalici.includes(ad)),
          ne,
        ).toEqual(kalici);
        await yanaKaymaz(page, ne);
        // Taramada sayfa başına bir adres yeter: üçü aynı sayfadır.
        if (adres === adresler[0]) await tara(page, ne);
      }
    }
  }
};

test("hata veren vitrin sayfası üst ve alt kısmı koruyarak hata ekranını gösterir; iki renkte ve üç genişlikte taramadan geçer", async ({
  page,
}) => {
  const vt = veritabani();
  const [ayarlar, magaza] = await Promise.all([
    siteninMagazaAyarlari(vt, calisanSite()),
    magazaninAdi(vt, calisanSite()),
  ]).finally(() => vt.$client.end());
  const aciklama =
    ayarlar.iletisimTelefonu === undefined
      ? metin("vitrin.hata.aciklama")
      : doldur(metin("vitrin.hata.aciklamaTelefonlu"), { telefon: ayarlar.iletisimTelefonu });
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const genislik of genislikler) {
      await page.setViewportSize(genislik);
      const ne = `${renk}, ${genislik.width}`;
      const yanit = await page.goto(hataDenemesi);
      await sayfaHazir(page);
      expect(yanit?.status(), ne).toBe(500);
      await expect(page).toHaveTitle(
        doldur(metin("vitrin.sayfaBilgisi.kalip"), {
          baslik: metin("vitrin.hata.sekmeBasligi"),
          magaza,
        }),
      );
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(metin("vitrin.hata.baslik"));
      await expect(page.getByRole("main")).toContainText(aciklama);
      await cerceveGorunur(page);
      await expect(
        page.getByRole("main").getByRole("link", { name: metin("vitrin.hata.anasayfayaDon") }),
      ).toHaveAttribute("href", vitrinAdresleri.anasayfa);
      await yanaKaymaz(page, ne);
      await tara(page, ne);
    }
  }
});

test("hata sayfasında Yeniden dene sayfayı sunucudan yeniden ister, çerçeve yerinde kalır", async ({
  page,
}) => {
  await page.goto(hataDenemesi);
  await sayfaHazir(page);
  // Sayfayı yeniden isteyen RSC isteği gider; deneme sayfası yine hata verir, hata ekranı yerinde kalır.
  const istek = page.waitForRequest(
    (giden) => new URL(giden.url()).pathname === hataDenemesi && giden.method() === "GET",
  );
  await page.getByRole("button", { name: metin("vitrin.hata.yenidenDene") }).click();
  await istek;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(metin("vitrin.hata.baslik"));
  await cerceveGorunur(page);
});

// Önce Next.js'in kendi 404 sayfasının çizildiği beklenir (tarayıcıda çizilir, karar 0104); vitrin çerçevesinin ve
// vitrinin bulunamadı sayfasının yokluğu ancak ondan sonra ölçülür.
const nextBulunamadi = async (page: Page, adres: string) => {
  const yanit = await page.goto(adres);
  expect(yanit?.status(), adres).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "404" }), adres).toBeVisible();
  await expect(page.locator("header"), adres).toHaveCount(0);
  await expect(page.getByText(metin("vitrin.bulunamadi.baslik")), adres).toHaveCount(0);
};

test("kapı ve geliştirme adresleri ve adreslerin kendisi vitrinin bulunamadı sayfasına düşmez, panelinki girişe yönlenir, site ikonu gövdesiz 404 alır", async ({
  page,
  request,
}) => {
  for (const adres of [
    "/kapi",
    "/kapi/olmayan",
    "/kapi/herkese-acik/olmayan",
    "/gelistirme",
    "/gelistirme/olmayan",
  ]) {
    await nextBulunamadi(page, adres);
  }
  for (const adres of ["/yonetim/olmayan", "/yonetim/giris/olmayan"]) {
    const yanit = await request.get(adres, { maxRedirects: 0 });
    expect(yanit.status(), adres).toBe(307);
    expect(new URL(yanit.headers()["location"] ?? "", "http://x").pathname, adres).toBe(
      girisAdresi,
    );
  }
  const ikon = await request.get("/favicon.ico");
  expect(ikon.status()).toBe(404);
  expect(await ikon.text()).toBe("");
});
