// Panelin ürünler listesi gerçek tarayıcıda ve gerçek veritabanıyla (kart 0262, karar 0161): mağaza sahibi menüden
// klavyeyle gelir, adı aratır (adres "ara"yı taşır), durum süzgecini klavyeyle seçer ve şeritten kaldırır, fiyat
// sütununun başlığıyla sıralar, bir ürünü boşlukla seçip toplu işlem çubuğundan onayla arşive alır; sonuç odak alır.
// Yayındaki ürünün "Vitrinde gör" bağlantısı yeni sekmede ürünün sayfasına gider, taslakta yoktur. Liste, açık süzgeç
// menüsü ve toplu işlem çubuğu iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yoktur.
//
// Ürünler sitenin paylaşılan verisidir: test kendi ürünlerini ("Deneme <6 onaltılık> …") açar, aramayla yalnız
// onları görür ve sonunda siler.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { kategoriEkle, kategoriSil } from "../../moduller/kategori/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, type DenemeYoneticisi, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;
const urunlerAdresi = "/yonetim/urunler";

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

// Testin ürünleri: "Deneme <ek> Yayında" (indirimli fiyat, bol stok), "Deneme <ek> Taslak" (düşük stok).
const urunleriAc = async () => {
  const ek = randomBytes(3).toString("hex");
  const servis = calisanSiteninUrunServisi();
  const fiyat = siteninFiyatServisi(calisanSite());
  const stok = stokServisi();
  // Yayındaki ürünün kendi kategorisi: kayıt süzgeci (kategori) bununla denenir.
  const kategori = await kategoriEkle(vt, yapan, { ad: `Deneme ${ek} Kategori` });
  const ac = async (ad: string, durum: "yayinda" | "taslak", satis: number, miktar: number) => {
    const urun = await servis.urunEkle(vt, yapan, {
      ad,
      vergiSinifi: null,
      durum,
      ...(durum === "yayinda" ? { kategoriler: [kategori] } : {}),
    });
    const birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yapan, birim, { satisFiyati: satis });
    await stok.stokDuzelt(vt, yapan, birim, {
      yeniMiktar: miktar,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return urun;
  };
  const yayinda = await ac(`Deneme ${ek} Yayında`, "yayinda", 90_000, 40);
  const taslak = await ac(`Deneme ${ek} Taslak`, "taslak", 10_000, 1);
  return {
    ek,
    kategori,
    yayinda,
    taslak,
    sil: async () => {
      for (const urun of [yayinda, taslak])
        await servis.urunSil(vt, yapan, urun).catch(() => undefined);
      await kategoriSil(vt, yapan, kategori).catch(() => undefined);
    },
  };
};

const ara = async (page: Page, metni: string) => {
  const kutu = page.getByRole("searchbox", { name: metin("yonetim.urunler.ara") });
  await kutu.focus();
  await page.keyboard.type(metni);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`ara=${metni}`));
  await sayfaHazir(page);
};

const tabloSatirlari = (page: Page) =>
  page.getByRole("table", { name: metin("yonetim.urunler.liste") }).getByRole("row");

