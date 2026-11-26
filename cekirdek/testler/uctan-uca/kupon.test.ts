// Kupon gerçek tarayıcıda (kart 0312, karar 0185). Test kendi ürününü (200,00, vergisiz) ve kuponlarını açar; sonunda
// ürünü ve kuponları siler (kuponun silinmesi işaretledir; siparişe bağlı kullanım kalır).
// - Sepet sayfasında kupon klavyeyle yazılır ve Enter ile uygulanır. Olmayan kod ve en az tutarı tutmayan kupon nedeniyle
//   geçmez: neden alanın altında yazar, alana bağlıdır, alan hatalıdır, odak alanda kalır. Geçen kupon (küçük harfle yazılmış) kodu ve
//   "Kaldır" ile durur, özette "Kupon (KOD) −20,00" ve indirimli toplam görünür. Kaldırınca odak alana geçer, toplam
//   eski hâline döner. Hatalı ve kuponlu sepet iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata
//   yok.
// - Ödeme adımının özetinde kupon satırı ve indirimli toplam durur; üye olmayan müşteri siparişi verir, sipariş kuponla
//   kurulur, sipariş alındı sayfası kupon satırını gösterir, sepetin kuponu silinir.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { and, eq, inArray, sql } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { sepetDepoAnahtari, sepetKuponAnahtari } from "../../kayitlar/sepet";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { kuponlar } from "../../moduller/kampanya/model";
import { kuponServisi } from "../../moduller/kampanya/servis";
import { odemeOturumlari } from "../../moduller/odeme/model";
import { siparisler } from "../../moduller/siparis/model";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = sistemIslemi("tarayici-testi");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;
const bicim = () => siteninBicimleyicisi(calisanSite().ayarlar);

let vt: Veritabani;
const ek = randomUUID().slice(0, 8);
const kod = `KUPON${ek.toUpperCase()}`;
const enAzKodu = `ENAZ${ek.toUpperCase()}`;
const enAzTutar = 50_000;
let birim = "";
const epostalar: string[] = [];
const temizlik: (() => Promise<unknown>)[] = [];

