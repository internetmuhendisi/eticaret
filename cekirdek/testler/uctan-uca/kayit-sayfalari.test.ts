// Kategori, marka, etiket ve ürün sayfasının iskeleti gerçek tarayıcıda (kart 0135, karar 0103): sitenin kurulu
// kataloğundaki kayıtlar (her türden ilki, veritabanından okunur) kendi adresinde üst ve alt kısımla, sayfa yoluyla ve başlıkla açılır; sekme
// başlığı "<kayıt> | <mağaza>" kalıbındadır; iki renkte ve üç genişlikte taramadan geçer, yana kaymaz. Olmayan
// adres, kalıba uymayan ad ve sayfası açılmayan ürün 404 alır. Adı değişen kaydın eski adresi gerçek istekte
// kalıcı yönlendirme (308) alır, sorgu kısmı korunur.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { AdresliKayitTuru } from "../../kayitlar/adres";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { etiketServisi } from "../../moduller/etiket/servis";
import {
  kategoriDegistir,
  kategoriEkle,
  kategorileriOku,
  kategoriSil,
} from "../../moduller/kategori/servis";
import { magazaninAdi } from "../../moduller/magaza-ayarlari/servis";
import { markaServisi } from "../../moduller/marka/servis";
import { urunler } from "../../moduller/urun/model";
import { urunServisi } from "../../moduller/urun/servis";
import { vitrinKosulu } from "../../moduller/urun/vitrin";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { sayfaHazir } from "./sayfa-hazir";

if (existsSync(".env")) process.loadEnvFile(".env");

type Kayit = { adresAdi: string; ad: string };

// Sitenin kurulu kataloğundan her türün ilk kaydı; ürün yalnız sayfası açılanlardan. Site adı ve ürün adı
// çekirdeğin testine yazılmaz (cekirdek/testler/site-adi-yok.test.ts).
const ilkKayit = async (vt: Veritabani, tur: AdresliKayitTuru): Promise<Kayit> => {
  const kayitlar: Kayit[] =
    tur === "kategori"
      ? await kategorileriOku(vt)
      : tur === "marka"
        ? await markaServisi.hepsiniOku(vt)
        : tur === "etiket"
          ? await etiketServisi.hepsiniOku(vt)
          : await vt
              .select({ ad: urunler.ad, adresAdi: urunler.adres_adi })
              .from(urunler)
              .where(vitrinKosulu("sayfa", { tukenenUrun: "goster" }))
              .orderBy(urunler.adres_adi)
              .limit(1);
  const [kayit] = kayitlar;
  if (kayit === undefined) throw new Error(`Sitenin kataloğunda ${tur} yok.`);
  return { ad: kayit.ad, adresAdi: kayit.adresAdi };
};

const turler = [
  "kategori",
  "marka",
  "etiket",
  "urun",
] as const satisfies readonly AdresliKayitTuru[];

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

const veritabani = () => baglan(veritabaniAdresi());

for (const tur of turler) {
  test(`${tur}: sayfa yolu, başlık ve sekme başlığıyla açılır, iki renkte ve üç genişlikte taramadan geçer`, async ({
    page,
  }) => {
    const vt = veritabani();
    const [magaza, { adresAdi, ad }] = await Promise.all([
      magazaninAdi(vt, calisanSite()),
      ilkKayit(vt, tur),
    ]).finally(() => vt.$client.end());
    for (const renk of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: renk });
      for (const genislik of genislikler) {
        await page.setViewportSize(genislik);
        const yanit = await page.goto(kayitAdresleri[tur](adresAdi));
        await sayfaHazir(page);
        expect(yanit?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(ad);
        await expect(page).toHaveTitle(
          doldur(metin("vitrin.sayfaBilgisi.kalip"), { baslik: ad, magaza }),
        );
        const yol = page.getByRole("navigation", { name: metin("ortak.parca.sayfaYolu") });
        // Ürün sayfasının yolunda ürünün kategorisi de vardır (kart 0138); öteki sayfalarda yalnız ana sayfa.
        if (tur === "urun") {
          await expect(yol.getByRole("link").first()).toHaveText(metin("vitrin.sayfa.anasayfa"));
        } else {
          await expect(yol.getByRole("link")).toHaveText([metin("vitrin.sayfa.anasayfa")]);
        }
        await expect(yol.locator('[aria-current="page"]')).toHaveText(ad);
        // Üst ve alt kısım çerçevedendir.
        await expect(page.locator("header").first()).toBeVisible();
        await expect(page.locator("footer").first()).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        ).toBe(0);
        await tara(page, `${tur}, ${renk}, ${genislik.width}`);
      }
    }
  });
}

test("olmayan, kalıba uymayan ve sayfası açılmayan kaydın adresi 404 alır", async ({ request }) => {
  const vt = veritabani();
  const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;
  const urunSrv = urunServisi(() => calisanSite().ayarlar.saatDilimi);
  const ek = randomUUID().slice(0, 8);
  const taslak = await urunSrv.urunEkle(vt, yapan, {
    ad: `Deneme taslak ${ek}`,
    adresAdi: `deneme-taslak-${ek}`,
    vergiSinifi: null,
    durum: "taslak",
  });
  try {
    for (const adres of [
      kayitAdresleri.kategori(`olmayan-${ek}`),
      kayitAdresleri.marka("Buyuk-Harfli"),
      kayitAdresleri.etiket("bosluklu%20ad"),
      kayitAdresleri.urun(`deneme-taslak-${ek}`),
    ]) {
      const yanit = await request.get(adres, { maxRedirects: 0 });
      expect(yanit.status(), adres).toBe(404);
    }
  } finally {
    await urunSrv.urunSil(vt, yapan, taslak).finally(() => vt.$client.end());
  }
});

test("adı değişen kaydın eski adresi bugünkü adrese kalıcı olarak yönlenir, sorgu kısmı korunur", async ({
  request,
}) => {
  const vt = veritabani();
  const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;
  const ek = randomUUID().slice(0, 8);
  const kimlik = await kategoriEkle(vt, yapan, {
    ad: `Deneme ${ek}`,
    adresAdi: `deneme-${ek}`,
  });
  try {
    await kategoriDegistir(vt, yapan, kimlik, { adresAdi: `deneme-yeni-${ek}` });
    const yanit = await request.get(`${kayitAdresleri.kategori(`deneme-${ek}`)}?sayfa=2`, {
      maxRedirects: 0,
    });
    expect(yanit.status()).toBe(308);
    expect(yanit.headers()["location"]).toBe(
      `${kayitAdresleri.kategori(`deneme-yeni-${ek}`)}?sayfa=2`,
    );
    expect((await request.get(kayitAdresleri.kategori(`deneme-yeni-${ek}`))).status()).toBe(200);
  } finally {
    await kategoriSil(vt, yapan, kimlik).finally(() => vt.$client.end());
  }
});
