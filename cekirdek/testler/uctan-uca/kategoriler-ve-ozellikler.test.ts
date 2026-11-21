// Panelin kategoriler, markalar ve etiketler, özellikler ekranları gerçek tarayıcıda ve gerçek veritabanıyla
// (kart 0261, karar 0160): mağaza sahibi menüden klavyeyle gelir; kategori ekler (boş adda alanın hatası ve odak),
// alt kategori ekler, sıralar (yukarı al), satır menüsünden başka kategorinin altına taşır ve en üste çıkarır, onay
// penceresiyle siler (pencere üste çıkacak alt kategoriyi söyler, Vazgeç silmez, odak komşu satıra geçer) ve
// kategori vitrinde kendi sayfasıyla açılır. Marka ve etiket eklenir, düzenlenir, onayla silinir. Özellik liste
// türünde seçenekleriyle eklenir, düzenlenirken seçenek eklenir, adı değişir ve sıralanır; ürünlerde değeri olan
// özelliğin türü seçilemez. Ekranlar, formlar ve onay pencereleri iki renkte ve üç genişlikte taramadan geçer, yana
// kaymaz, konsolda hata yoktur.
//
// Kategoriler, markalar ve özellikler sitenin paylaşılan verisidir: test kendi kayıtlarını ("Deneme <6 onaltılık>")
// açar ve sonunda kaldırır; yarıda kalan eski çalışmanın kayıtları testlerden önce kaldırılır.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { etiketServisi } from "../../moduller/etiket/servis";
import { kategoriEkle, kategorileriOku, kategoriSil } from "../../moduller/kategori/servis";
import { markaServisi } from "../../moduller/marka/servis";
import { ozellikServisi } from "../../moduller/ozellik/servis";
import { urunServisi } from "../../moduller/urun/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, type DenemeYoneticisi, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const kim = sistemIslemi("uctan-uca-kategoriler");
const adresler = {
  kategoriler: "/yonetim/kategoriler",
  markalar: "/yonetim/markalar",
  ozellikler: "/yonetim/ozellikler",
} as const;

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

const denemeKalibi = /^Deneme [0-9a-f]{6}/;
const denemeAdi = () => `Deneme ${randomBytes(3).toString("hex")}`;

// Testin kayıtlarını kaldırır: adı deneme kalıbına uyan kategori (altları önce), marka, etiket ve özellik.
const denemeleriSil = async () => {
  const kategoriler = (await kategorileriOku(vt)).filter((k) => denemeKalibi.test(k.ad));
  for (const kategori of kategoriler.toReversed()) {
    await kategoriSil(vt, kim, kategori.kimlik).catch(() => undefined);
  }
  for (const servis of [markaServisi, etiketServisi]) {
    for (const grup of await servis.hepsiniOku(vt)) {
      if (denemeKalibi.test(grup.ad)) await servis.sil(vt, kim, grup.kimlik).catch(() => undefined);
    }
  }
  for (const ozellik of await ozellikServisi.hepsiniOku(vt)) {
    if (denemeKalibi.test(ozellik.ad)) {
      await ozellikServisi.sil(vt, kim, ozellik.kimlik).catch(() => undefined);
    }
  }
};

