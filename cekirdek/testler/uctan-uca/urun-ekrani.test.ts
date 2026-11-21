// Panelin ürün ekranı gerçek tarayıcıda ve gerçek veritabanıyla (kart 0263, karar 0162): mağaza sahibi listeden
// "Ürün ekle" ile klavyeyle gelir; boş adla kaydedince hata alanın altında ve odak alanda; adı, kısa açıklamayı ve
// biçimli açıklamayı (Ctrl+B ile kalın, araç çubuğunda ok tuşları) yazar, kategoriyi arayıp seçer ve kaydeder; ürünün
// ekranı açılır, ürün taslaktır. Okunamayan ağırlık alanın hatasını alır; yayın durumunu klavyeyle "Yayında" yapıp
// kaydedince "Vitrinde gör" görünür ve vitrinde ürünün sayfası adı, kalın açıklaması ve kategorisiyle açılır. Listede
// ürünün adı ürün ekranına gider. Onay penceresinde Vazgeç silmez, Sil ürünü siler ve listeye döner. Yeni ürün ve
// ürün ekranı iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yoktur.
//
// Ürünler sitenin paylaşılan verisidir: test kendi kayıtlarını ("Deneme <6 onaltılık> …") açar ve sonunda siler.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { like } from "drizzle-orm";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { kategoriEkle, kategoriSil } from "../../moduller/kategori/servis";
import { urunler } from "../../moduller/urun/model";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, type DenemeYoneticisi, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

