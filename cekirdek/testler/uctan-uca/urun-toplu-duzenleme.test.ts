// Ürünlerde toplu düzenleme gerçek tarayıcıda ve gerçek veritabanıyla (kart 0314, karar 0189): mağaza sahibi ürün
// listesinde ürünleri klavyeyle seçer, "Fiyatı değiştir" penceresini açar; boş oranda alanın hatası ve odak alanda;
// oranı yazıp Enter ile önizler, önizlemenin başlığı odak alır, birleşimler ve işlenmeyecek ürün görünür; "N ürüne
// uygula" ile uygular, sonuç listede odak alır, fiyatlar veritabanında değişir, seçim işlenemeyende kalır. Stoğu
// klavyeyle ekler; kategoriyi arayıp ekler. Pencere hatalı ve önizlenmiş hâliyle iki renkte ve üç genişlikte
// taramadan geçer, sayfa yana kaymaz, konsolda hata yoktur.
//
// Ürünler sitenin paylaşılan verisidir: test kendi ürünlerini ("Deneme <6 onaltılık> …") açar, aramayla yalnız onları
// görür ve sonunda siler.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { kategoriEkle, kategoriSil } from "../../moduller/kategori/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, type DenemeYoneticisi, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;
const urunlerAdresi = "/yonetim/urunler";

let yonetici: DenemeYoneticisi;
test.beforeEach(({ page }) => {
  yonetici = yoneticiAc();
  return ayriBaglanti(page);
});
test.afterAll(async () => {
  await vt.$client.end();
});

// Testin ürünleri: "Deneme <ek> Mum" (basit, 249,90, stok 3), "Deneme <ek> Tişört" (Beden S ve M, 100,00 ve
// 120,00), "Deneme <ek> Fiyatsız" (fiyatı yok) ve kategori "Deneme <ek> Yılbaşı".
const urunleriAc = async () => {
  const ek = randomBytes(3).toString("hex");
  const servis = calisanSiteninUrunServisi();
  const fiyat = siteninFiyatServisi(calisanSite());
  const kategori = await kategoriEkle(vt, yapan, { ad: `Deneme ${ek} Yılbaşı` });
  const mum = await servis.urunEkle(vt, yapan, { ad: `Deneme ${ek} Mum`, vergiSinifi: null });
  const mumBirimi = (await servis.urunuOku(vt, mum))?.birimler[0]?.kimlik ?? "";
  await fiyat.fiyatYaz(vt, yapan, mumBirimi, { satisFiyati: 24_990 });
  await stokServisi().stokDuzelt(vt, yapan, mumBirimi, {
    yeniMiktar: 3,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const tisort = await servis.urunEkle(vt, yapan, { ad: `Deneme ${ek} Tişört`, vergiSinifi: null });
  await servis.varyantlariKaydet(
    vt,
    yapan,
    tisort,
    { secenekler: [{ ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] }], birlesimler: [] },
    { silebilir: true },
  );
  const tisortBirimleri = ((await servis.urunuOku(vt, tisort))?.birimler ?? [])
    .filter((birim) => !birim.silindi)
    .map((birim) => birim.kimlik);
  for (const [i, birim] of tisortBirimleri.entries()) {
    await fiyat.fiyatYaz(vt, yapan, birim, { satisFiyati: 10_000 + i * 2_000 });
  }
  const fiyatsiz = await servis.urunEkle(vt, yapan, {
    ad: `Deneme ${ek} Fiyatsız`,
    vergiSinifi: null,
  });
  return {
    ek,
    kategori,
    mum,
    mumBirimi,
    tisort,
    tisortBirimleri,
    fiyatsiz,
    sil: async () => {
      for (const urun of [mum, tisort, fiyatsiz])
        await servis.urunSil(vt, yapan, urun).catch(() => undefined);
      await kategoriSil(vt, yapan, kategori).catch(() => undefined);
    },
  };
};
type Deneme = Awaited<ReturnType<typeof urunleriAc>>;

const listeyiAc = async (page: Page, deneme: Deneme) => {
  await paneleGir(page, yonetici);
  await page.goto(`${urunlerAdresi}?ara=${deneme.ek}&sirala=ad-artan`);
  await sayfaHazir(page);
};

const sayfayiSec = async (page: Page) => {
  const hepsi = page
    .getByRole("table", { name: metin("yonetim.urunler.liste") })
    .getByRole("checkbox", { name: metin("yonetim.liste.sayfayiSec") });
  await hepsi.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("region", { name: metin("yonetim.liste.topluIslem") })).toBeVisible();
};