let yonetici: DenemeYoneticisi;
test.beforeAll(denemeleriSil);
test.beforeEach(({ page }) => {
  yonetici = yoneticiAc();
  return ayriBaglanti(page);
});
test.afterAll(async () => {
  await denemeleriSil();
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

const ekleDugmesi = (page: Page, ne: Parameters<typeof metin>[0]) =>
  page.getByRole("button", {
    name: doldur(metin("yonetim.eylem.ekle"), { ne: metin(ne) }),
    exact: true,
  });

const sayfayaGit = async (page: Page, adres: string) => {
  await page.goto(adres);
  await sayfaHazir(page);
};

test("kategori: menüden gelinir, eklenir, alt kategori eklenir, sıralanır, taşınır, onayla silinir; vitrinde açılır", async ({
  page,
  context,
}) => {
  const ust = denemeAdi();
  const birinci = denemeAdi();
  const ikinci = denemeAdi();
  // Kardeşler servisle hazırlanır: sıralama yalnız testin kendi kategorileri arasında yapılır.
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yonetici);
  const bag = page
    .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
    .getByRole("link", { name: metin("yonetim.sayfa.kategoriler.ad") });
  await bag.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(adresler.kategoriler));
  await sayfaHazir(page);

  // Boş adla kaydetmek alanın altında hata verir, odak alana gider.
  const ekle = ekleDugmesi(page, "yonetim.kategori.kategori");
  await ekle.focus();
  await page.keyboard.press("Enter");
  const form = page.getByRole("dialog", { name: metin("yonetim.kategori.form.yeni") });
  const ad = form.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true });
  await form.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
  await expect(ad).toBeFocused();
  await expect(ad).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.type(ust);
  await page.keyboard.press("Enter");
  await expect(bildirim(page, "yonetim.kategori.eklendi")).toBeVisible();
  await expect(form).toHaveCount(0);
  const ustKimligi = (await kategorileriOku(vt)).find((k) => k.ad === ust)?.kimlik ?? "";
  expect(ustKimligi).not.toBe("");
  await kategoriEkle(vt, kim, { ad: birinci, ust: ustKimligi });

  // Alt kategori formdaki "Üst kategori" seçimiyle eklenir.
  await ekle.click();
  await form.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true }).fill(ikinci);
  await form.getByRole("combobox", { name: metin("yonetim.kategori.form.ust") }).click();
  await page.getByRole("option", { name: ust, exact: true }).click();
  await form.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
  await expect(form).toHaveCount(0);
  const altListe = page.getByRole("list", {
    name: doldur(metin("yonetim.kategori.altListeEtiketi"), { ad: ust }),
  });
  await expect(altListe.getByText(ikinci, { exact: true })).toBeVisible();
  // Satırın "Alt kategori ekle" düğmesi formu üstü seçili açar.
  await page
    .getByRole("button", { name: doldur(metin("yonetim.kategori.altKategoriEkle"), { ad: ust }) })
    .click();
  await expect(
    form.getByRole("combobox", { name: metin("yonetim.kategori.form.ust") }),
  ).toContainText(ust);
  await page.keyboard.press("Escape");
  await expect(form).toHaveCount(0);
  const altlari = async () =>
    (await kategorileriOku(vt)).filter((k) => k.ust === ustKimligi).map((k) => k.ad);
  expect(await altlari()).toEqual([birinci, ikinci]);

  // Yukarı al: ikinci birincinin önüne geçer.
  await altListe
    .getByRole("button", { name: doldur(metin("ortak.parca.siralama.yukari"), { ad: ikinci }) })
    .click();
  await expect.poll(altlari).toEqual([ikinci, birinci]);

  // Satır menüsünden: birinci ikincinin altına taşınır, sonra en üste çıkar.
  const menuyuAc = async (adi: string) => {
    await page
      .getByRole("button", { name: doldur(metin("yonetim.kategori.diger"), { ad: adi }) })
      .click();
  };
  await menuyuAc(birinci);
  await page.getByRole("menuitem", { name: metin("yonetim.kategori.altinaTasi") }).click();
  await page.getByRole("menuitem", { name: `${ust} › ${ikinci}` }).click();
  await expect(bildirim(page, "yonetim.kategori.tasindi")).toBeVisible();
  await expect.poll(altlari).toEqual([ikinci]);
  await menuyuAc(birinci);
  await page.getByRole("menuitem", { name: metin("yonetim.kategori.enUsteCikar") }).click();
  await expect
    .poll(async () => (await kategorileriOku(vt)).find((k) => k.ad === birinci)?.ust)
    .toBeNull();

  // Vitrinde kategori kendi sayfasıyla açılır.
  const adresAdi = (await kategorileriOku(vt)).find((k) => k.ad === ust)?.adresAdi ?? "";
  const vitrin = await context.newPage();
  const yanit = await vitrin.goto(kayitAdresleri.kategori(adresAdi));
  expect(yanit?.status()).toBe(200);
  await vitrin.close();

  // Onayla silme: pencere üste çıkacak alt kategoriyi söyler; Vazgeç silmez, Sil siler, odak komşu satıra geçer.
  const sil = async () => {
    await page
      .getByRole("button", { name: doldur(metin("yonetim.kategori.diger"), { ad: ust }) })
      .focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("End");
    await expect(page.getByRole("menuitem", { name: metin("yonetim.kategori.sil") })).toBeFocused();
    await page.keyboard.press("Enter");
    return page.getByRole("alertdialog", {
      name: doldur(metin("yonetim.kategori.silOnay.baslik"), { ad: ust }),
    });
  };
  let onay = await sil();
  await expect(onay).toContainText(doldur(metin("yonetim.kategori.silOnay.altlar"), { sayi: "1" }));
  await expect(onay.getByRole("button", { name: metin("ortak.islem.vazgec") })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(onay).toHaveCount(0);
  onay = await sil();
  await onay.getByRole("button", { name: metin("yonetim.kategori.sil") }).click();
  await expect(bildirim(page, "yonetim.kategori.silindi")).toBeVisible();
  await expect
    .poll(async () => (await kategorileriOku(vt)).find((k) => k.ad === ikinci)?.ust)
    .toBeNull();
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.closest("[data-anahtar]") !== null))
    .toBe(true);
});