let yonetici: DenemeYoneticisi;
test.beforeEach(({ page }) => {
  yonetici = yoneticiAc();
  return ayriBaglanti(page);
});
test.afterAll(async () => {
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

// Testin ürünlerini (adı "Deneme <ek>" ile başlayan) ve kategorisini siler.
const temizle = async (ek: string, kategori?: string) => {
  const servis = calisanSiteninUrunServisi();
  const kalan = await vt
    .select({ kimlik: urunler.kimlik })
    .from(urunler)
    .where(like(urunler.ad, `Deneme ${ek}%`));
  for (const { kimlik } of kalan) await servis.urunSil(vt, yapan, kimlik).catch(() => undefined);
  if (kategori !== undefined) await kategoriSil(vt, yapan, kategori).catch(() => undefined);
};

// Hatalı formun yanıtı (doğrulama, 400) tarayıcının konsoluna yazılır; beklenen hatadır.
const beklenenHata = (ileti: string) => ileti.includes("status of 400");

const kaydetDugmesi = (page: Page, ad: string) =>
  page.getByRole("button", { name: ad, exact: true });

test("mağaza sahibi klavyeyle yeni ürün açar, yayına alır, vitrinde görür ve siler", async ({
  page,
}) => {
  const ek = randomBytes(3).toString("hex");
  const kategori = await kategoriEkle(vt, yapan, { ad: `Deneme ${ek} Kupalar` });
  const konsol = konsoluDinle(page, { haric: beklenenHata });
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yonetici);
    await page.goto("/yonetim/urunler");
    await sayfaHazir(page);

    // Listenin asıl eylemi: "Ürün ekle" (kart 0263).
    const ekle = page.getByRole("link", { name: metin("yonetim.eylem.urunEkle") });
    await ekle.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/yonetim\/urunler\/yeni$/);
    await sayfaHazir(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      metin("yonetim.sayfa.yeniUrun.ad"),
    );

    // Boş adla kayıt: tek hata, alanın altında, odak alanda.
    const kaydet = kaydetDugmesi(page, metin("yonetim.urunEkrani.ekle"));
    await kaydet.focus();
    await page.keyboard.press("Enter");
    const ad = page.getByRole("textbox", { name: metin("yonetim.urunEkrani.ad") });
    await expect(ad).toBeFocused();
    await expect(ad).toHaveAttribute("aria-invalid", "true");

    await page.keyboard.type(`Deneme ${ek} Kupa`);
    await page.keyboard.press("Tab");
    await page.keyboard.type("Seramik kupa.");
    // Açıklama: araç çubuğu tek sekme durağıdır, ok tuşlarıyla gezilir; yazı alanında Ctrl+B kalın yazar.
    await page.keyboard.press("Tab");
    const cubuk = page.getByRole("toolbar", {
      name: doldur(metin("yonetim.bicimliMetin.aracCubugu"), {
        alan: metin("yonetim.urunEkrani.aciklama"),
      }),
    });
    await expect(
      cubuk.getByRole("button", { name: metin("yonetim.bicimliMetin.kalin") }),
    ).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(
      cubuk.getByRole("button", { name: metin("yonetim.bicimliMetin.egik") }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    const aciklama = page.getByRole("textbox", {
      name: metin("yonetim.urunEkrani.aciklama"),
      exact: true,
    });
    await expect(aciklama).toBeFocused();
    await page.keyboard.type("Elde yapılmış ");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type("bulaşık makinesinde");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type(" yıkanır.");
    await expect(
      cubuk.getByRole("button", { name: metin("yonetim.bicimliMetin.kalin") }),
    ).toHaveAttribute("aria-pressed", "false");

    // Kategori kayıt arayarak: yazılır, ok ve Enter ile seçilir, seçilen kaldırılabilir olarak görünür.
    const kategoriKutusu = page.getByRole("combobox", {
      name: metin("yonetim.urunEkrani.kategoriler"),
    });
    await kategoriKutusu.focus();
    await page.keyboard.type(`Deneme ${ek} Kup`);
    const oneri = page.getByRole("option", { name: `Deneme ${ek} Kupalar` });
    await expect(oneri).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", {
        name: doldur(metin("yonetim.cokluKayit.kaldir"), { ad: `Deneme ${ek} Kupalar` }),
      }),
    ).toBeVisible();

    await kaydet.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/yonetim\/urunler\/urun\?kimlik=/);
    await sayfaHazir(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Deneme ${ek} Kupa`);
    const kimlik = new URL(page.url()).searchParams.get("kimlik") ?? "";
    const servis = calisanSiteninUrunServisi();
    const urun = await servis.urunuOku(vt, kimlik);
    expect(urun?.durum).toBe("taslak");
    expect(urun?.kategoriler).toEqual([kategori]);
    expect(urun?.kisaAciklama).toBe("Seramik kupa.");
    expect(urun?.uzunAciklama).toContain("<strong>bulaşık makinesinde</strong>");
    // Taslak ürünün vitrin bağlantısı yoktur.
    await expect(page.getByRole("link", { name: metin("yonetim.eylem.vitrindeGor") })).toHaveCount(
      0,
    );

    // Okunamayan ağırlık: alanın hatası, odak alanda.
    const agirlik = page.getByRole("textbox", { name: /Ağırlık/ });
    await agirlik.fill("1,2,3");
    const kaydetVar = kaydetDugmesi(page, metin("yonetim.urunEkrani.kaydet"));
    await kaydetVar.focus();
    await page.keyboard.press("Enter");
    await expect(agirlik).toBeFocused();
    await expect(page.getByText(metin("yonetim.urun.hata.agirlik-bicimi"))).toBeVisible();
    await agirlik.fill("0,35");

    // Yayın durumu klavyeyle: radyo grubunda ok tuşları.
    const taslakSecenegi = page.getByRole("radio", {
      name: metin("yonetim.urunEkrani.yayin.taslak"),
    });
    await taslakSecenegi.focus();
    await expect(taslakSecenegi).toBeChecked();
    // Radix seçimi tuş bırakılmadan önce yapar: tuş kısa süre basılı tutulur (ödeme testinin yolu).
    await page.keyboard.press("ArrowUp", { delay: 50 });
    await page.keyboard.press("ArrowUp", { delay: 50 });
    await expect(
      page.getByRole("radio", { name: metin("yonetim.urunEkrani.yayin.yayinda") }),
    ).toBeChecked();
    await kaydetVar.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("link", { name: metin("yonetim.eylem.vitrindeGor") }),
    ).toBeVisible();
    const kaydedilen = await servis.urunuOku(vt, kimlik);
    expect(kaydedilen?.durum).toBe("yayinda");
    expect(kaydedilen?.birimler[0]?.agirlikGram).toBe(350);

    // Vitrinde: ürünün sayfası adı, kalın açıklaması ve kategorisiyle.
    const vitrin = page.getByRole("link", { name: metin("yonetim.eylem.vitrindeGor") });
    await expect(vitrin).toHaveAttribute("target", "_blank");
    const adres = (await vitrin.getAttribute("href")) ?? "";
    const vitrinSayfasi = await page.context().newPage();
    await vitrinSayfasi.goto(adres);
    await sayfaHazir(vitrinSayfasi);
    await expect(vitrinSayfasi.getByRole("heading", { level: 1 })).toHaveText(`Deneme ${ek} Kupa`);
    await expect(vitrinSayfasi.locator("strong", { hasText: "bulaşık makinesinde" })).toBeVisible();
    await expect(
      vitrinSayfasi.getByRole("link", { name: `Deneme ${ek} Kupalar` }).first(),
    ).toBeVisible();
    await vitrinSayfasi.close();

    // Listede ürünün adı ürün ekranına gider.
    await page.goto(`/yonetim/urunler?ara=${ek}`);
    await sayfaHazir(page);
    const adBaglantisi = page.getByRole("link", { name: `Deneme ${ek} Kupa`, exact: true }).first();
    await adBaglantisi.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`kimlik=${kimlik}`));
    await sayfaHazir(page);

    // Silme onayla: Vazgeç silmez, Sil siler ve listeye döner.
    const sil = page.getByRole("button", { name: metin("yonetim.urunEkrani.sil"), exact: true });
    await sil.focus();
    await page.keyboard.press("Enter");
    const pencere = page.getByRole("alertdialog");
    await expect(pencere).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(pencere).toBeHidden();
    await expect(sil).toBeFocused();
    expect((await servis.urunuOku(vt, kimlik))?.silindi).toBe(false);
    await page.keyboard.press("Enter");
    await pencere.getByRole("button", { name: metin("yonetim.urunEkrani.sil") }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/yonetim\/urunler$/);
    expect((await servis.urunuOku(vt, kimlik))?.silindi).toBe(true);
    expect(konsol).toEqual([]);
  } finally {
    await temizle(ek, kategori);
  }
});

test("ürün ekranında özellik değeri türüne uymayınca alanın hatası; seçimler kaldırılabilir", async ({
  page,
}) => {
  const ek = randomBytes(3).toString("hex");
  const servis = calisanSiteninUrunServisi();
  const kimlik = await servis.urunEkle(vt, yapan, { ad: `Deneme ${ek} Termos`, vergiSinifi: null });
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yonetici);
    await page.goto(`/yonetim/urunler/urun?kimlik=${kimlik}`);
    await sayfaHazir(page);
    // Olmayan ürün ve bozuk kimlik bulunamadı.
    const olmayan = await page.request.get(`/yonetim/urunler/urun?kimlik=${randomUUID()}`);
    expect(olmayan.status()).toBe(404);
    const bozuk = await page.request.get("/yonetim/urunler/urun?kimlik=x");
    expect(bozuk.status()).toBe(404);

    // Kayıtlı ürün listesinde Vazgeç yazılanı geri alır.
    const ad = page.getByRole("textbox", { name: metin("yonetim.urunEkrani.ad") });
    await ad.fill(`Deneme ${ek} Değişmiş`);
    await page.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
    await expect(ad).toHaveValue(`Deneme ${ek} Termos`);

    // En çok alım adedi en azdan küçük: alanın hatası.
    await page.getByRole("textbox", { name: metin("yonetim.urunEkrani.enAzAdet") }).fill("5");
    const enCok = page.getByRole("textbox", { name: metin("yonetim.urunEkrani.enCokAdet") });
    await enCok.fill("2");
    const kaydet = kaydetDugmesi(page, metin("yonetim.urunEkrani.kaydet"));
    await kaydet.focus();
    await page.keyboard.press("Enter");
    await expect(enCok).toBeFocused();
    await expect(page.getByText(metin("yonetim.urun.hata.adet-siniri"))).toBeVisible();
    await enCok.fill("");
    await kaydet.click();
    await expect(page.getByText(metin("yonetim.urunEkrani.kaydedildi")).first()).toBeVisible();
    expect((await servis.urunuOku(vt, kimlik))?.enAzAdet).toBe(5);
  } finally {
    await servis.urunSil(vt, yapan, kimlik).catch(() => undefined);
  }
});

// Her renk ve genişlik ayrı testtir.
for (const renk of ["light", "dark"] as const) {
  for (const { ad, width, height } of genislikler) {
    test(`${renk} ${ad}: yeni ürün ve ürün ekranı taramadan geçer, yana kaymaz`, async ({
      page,
    }) => {
      const ek = randomBytes(3).toString("hex");
      const servis = calisanSiteninUrunServisi();
      const kimlik = await servis.urunEkle(vt, yapan, {
        ad: `Deneme ${ek} Tarama`,
        vergiSinifi: null,
        kisaAciklama: "Kısa açıklama.",
        uzunAciklama: "<p>Uzun <strong>açıklama</strong>.</p>",
      });
      const konsol = konsoluDinle(page, { haric: beklenenHata });
      try {
        await page.emulateMedia({ colorScheme: renk });
        await page.setViewportSize({ width, height });
        await paneleGir(page, yonetici);
        await page.goto("/yonetim/urunler/yeni");
        await sayfaHazir(page);
        await tara(page, `${renk} ${ad} yeni ürün`);
        expect(await yanaKayma(page)).toBe(0);
        // Hatalı yeni ürün formu.
        await kaydetDugmesi(page, metin("yonetim.urunEkrani.ekle")).click();
        await expect(
          page.getByRole("textbox", { name: metin("yonetim.urunEkrani.ad") }),
        ).toHaveAttribute("aria-invalid", "true");
        await tara(page, `${renk} ${ad} hatalı yeni ürün`);
        await page.goto(`/yonetim/urunler/urun?kimlik=${kimlik}`);
        await sayfaHazir(page);
        await tara(page, `${renk} ${ad} ürün ekranı`);
        expect(await yanaKayma(page)).toBe(0);
        // Bağlantı satırı açıkken.
        await page.getByRole("button", { name: metin("yonetim.bicimliMetin.baglanti") }).click();
        await expect(
          page.getByRole("textbox", { name: metin("yonetim.bicimliMetin.baglantiAdresi") }),
        ).toBeFocused();
        await page.keyboard.type("javascript:alert(1)");
        await page.keyboard.press("Enter");
        await expect(page.getByText(metin("yonetim.bicimliMetin.baglantiGecersiz"))).toBeVisible();
        await tara(page, `${renk} ${ad} bağlantı satırı`);
        expect(await yanaKayma(page)).toBe(0);
        expect(konsol).toEqual([]);
      } finally {
        await servis.urunSil(vt, yapan, kimlik).catch(() => undefined);
      }
    });
  }
}