const cubukDugmesi = (page: Page, ad: string) =>
  page.getByRole("region", { name: metin("yonetim.liste.topluIslem") }).getByRole("button", {
    name: ad,
  });

const odaktakiYazi = (page: Page) => page.evaluate(() => document.activeElement?.textContent ?? "");

test("mağaza sahibi klavyeyle fiyatı ve stoğu toplu değiştirir, kategoriye ekler", async ({
  page,
}) => {
  const deneme = await urunleriAc();
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    const hatalar = konsoluDinle(page, { haric: (ileti) => ileti.includes("status of 404") });
    await listeyiAc(page, deneme);
    await sayfayiSec(page);

    // Fiyat: boş oranla önizleme alanın hatasını verir, odak alanda.
    await cubukDugmesi(page, metin("yonetim.urunler.topluDuzenleme.fiyat.ad")).focus();
    await page.keyboard.press("Enter");
    const pencere = page.getByRole("dialog", {
      name: metin("yonetim.urunler.topluDuzenleme.fiyat.ad"),
    });
    await expect(pencere).toBeVisible();
    const oran = pencere.getByRole("textbox", {
      name: new RegExp(metin("yonetim.urunler.topluDuzenleme.fiyat.oran")),
    });
    await oran.focus();
    await page.keyboard.press("Enter");
    await expect(
      pencere.getByText(metin("yonetim.urunler.topluDuzenleme.hata.too_small")),
    ).toBeVisible();
    await expect(oran).toBeFocused();

    // Yüzde 10 artış: Enter ile önizleme; başlık odak alır, birleşimler ve işlenmeyecek ürün görünür.
    await page.keyboard.type("10");
    await page.keyboard.press("Enter");
    await expect(
      pencere.getByRole("heading", {
        name: metin("yonetim.urunler.topluDuzenleme.onizleme.baslik"),
      }),
    ).toBeFocused();
    await expect(
      pencere.getByText(
        doldur(metin("yonetim.urunler.topluDuzenleme.onizleme.ozet"), { urun: "2", birim: "3" }),
      ),
    ).toBeVisible();
    const tablo = pencere.getByRole("table", {
      name: metin("yonetim.urunler.topluDuzenleme.onizleme.tablo"),
    });
    await expect(tablo).toContainText(`Deneme ${deneme.ek} Tişört: M`);
    await expect(tablo).toContainText("274,89");
    await expect(pencere).toContainText(`Deneme ${deneme.ek} Fiyatsız: fiyatı yok`);

    const uygula = pencere.getByRole("button", {
      name: doldur(metin("yonetim.urunler.topluDuzenleme.uygula"), { sayi: "2" }),
    });
    await uygula.focus();
    await page.keyboard.press("Enter");
    await expect(pencere).toHaveCount(0);
    await expect
      .poll(() => odaktakiYazi(page))
      .toContain(doldur(metin("yonetim.urunler.topluDuzenleme.fiyat.basari"), { sayi: "2" }));
    expect(await odaktakiYazi(page)).toContain(`Deneme ${deneme.ek} Fiyatsız: fiyatı yok`);
    const fiyat = siteninFiyatServisi(calisanSite());
    expect((await fiyat.fiyatOku(vt, deneme.mumBirimi))?.satisFiyati).toBe(27_489);
    expect(
      await Promise.all(
        deneme.tisortBirimleri.map(async (b) => (await fiyat.fiyatOku(vt, b))?.satisFiyati),
      ),
    ).toEqual([11_000, 13_200]);
    // Seçim işlenemeyende kalır.
    await expect(
      page
        .getByRole("region", { name: metin("yonetim.liste.topluIslem") })
        .getByText(doldur(metin("yonetim.liste.seciliSayisi"), { sayi: "1" })),
    ).toBeVisible();

    // Stok: yeniden sayfanın hepsi seçilir, 5 eklenir.
    await page.reload();
    await sayfaHazir(page);
    await sayfayiSec(page);
    await cubukDugmesi(page, metin("yonetim.urunler.topluDuzenleme.stok.ad")).focus();
    await page.keyboard.press("Enter");
    const stokPenceresi = page.getByRole("dialog", {
      name: metin("yonetim.urunler.topluDuzenleme.stok.ad"),
    });
    await stokPenceresi
      .getByRole("textbox", {
        name: new RegExp(metin("yonetim.urunler.topluDuzenleme.stok.miktar")),
      })
      .focus();
    await page.keyboard.type("5");
    await page.keyboard.press("Enter");
    await expect(
      stokPenceresi.getByText(
        doldur(metin("yonetim.urunler.topluDuzenleme.onizleme.ozet"), { urun: "3", birim: "4" }),
      ),
    ).toBeVisible();
    await stokPenceresi
      .getByRole("button", {
        name: doldur(metin("yonetim.urunler.topluDuzenleme.uygula"), { sayi: "3" }),
      })
      .focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => odaktakiYazi(page))
      .toContain(doldur(metin("yonetim.urunler.topluDuzenleme.stok.basari"), { sayi: "3" }));
    const stoklar = await stokServisi().stoklariOku(vt, [deneme.mumBirimi]);
    expect(stoklar.get(deneme.mumBirimi)?.miktar).toBe(8);

    // Kategori: aranıp ok ve Enter ile seçilir, eklenir.
    await page.reload();
    await sayfaHazir(page);
    await sayfayiSec(page);
    await cubukDugmesi(page, metin("yonetim.urunler.topluDuzenleme.kategori-ekle.ad")).focus();
    await page.keyboard.press("Enter");
    const kategoriPenceresi = page.getByRole("dialog", {
      name: metin("yonetim.urunler.topluDuzenleme.kategori-ekle.ad"),
    });
    await kategoriPenceresi.getByRole("combobox").focus();
    await page.keyboard.type(`Deneme ${deneme.ek} Yıl`);
    const oneri = page.getByRole("option", { name: `Deneme ${deneme.ek} Yılbaşı` });
    await expect(oneri).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(kategoriPenceresi).toContainText(`Deneme ${deneme.ek} Yılbaşı`);
    await kategoriPenceresi
      .getByRole("button", { name: metin("yonetim.urunler.topluDuzenleme.onizle") })
      .focus();
    await page.keyboard.press("Enter");
    await expect(kategoriPenceresi.getByText("3 ürün değişecek.")).toBeVisible();
    await kategoriPenceresi
      .getByRole("button", {
        name: doldur(metin("yonetim.urunler.topluDuzenleme.uygula"), { sayi: "3" }),
      })
      .focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(
        async () => (await calisanSiteninUrunServisi().urunuOku(vt, deneme.fiyatsiz))?.kategoriler,
      )
      .toEqual([deneme.kategori]);
    expect(hatalar).toEqual([]);
  } finally {
    await deneme.sil();
  }
});

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;
const yanaKayma = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const renk of ["light", "dark"] as const) {
  for (const { ad, width, height } of genislikler) {
    test(`${renk} ${ad}: hatalı ve önizlenmiş pencere taramadan geçer, yana kaymaz`, async ({
      page,
    }) => {
      const deneme = await urunleriAc();
      try {
        const hatalar = konsoluDinle(page, { haric: (ileti) => ileti.includes("status of 404") });
        await page.emulateMedia({ colorScheme: renk });
        await page.setViewportSize({ width, height });
        await listeyiAc(page, deneme);
        // Telefonda tablo yerine kartlar: görünen "sayfanın hepsini seç" kutusu.
        await page
          .getByRole("checkbox", { name: metin("yonetim.liste.sayfayiSec") })
          .filter({ visible: true })
          .first()
          .click();
        await cubukDugmesi(page, metin("yonetim.urunler.topluDuzenleme.fiyat.ad")).click();
        const pencere = page.getByRole("dialog", {
          name: metin("yonetim.urunler.topluDuzenleme.fiyat.ad"),
        });
        await pencere
          .getByRole("radio", {
            name: metin("yonetim.urunler.topluDuzenleme.fiyat.hedefler.indirimli"),
          })
          .click();
        await pencere
          .getByRole("button", { name: metin("yonetim.urunler.topluDuzenleme.onizle") })
          .click();
        await expect(
          pencere.getByText(metin("yonetim.urunler.topluDuzenleme.hata.too_small")),
        ).toBeVisible();
        await tara(page, "hatalı pencere");
        await pencere
          .getByRole("textbox", {
            name: new RegExp(metin("yonetim.urunler.topluDuzenleme.fiyat.oran")),
          })
          .fill("15");
        await pencere
          .getByRole("button", { name: metin("yonetim.urunler.topluDuzenleme.onizle") })
          .click();
        await expect(
          pencere.getByText(
            doldur(metin("yonetim.urunler.topluDuzenleme.onizleme.ozet"), {
              urun: "2",
              birim: "3",
            }),
          ),
        ).toBeVisible();
        await tara(page, "önizlenmiş pencere");
        expect(await yanaKayma(page)).toBe(0);
        expect(hatalar).toEqual([]);
      } finally {
        await deneme.sil();
      }
    });
  }
}