test("marka ve etiket eklenir, düzenlenir, onayla silinir", async ({ page }) => {
  const marka = denemeAdi();
  const etiket = denemeAdi();
  await paneleGir(page, yonetici);
  await sayfayaGit(page, adresler.markalar);
  const markalar = page.getByRole("region", { name: metin("yonetim.marka.liste") });

  await ekleDugmesi(page, "yonetim.marka.tek").click();
  let form = page.getByRole("dialog", { name: metin("yonetim.marka.form.yeni") });
  await form.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true }).fill(marka);
  await form.getByLabel(metin("yonetim.kategori.form.aciklama"), { exact: true }).fill("Üretici");
  await form.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
  await expect(bildirim(page, "yonetim.marka.eklendi")).toBeVisible();
  await expect(markalar.getByText(marka, { exact: true })).toBeVisible();

  await markalar
    .getByRole("button", { name: doldur(metin("yonetim.kategori.duzenle"), { ad: marka }) })
    .click();
  form = page.getByRole("dialog", { name: metin("yonetim.marka.form.duzenle") });
  await expect(
    form.getByLabel(metin("yonetim.kategori.form.aciklama"), { exact: true }),
  ).toHaveValue("Üretici");
  await form
    .getByLabel(metin("yonetim.kategori.form.adresAdi"), { exact: true })
    .fill(`yeni-${marka.slice(-6)}`);
  await form.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
  await expect(markalar.getByText(`/marka/yeni-${marka.slice(-6)}`)).toBeVisible();

  await ekleDugmesi(page, "yonetim.etiket.tek").click();
  form = page.getByRole("dialog", { name: metin("yonetim.etiket.form.yeni") });
  // Etiketin açıklaması ve logosu yoktur.
  await expect(
    form.getByLabel(metin("yonetim.kategori.form.aciklama"), { exact: true }),
  ).toHaveCount(0);
  await form.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true }).fill(etiket);
  await form.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true }).press("Enter");
  const etiketler = page.getByRole("region", { name: metin("yonetim.etiket.liste") });
  await expect(etiketler.getByText(etiket, { exact: true })).toBeVisible();

  await markalar
    .getByRole("button", { name: doldur(metin("yonetim.kategori.silAdli"), { ad: marka }) })
    .click();
  const onay = page.getByRole("alertdialog", {
    name: doldur(metin("yonetim.marka.silOnay.baslik"), { ad: marka }),
  });
  await onay.getByRole("button", { name: metin("yonetim.kategori.sil") }).click();
  await expect(bildirim(page, "yonetim.marka.silindi")).toBeVisible();
  await expect(markalar.getByText(marka, { exact: true })).toHaveCount(0);
});