test("mağaza sahibi klavyeyle arar, süzer, sıralar ve onayla arşive alır; vitrinde gör yalnız açılan üründe", async ({
  page,
}) => {
  const deneme = await urunleriAc();
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yonetici);
    const bag = page
      .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
      .getByRole("link", { name: metin("yonetim.sayfa.urunler.ad"), exact: true });
    await bag.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${urunlerAdresi}$`));
    await sayfaHazir(page);

    await ara(page, deneme.ek);
    const satirlar = tabloSatirlari(page);
    // Başlık satırı ve iki ürün.
    await expect(satirlar).toHaveCount(3);

    // Vitrinde gör: yalnız yayındaki üründe, yeni sekmede ürünün sayfası.
    const yayindaSatiri = satirlar.filter({ hasText: `Deneme ${deneme.ek} Yayında` });
    const taslakSatiri = satirlar.filter({ hasText: `Deneme ${deneme.ek} Taslak` });
    const vitrinde = yayindaSatiri.getByRole("link", {
      name: doldur(metin("yonetim.urunler.vitrindeGorAdi"), { ad: `Deneme ${deneme.ek} Yayında` }),
    });
    await expect(vitrinde).toHaveAttribute("target", "_blank");
    const servis = calisanSiteninUrunServisi();
    const adresAdi = (await servis.urunuOku(vt, deneme.yayinda))?.adresAdi ?? "";
    await expect(vitrinde).toHaveAttribute("href", kayitAdresleri.urun(adresAdi));
    await expect(taslakSatiri.getByRole("link", { name: /Vitrinde gör/ })).toHaveCount(0);
    await expect(taslakSatiri).toContainText(metin("yonetim.urunler.durum.taslak"));
    await expect(taslakSatiri).toContainText(
      doldur(metin("yonetim.urunler.stok.az"), {
        adet: doldur(metin("yonetim.urunler.stok.adet"), { sayi: "1" }),
      }),
    );

    // Durum süzgeci klavyeyle: menü açılır, "Taslak" boşlukla işaretlenir, adres değişir; şeritten kaldırılır.
    const durumDugmesi = page.getByRole("button", { name: metin("yonetim.urunler.suzgec.durum") });
    await durumDugmesi.focus();
    await page.keyboard.press("Enter");
    const taslakSecenegi = page.getByRole("menuitemcheckbox", {
      name: metin("yonetim.urunler.durum.taslak"),
    });
    await expect(taslakSecenegi).toBeVisible();
    await taslakSecenegi.focus();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/durum=taslak/);
    await page.keyboard.press("Escape");
    await sayfaHazir(page);
    await expect(satirlar).toHaveCount(2);
    const cip = page.getByRole("link", {
      name: doldur(metin("yonetim.liste.suzgeciKaldir"), {
        ad: `${metin("yonetim.urunler.suzgec.durum")}: ${metin("yonetim.urunler.durum.taslak")}`,
      }),
    });
    await cip.focus();
    await page.keyboard.press("Enter");
    await expect(page).not.toHaveURL(/durum=/);
    await sayfaHazir(page);
    await expect(satirlar).toHaveCount(3);

    // Kategori süzgeci (sitenin kayıtlarından, kart 0262): adres kimliği taşır, şeritte kategorinin adı yazar.
    await page.getByRole("button", { name: metin("yonetim.urunler.suzgec.kategori") }).focus();
    await page.keyboard.press("Enter");
    const kategoriSecenegi = page.getByRole("menuitemcheckbox", {
      name: `Deneme ${deneme.ek} Kategori`,
      exact: true,
    });
    await kategoriSecenegi.focus();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(new RegExp(`kategori=${deneme.kategori}`));
    await page.keyboard.press("Escape");
    await sayfaHazir(page);
    await expect(satirlar).toHaveCount(2);
    await expect(satirlar.nth(1)).toContainText(`Deneme ${deneme.ek} Yayında`);
    const kategoriCipi = page.getByRole("link", {
      name: doldur(metin("yonetim.liste.suzgeciKaldir"), {
        ad: `${metin("yonetim.urunler.suzgec.kategori")}: Deneme ${deneme.ek} Kategori`,
      }),
    });
    await kategoriCipi.focus();
    await page.keyboard.press("Enter");
    await expect(page).not.toHaveURL(/kategori=/);
    await sayfaHazir(page);
    await expect(satirlar).toHaveCount(3);

    // Fiyat sütunu başlığıyla sıralama: önce azalan, sonra artan.
    const fiyatBasligi = page.getByRole("link", { name: metin("yonetim.urunler.sutun.fiyat") });
    await fiyatBasligi.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/sirala=fiyat-azalan/);
    await sayfaHazir(page);
    await expect(satirlar.nth(1)).toContainText(`Deneme ${deneme.ek} Yayında`);
    await page.getByRole("link", { name: metin("yonetim.urunler.sutun.fiyat") }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/sirala=fiyat-artan/);
    await sayfaHazir(page);
    await expect(satirlar.nth(1)).toContainText(`Deneme ${deneme.ek} Taslak`);

    // Satır boşlukla seçilir; toplu işlem çubuğundan "Arşive al", onay penceresinde Tab ile onay, sonuç odakta.
    const sec = page.getByRole("checkbox", {
      name: doldur(metin("yonetim.liste.satiriSec"), { ad: `Deneme ${deneme.ek} Taslak` }),
    });
    await sec.focus();
    await page.keyboard.press("Space");
    const cubuk = page.getByRole("region", { name: metin("yonetim.liste.topluIslem") });
    await expect(cubuk).toBeVisible();
    await cubuk.getByRole("button", { name: metin("yonetim.urunler.toplu.arsive-al.ad") }).focus();
    await page.keyboard.press("Enter");
    const onay = page.getByRole("alertdialog", {
      name: doldur(metin("yonetim.urunler.toplu.arsive-al.baslik"), { sayi: "1" }),
    });
    await expect(onay.getByRole("button", { name: metin("ortak.islem.vazgec") })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    const sonuc = page.getByText(
      doldur(metin("yonetim.urunler.toplu.arsive-al.basari"), { sayi: "1" }),
    );
    await expect(sonuc).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.textContent ?? ""))
      .toContain(doldur(metin("yonetim.urunler.toplu.arsive-al.basari"), { sayi: "1" }));
    await expect.poll(async () => (await servis.urunuOku(vt, deneme.taslak))?.durum).toBe("arsiv");
    await expect(taslakSatiri).toContainText(metin("yonetim.urunler.durum.arsiv"));
  } finally {
    await deneme.sil();
  }
});

// Her renk ve genişlik ayrı testtir (menüler ekranıyla aynı: altısı tek testte süre sınırını zorlardı).
for (const renk of ["light", "dark"] as const) {
  for (const { ad, width, height } of genislikler) {
    test(`${renk} ${ad}: liste, açık süzgeç menüsü ve toplu işlem çubuğu taramadan geçer, yana kaymaz`, async ({
      page,
    }) => {
      const deneme = await urunleriAc();
      try {
        const hatalar = konsoluDinle(page, {
          // Ortak yerel veritabanında görsel dosyaları olmayabilir (panel önizlemesi 404).
          haric: (ileti) => ileti.includes("status of 404"),
        });
        await page.emulateMedia({ colorScheme: renk });
        await page.setViewportSize({ width, height });
        await paneleGir(page, yonetici);
        await page.goto(urunlerAdresi);
        await sayfaHazir(page);
        await tara(page, "bütün liste");
        expect(await yanaKayma(page)).toBe(0);
        await ara(page, deneme.ek);
        await page.getByRole("button", { name: metin("yonetim.urunler.suzgec.stok") }).click();
        await expect(
          page.getByRole("menuitemcheckbox", { name: metin("yonetim.urunler.stokSuzgeci.dusuk") }),
        ).toBeVisible();
        await tara(page, "stok süzgeci açık");
        await page.keyboard.press("Escape");
        await page
          .getByRole("checkbox", {
            name: doldur(metin("yonetim.liste.satiriSec"), { ad: `Deneme ${deneme.ek} Taslak` }),
          })
          .click();
        await expect(
          page.getByRole("region", { name: metin("yonetim.liste.topluIslem") }),
        ).toBeVisible();
        await tara(page, "toplu işlem çubuğu");
        expect(await yanaKayma(page)).toBe(0);
        expect(hatalar).toEqual([]);
      } finally {
        await deneme.sil();
      }
    });
  }
}