// Ödeme ucu sıkı sınırlıdır (dakikada 5, istemci başına): bu dosya kendi istemci adresiyle gider, paralel çalışan ödeme
// testlerinin sınırını doldurmaz.
test.beforeEach(({ page }) =>
  page.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`,
  }),
);

test.beforeAll(async () => {
  vt = baglan(veritabaniAdresi());
  const servis = calisanSiteninUrunServisi();
  const kimlik = await servis.urunEkle(vt, yapan, {
    ad: `Kupon deneme ${ek}`,
    adresAdi: `kupon-deneme-${ek}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  temizlik.push(() => servis.urunSil(vt, yapan, kimlik));
  birim = (await servis.urunuOku(vt, kimlik))?.birimler[0]?.kimlik ?? "";
  await calisanSiteninFiyatServisi().fiyatYaz(vt, yapan, birim, { satisFiyati: 20_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 20,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const kupon = kuponServisi(calisanSite());
  await vt.transaction(async (islem) => {
    await kupon.ekle(islem, yapan, { kod, tur: "yuzde", deger: 10, kapsam: "hepsi" });
    await kupon.ekle(islem, yapan, {
      kod: enAzKodu,
      tur: "yuzde",
      deger: 10,
      kapsam: "hepsi",
      enAzTutar,
    });
  });
  temizlik.push(() =>
    vt
      .update(kuponlar)
      .set({ silinme_zamani: sql`now()` })
      .where(inArray(kuponlar.kod, [kod, enAzKodu])),
  );
  // Siparişe dönmeyen oturumlar ürünü silmeden önce gider (ayırmalar birime ve kupona bağlıdır).
  temizlik.push(() =>
    vt
      .delete(odemeOturumlari)
      .where(
        and(
          inArray(odemeOturumlari.eposta, epostalar),
          sql`not exists (select 1 from ${siparisler} where ${siparisler.oturum_kimligi} = ${odemeOturumlari.kimlik})`,
        ),
      ),
  );
});
test.afterAll(async () => {
  for (const adim of temizlik.reverse()) await adim();
  await vt.$client.end();
});

// Sepet sayfa açılırken bir kez kurulur (sayfa yenilense de yeniden yazılmaz).
const sepetiKur = async (page: Page, kupon?: string) => {
  await page.addInitScript(
    ([kalemAnahtari, kalemler, kuponAnahtari, kuponKodu, isaret]) => {
      if (window.sessionStorage.getItem(isaret) !== null) return;
      window.sessionStorage.setItem(isaret, "1");
      window.localStorage.setItem(kalemAnahtari, kalemler);
      if (kuponKodu !== "") window.localStorage.setItem(kuponAnahtari, kuponKodu);
    },
    [
      sepetDepoAnahtari,
      JSON.stringify([{ birim, adet: 1 }]),
      sepetKuponAnahtari,
      kupon ?? "",
      `sepet-kuruldu-${randomUUID()}`,
    ] as const,
  );
};

const yanaKaymaz = async (page: Page, ne: string) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ne,
  ).toBe(true);

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.width}`);
      await yanaKaymaz(page, `${ne} ${renk} ${boyut.width}`);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

const kuponuYaz = async (page: Page, yazi: string) => {
  const alan = page.getByLabel(metin("vitrin.sepet.kupon.alan"), { exact: true });
  await alan.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(yazi);
  await page.keyboard.press("Enter");
  return alan;
};

test("sepette kupon klavyeyle: geçmeyen kuponun nedeni alana bağlı, geçen kupon özette, kaldırınca odak alana", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  await sepetiKur(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(vitrinAdresleri.sepet);
  await sayfaHazir(page);
  const ozet = page.getByRole("region", { name: metin("vitrin.sepet.ozet") });
  await expect(ozet.getByText(bicim().para(20_000)).first()).toBeVisible();

  const yok = `YOK${ek.toUpperCase()}`;
  const alan = await kuponuYaz(page, yok);
  const bulunamadi = doldur(metin("vitrin.sepet.kupon.neden.bulunamadi"), { kod: yok });
  await expect(page.getByText(bulunamadi)).toBeVisible();
  await expect(alan).toHaveAttribute("aria-invalid", "true");
  await expect(alan).toHaveAccessibleDescription(bulunamadi);
  // Alan yeniden kurulmaz: Enter'a basan müşterinin odağı alanda kalır (bağımsız kontrolün bulgusu).
  await expect(alan).toBeFocused();

  await kuponuYaz(page, enAzKodu);
  const enAz = doldur(metin("vitrin.sepet.kupon.neden.en-az"), {
    kod: enAzKodu,
    kalan: bicim().para(enAzTutar - 20_000),
  });
  await expect(alan).toHaveAccessibleDescription(enAz);
  await ikiRenkUcGenislik(page, "geçmeyen kuponlu sepet");

  // Küçük harfle yazılan kod kuponun kendi yazılışıyla uygulanır: 200,00 − 20,00 = 180,00.
  await kuponuYaz(page, kod.toLowerCase());
  const kaldir = page.getByRole("button", {
    name: doldur(metin("vitrin.sepet.kupon.kaldir"), { kod }),
  });
  await expect(kaldir).toBeVisible();
  await expect(
    page.getByText(doldur(metin("vitrin.sepet.kupon.uygulandi"), { kod })),
  ).toBeVisible();
  await expect(ozet.getByText(doldur(metin("vitrin.sepet.kupon.ozet"), { kod }))).toBeVisible();
  await expect(
    ozet.getByText(doldur(metin("vitrin.sepet.kupon.indirim"), { tutar: bicim().para(2_000) })),
  ).toBeVisible();
  await expect(ozet.getByText(bicim().para(18_000)).first()).toBeVisible();
  await ikiRenkUcGenislik(page, "kuponlu sepet");

  await kaldir.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel(metin("vitrin.sepet.kupon.alan"), { exact: true })).toBeFocused();
  await expect(ozet.getByText(doldur(metin("vitrin.sepet.kupon.ozet"), { kod }))).toHaveCount(0);
  await expect(ozet.getByText(bicim().para(18_000))).toHaveCount(0);
  expect(
    await page.evaluate((anahtar) => window.localStorage.getItem(anahtar), sepetKuponAnahtari),
  ).toBeNull();
  expect(hatalar).toEqual([]);
});

test("ödeme özetinde kupon satırı; sipariş kuponla kurulur, sipariş alındı sayfası kuponu gösterir", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const hatalar = konsoluDinle(page, { haric: (m) => m.includes("401") });
  const eposta = `kupon-${ek}@ornek.test`;
  epostalar.push(eposta);
  await sepetiKur(page, kod);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(vitrinAdresleri.odeme);
  await sayfaHazir(page);
  const onayDugmesi = page.getByRole("button", { name: metin("vitrin.odeme.onayla") });
  await expect(onayDugmesi).not.toHaveAttribute("aria-disabled", "true");
  const kuponSatiri = page.getByText(doldur(metin("vitrin.sepet.kupon.ozet"), { kod }));
  await expect(kuponSatiri.last()).toBeVisible();
  await expect(page.getByText(bicim().para(18_000)).last()).toBeVisible();

  await page.getByLabel(metin("vitrin.odeme.eposta"), { exact: true }).fill(eposta);
  await page.getByLabel(metin("vitrin.odeme.ad"), { exact: true }).fill("Deniz");
  await page.getByLabel(metin("vitrin.odeme.soyad"), { exact: true }).fill("Yılmaz");
  await page.getByLabel(metin("vitrin.odeme.telefon"), { exact: true }).fill("0555 000 00 00");
  for (const [etiket, deger, yazilan] of [
    [metin("vitrin.odeme.il"), "Ankara", "Ankara"],
    [metin("vitrin.odeme.ilce"), "Altındağ", "Alt"],
  ] as const) {
    const tetikleyici = page.getByRole("combobox", { name: etiket, exact: true });
    await tetikleyici.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.type(yazilan);
    await expect(page.getByRole("option", { name: deger, exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    // Seçim yerleşmeden yazılan adres, ilçe değişince yeniden çizilen alanda kaybolur.
    await expect(tetikleyici).toContainText(deger);
  }
  await page
    .getByLabel(metin("vitrin.odeme.adres"), { exact: true })
    .fill("Atatürk Bulvarı No: 10 Daire 3");
  await page.getByLabel(metin("vitrin.odeme.postaKodu"), { exact: true }).fill("06420");
  for (const etiket of [
    metin("vitrin.odeme.onBilgilendirmeOnayi"),
    metin("vitrin.odeme.mesafeliSatisOnayi"),
  ]) {
    const kutu = page.getByRole("checkbox", { name: etiket, exact: true });
    await kutu.focus();
    await page.keyboard.press("Space");
    await expect(kutu).toBeChecked();
  }
  await onayDugmesi.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${vitrinAdresleri.siparisAlindi}$`));
  await sayfaHazir(page);
  await expect(page.getByText(doldur(metin("vitrin.sepet.kupon.ozet"), { kod }))).toBeVisible();

  const [siparis] = await vt.select().from(siparisler).where(eq(siparisler.eposta, eposta));
  expect(siparis).toMatchObject({ kupon_kodu: kod, kupon_indirimi: 2_000, toplam: 18_000 });
  expect(
    await page.evaluate((anahtar) => window.localStorage.getItem(anahtar), sepetKuponAnahtari),
  ).toBeNull();
  expect(hatalar).toEqual([]);
});