test("özellik seçenekleriyle eklenir, düzenlenirken seçenek eklenir ve sıralanır; değeri olanın türü seçilemez", async ({
  page,
}) => {
  const ozellik = denemeAdi();
  await paneleGir(page, yonetici);
  await sayfayaGit(page, adresler.ozellikler);

  await ekleDugmesi(page, "yonetim.ozellik.tek").click();
  const yeni = page.getByRole("dialog", { name: metin("yonetim.ozellik.form.yeni") });
  await yeni.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true }).fill(ozellik);
  // Liste türü varsayılandır; ilk seçenek alanı hazırdır, ikincisi "Seçenek ekle" ile.
  const secenek = (form: typeof yeni, sira: number) =>
    form.getByLabel(doldur(metin("yonetim.ozellik.form.secenekSirasi"), { sira: String(sira) }), {
      exact: true,
    });
  await secenek(yeni, 1).fill("Pamuk");
  await yeni.getByRole("button", { name: metin("yonetim.ozellik.form.secenekEkle") }).click();
  await expect(secenek(yeni, 2)).toBeFocused();
  await page.keyboard.type("Keten");
  await yeni.getByRole("switch", { name: metin("yonetim.ozellik.form.filtrede") }).click();
  await yeni.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
  await expect(bildirim(page, "yonetim.ozellik.eklendi")).toBeVisible();
  const satir = page.locator("[data-anahtar]").filter({ hasText: ozellik });
  await expect(satir).toContainText("Pamuk, Keten");
  await expect(satir).toContainText(metin("yonetim.ozellik.filtrede"));

  // Klavyeyle: başarı bildirimi son satırın düğmesinin üstünde durabilir.
  await satir
    .getByRole("button", { name: doldur(metin("yonetim.kategori.duzenle"), { ad: ozellik }) })
    .focus();
  await page.keyboard.press("Enter");
  const duzen = page.getByRole("dialog", { name: metin("yonetim.ozellik.form.duzenle") });
  await duzen.getByRole("button", { name: metin("yonetim.ozellik.form.secenekEkle") }).click();
  await page.keyboard.type("İpek");
  await secenek(duzen, 1).fill("Pamuklu");
  await duzen
    .getByRole("button", { name: doldur(metin("ortak.parca.siralama.yukari"), { ad: "İpek" }) })
    .click();
  await duzen.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
  await expect(bildirim(page, "yonetim.ozellik.kaydedildi")).toBeVisible();
  await expect(satir).toContainText("Pamuklu, İpek, Keten");

  // Bir üründe değeri olunca tür seçilemez, pencere nedenini söyler.
  const kayit = (await ozellikServisi.hepsiniOku(vt)).find((o) => o.ad === ozellik);
  const urunSrv = urunServisi(() => "Europe/Istanbul");
  const urun = await urunSrv.urunEkle(vt, kim, {
    ad: ozellik,
    vergiSinifi: null,
    ozellikler: [{ ozellik: kayit?.kimlik ?? "", deger: kayit?.secenekler[0]?.kimlik ?? "" }],
  });
  try {
    await page.reload();
    await sayfaHazir(page);
    await expect(satir).toContainText(doldur(metin("yonetim.ozellik.urunSayisi"), { sayi: "1" }));
    await satir
      .getByRole("button", { name: doldur(metin("yonetim.kategori.duzenle"), { ad: ozellik }) })
      .click();
    await expect(duzen.getByText(metin("yonetim.ozellik.form.turDegisemez"))).toBeVisible();
    await expect(
      duzen.getByRole("radio", { name: new RegExp(metin("yonetim.ozellik.tur.sayi")) }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      duzen.getByRole("radio", { name: new RegExp(metin("yonetim.ozellik.tur.liste")) }),
    ).toBeChecked();

    // Var olan seçeneğin adı silinip kaydedilirse seçenek silinmez, alanın hatası görünür (bağımsız kontrolün
    // bulgusu: sessizce siliniyordu).
    await secenek(duzen, 1).fill("");
    await duzen.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
    await expect(secenek(duzen, 1)).toHaveAttribute("aria-invalid", "true");
    await expect(secenek(duzen, 1)).toBeFocused();
    await secenek(duzen, 1).fill("Pamuklu");
    // Değeri olan seçenek çıkarılınca kayıttan önce kaç üründen kalkacağı sorulur; Vazgeç hiçbir şey yazmaz.
    await duzen
      .getByRole("button", {
        name: doldur(metin("yonetim.ozellik.form.secenegiCikar"), { ad: "Pamuklu" }),
      })
      .click();
    await duzen.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
    const onay = page.getByRole("alertdialog", {
      name: metin("yonetim.ozellik.secenekSilOnay.baslik"),
    });
    await expect(onay).toContainText(
      doldur(metin("yonetim.ozellik.secenekSilOnay.metin"), { sayi: "1" }),
    );
    await onay.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
    await expect(onay).toHaveCount(0);
    expect(
      (await ozellikServisi.hepsiniOku(vt))
        .find((o) => o.ad === ozellik)
        ?.secenekler.map((s) => s.ad),
    ).toEqual(["Pamuklu", "İpek", "Keten"]);
  } finally {
    await urunSrv.urunSil(vt, kim, urun);
  }
});

// Her renk ve genişlik ayrı testtir (menüler ekranıyla aynı: altısı tek testte süre sınırını zorlardı).
for (const renk of ["light", "dark"] as const) {
  for (const { ad, width, height } of genislikler) {
    test(`${renk} ${ad}: üç ekran, formları ve onay pencereleri taramadan geçer, yana kaymaz`, async ({
      page,
    }) => {
      const ust = denemeAdi();
      const ustKimligi = await kategoriEkle(vt, kim, { ad: ust });
      await kategoriEkle(vt, kim, { ad: denemeAdi(), ust: ustKimligi });
      const hatalar = konsoluDinle(page, {
        // Ortak yerel veritabanında görsel dosyaları olmayabilir (panel önizlemesi 404).
        haric: (ileti) => ileti.includes("status of 404") || ileti.includes("status of 400"),
      });
      await page.emulateMedia({ colorScheme: renk });
      await page.setViewportSize({ width, height });
      await paneleGir(page, yonetici);

      await sayfayaGit(page, adresler.kategoriler);
      await tara(page, "kategoriler");
      expect(await yanaKayma(page)).toBe(0);
      await ekleDugmesi(page, "yonetim.kategori.kategori").click();
      const kategoriFormu = page.getByRole("dialog", { name: metin("yonetim.kategori.form.yeni") });
      await kategoriFormu.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
      await expect(
        kategoriFormu.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true }),
      ).toHaveAttribute("aria-invalid", "true");
      await tara(page, "hatalı kategori formu");
      expect(await yanaKayma(page)).toBe(0);
      await page.keyboard.press("Escape");
      await expect(kategoriFormu).toHaveCount(0);
      await page
        .getByRole("button", { name: doldur(metin("yonetim.kategori.diger"), { ad: ust }) })
        .click();
      await page.getByRole("menuitem", { name: metin("yonetim.kategori.sil") }).click();
      const onay = page.getByRole("alertdialog");
      await expect(onay).toBeVisible();
      await tara(page, "kategori silme onayı");
      await onay.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();

      await sayfayaGit(page, adresler.markalar);
      await tara(page, "markalar ve etiketler");
      expect(await yanaKayma(page)).toBe(0);
      await ekleDugmesi(page, "yonetim.marka.tek").click();
      const markaFormu = page.getByRole("dialog", { name: metin("yonetim.marka.form.yeni") });
      await expect(markaFormu).toBeVisible();
      await tara(page, "marka formu");
      expect(await yanaKayma(page)).toBe(0);
      await page.keyboard.press("Escape");

      await sayfayaGit(page, adresler.ozellikler);
      await tara(page, "özellikler");
      expect(await yanaKayma(page)).toBe(0);
      await ekleDugmesi(page, "yonetim.ozellik.tek").click();
      const ozellikFormu = page.getByRole("dialog", { name: metin("yonetim.ozellik.form.yeni") });
      await ozellikFormu.getByRole("button", { name: metin("ortak.islem.kaydet") }).click();
      await expect(
        ozellikFormu.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true }),
      ).toHaveAttribute("aria-invalid", "true");
      await tara(page, "hatalı özellik formu");
      expect(await yanaKayma(page)).toBe(0);
      expect(hatalar).toEqual([]);
    });
  }
}
