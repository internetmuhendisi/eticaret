// Panelin kategoriler, markalar ve etiketler, özellikler ekranları gerçek tarayıcıda ve gerçek veritabanıyla
// (kart 0261, karar 0160): mağaza sahibi menüden klavyeyle gelir; kategori ekler (boş adda alanın hatası ve odak),
// alt kategori ekler, sıralar (yukarı al), satır menüsünden başka kategorinin altına taşır ve en üste çıkarır, onay
// penceresiyle siler (pencere üste çıkacak alt kategoriyi söyler, Vazgeç silmez, odak komşu satıra geçer) ve
// kategori vitrinde kendi sayfasıyla açılır. Marka ve etiket yalnız klavyeyle eklenir, düzenlenir, onayla silinir
// (pencerede odak adda, Tab sırası, onayda odak Vazgeç'te, Escape vazgeçer). Özellik yalnız klavyeyle silinir, liste
// türünde seçenekleriyle eklenir (anahtar boşlukla), düzenlenirken seçenek eklenir, adı değişir ve sıralanır; ürünlerde
// değeri olan özelliğin türü seçilemez, adı silinen seçenek alanın hatasını alır, değeri olan seçenek çıkarılınca
// sorulur. Ekranlar, formlar ve onay pencereleri iki renkte ve üç genişlikte taramadan geçer, yana
// kaymaz, konsolda hata yoktur.
//
// Kategoriler, markalar ve özellikler sitenin paylaşılan verisidir: test kendi kayıtlarını ("Deneme <6 onaltılık>")
// açar ve sonunda kaldırır; yarıda kalan eski çalışmanın kayıtları testlerden önce kaldırılır.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
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

// Klavyeyle basmak: odak düğmeye konur, Enter basılır (fare kullanılmaz).
const klavyeyleBas = async (page: Page, dugme: Locator) => {
  await dugme.focus();
  await page.keyboard.press("Enter");
};

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
  // Menü klavyeyle açılır: fareyle tıklanınca bir önceki işlemin bildirimi düğmenin üstüne gelebiliyor, fare
  // üstündeyken bildirim kapanmayı beklettiği için tıklama süre sınırına kadar bekledi (hattaki 0264 çalışması).
  const menuyuAc = async (adi: string) => {
    await page
      .getByRole("button", { name: doldur(metin("yonetim.kategori.diger"), { ad: adi }) })
      .focus();
    await page.keyboard.press("Enter");
  };
  const sec = async (oge: Locator) => {
    await oge.focus();
    await page.keyboard.press("Enter");
  };
  await menuyuAc(birinci);
  await sec(page.getByRole("menuitem", { name: metin("yonetim.kategori.altinaTasi") }));
  await sec(page.getByRole("menuitem", { name: `${ust} › ${ikinci}` }));
  await expect(bildirim(page, "yonetim.kategori.tasindi")).toBeVisible();
  await expect.poll(altlari).toEqual([ikinci]);
  // Menü, yenileme satırı yeni yerine taşıdıktan sonra açılır: önce açılırsa satır yeniden kurulunca kapanır (ölçüldü).
  await expect(
    page
      .getByRole("list", {
        name: doldur(metin("yonetim.kategori.altListeEtiketi"), { ad: ikinci }),
      })
      .getByText(birinci, { exact: true }),
  ).toBeVisible();
  await menuyuAc(birinci);
  await sec(page.getByRole("menuitem", { name: metin("yonetim.kategori.enUsteCikar") }));
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

test("marka ve etiket klavyeyle eklenir, düzenlenir, onayla silinir", async ({ page }) => {
  const marka = denemeAdi();
  const etiket = denemeAdi();
  await paneleGir(page, yonetici);
  await sayfayaGit(page, adresler.markalar);
  const markalar = page.getByRole("region", { name: metin("yonetim.marka.liste") });
  const etiketler = page.getByRole("region", { name: metin("yonetim.etiket.liste") });
  const ad = (form: Locator) => form.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true });

  // Ekle: pencere açılınca odak adda; Tab adres adına, oradan açıklamaya geçer; Shift+Tab ile ada dönülüp Enter.
  await klavyeyleBas(page, ekleDugmesi(page, "yonetim.marka.tek"));
  let form = page.getByRole("dialog", { name: metin("yonetim.marka.form.yeni") });
  await expect(ad(form)).toBeFocused();
  await page.keyboard.type(marka);
  await page.keyboard.press("Tab");
  await expect(
    form.getByLabel(metin("yonetim.kategori.form.adresAdi"), { exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    form.getByLabel(metin("yonetim.kategori.form.aciklama"), { exact: true }),
  ).toBeFocused();
  await page.keyboard.type("Üretici");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(ad(form)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(bildirim(page, "yonetim.marka.eklendi")).toBeVisible();
  await expect(form).toHaveCount(0);
  await expect(markalar.getByText(marka, { exact: true })).toBeVisible();

  // Düzenle: adres adı Tab ile seçilip yeniden yazılır, Enter kaydeder; odak satırın düğmesine döner.
  const duzenle = markalar.getByRole("button", {
    name: doldur(metin("yonetim.kategori.duzenle"), { ad: marka }),
  });
  await klavyeyleBas(page, duzenle);
  form = page.getByRole("dialog", { name: metin("yonetim.marka.form.duzenle") });
  await expect(
    form.getByLabel(metin("yonetim.kategori.form.aciklama"), { exact: true }),
  ).toHaveValue("Üretici");
  await expect(ad(form)).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(`yeni-${marka.slice(-6)}`);
  await page.keyboard.press("Enter");
  await expect(form).toHaveCount(0);
  await expect(markalar.getByText(`/marka/yeni-${marka.slice(-6)}`)).toBeVisible();
  await expect(duzenle).toBeFocused();

  // Etiket: açıklaması ve logosu yoktur.
  await klavyeyleBas(page, ekleDugmesi(page, "yonetim.etiket.tek"));
  form = page.getByRole("dialog", { name: metin("yonetim.etiket.form.yeni") });
  await expect(
    form.getByLabel(metin("yonetim.kategori.form.aciklama"), { exact: true }),
  ).toHaveCount(0);
  await expect(ad(form)).toBeFocused();
  await page.keyboard.type(etiket);
  await page.keyboard.press("Enter");
  await expect(etiketler.getByText(etiket, { exact: true })).toBeVisible();

  // Sil: onay penceresi Vazgeç'te açılır, Escape vazgeçer; Tab ile Sil'e geçilip Enter siler.
  const sil = markalar.getByRole("button", {
    name: doldur(metin("yonetim.kategori.silAdli"), { ad: marka }),
  });
  await klavyeyleBas(page, sil);
  const onay = page.getByRole("alertdialog", {
    name: doldur(metin("yonetim.marka.silOnay.baslik"), { ad: marka }),
  });
  await expect(onay.getByRole("button", { name: metin("ortak.islem.vazgec") })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(onay).toHaveCount(0);
  await expect(sil).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(onay.getByRole("button", { name: metin("ortak.islem.vazgec") })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(onay.getByRole("button", { name: metin("yonetim.kategori.sil") })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(bildirim(page, "yonetim.marka.silindi")).toBeVisible();
  await expect(markalar.getByText(marka, { exact: true })).toHaveCount(0);
});

test("özellik klavyeyle seçenekleriyle eklenir, düzenlenirken seçenek eklenir ve sıralanır, silinir; değeri olanın türü seçilemez", async ({
  page,
}) => {
  const ozellik = denemeAdi();
  const silinecek = denemeAdi();
  await ozellikServisi.ekle(vt, kim, { ad: silinecek, tur: "metin" });
  await paneleGir(page, yonetici);
  await sayfayaGit(page, adresler.ozellikler);

  // Sil: onay penceresinde Tab ile Sil'e geçilip Enter.
  await klavyeyleBas(
    page,
    page.getByRole("button", {
      name: doldur(metin("yonetim.kategori.silAdli"), { ad: silinecek }),
    }),
  );
  const silOnayi = page.getByRole("alertdialog", {
    name: doldur(metin("yonetim.ozellik.silOnay.baslik"), { ad: silinecek }),
  });
  await expect(silOnayi).toContainText(metin("yonetim.ozellik.silOnay.urunsuz"));
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(bildirim(page, "yonetim.ozellik.silindi")).toBeVisible();
  await expect(page.locator("[data-anahtar]").filter({ hasText: silinecek })).toHaveCount(0);

  // Ekle: odak adda; liste türü varsayılan, ilk seçenek alanı hazır, ikincisi "Seçenek ekle" ile; anahtar boşlukla
  // açılır, Enter kaydeder.
  await klavyeyleBas(page, ekleDugmesi(page, "yonetim.ozellik.tek"));
  const yeni = page.getByRole("dialog", { name: metin("yonetim.ozellik.form.yeni") });
  const adAlani = yeni.getByLabel(metin("yonetim.kategori.form.ad"), { exact: true });
  await expect(adAlani).toBeFocused();
  await page.keyboard.type(ozellik);
  const secenek = (form: Locator, sira: number) =>
    form.getByLabel(doldur(metin("yonetim.ozellik.form.secenekSirasi"), { sira: String(sira) }), {
      exact: true,
    });
  await secenek(yeni, 1).focus();
  await page.keyboard.type("Pamuk");
  await klavyeyleBas(
    page,
    yeni.getByRole("button", { name: metin("yonetim.ozellik.form.secenekEkle") }),
  );
  await expect(secenek(yeni, 2)).toBeFocused();
  await page.keyboard.type("Keten");
  const anahtar = yeni.getByRole("switch", { name: metin("yonetim.ozellik.form.filtrede") });
  await anahtar.focus();
  await page.keyboard.press("Space");
  await expect(anahtar).toHaveAttribute("aria-checked", "true");
  await secenek(yeni, 2).focus();
  await page.keyboard.press("Enter");
  await expect(bildirim(page, "yonetim.ozellik.eklendi")).toBeVisible();
  const satir = page.locator("[data-anahtar]").filter({ hasText: ozellik });
  await expect(satir).toContainText("Pamuk, Keten");
  await expect(satir).toContainText(metin("yonetim.ozellik.filtrede"));

  // Düzenle: yeni seçenek eklenir, ilk seçeneğin adı değişir, yeni seçenek klavyeyle yukarı alınır, Enter kaydeder.
  await klavyeyleBas(
    page,
    satir.getByRole("button", { name: doldur(metin("yonetim.kategori.duzenle"), { ad: ozellik }) }),
  );
  const duzen = page.getByRole("dialog", { name: metin("yonetim.ozellik.form.duzenle") });
  await klavyeyleBas(
    page,
    duzen.getByRole("button", { name: metin("yonetim.ozellik.form.secenekEkle") }),
  );
  await expect(secenek(duzen, 3)).toBeFocused();
  await page.keyboard.type("İpek");
  await secenek(duzen, 1).focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Pamuklu");
  await klavyeyleBas(
    page,
    duzen.getByRole("button", {
      name: doldur(metin("ortak.parca.siralama.yukari"), { ad: "İpek" }),
    }),
  );
  await secenek(duzen, 1).focus();
  await page.keyboard.press("Enter");
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
    await klavyeyleBas(
      page,
      satir.getByRole("button", {
        name: doldur(metin("yonetim.kategori.duzenle"), { ad: ozellik }),
      }),
    );
    await expect(duzen.getByText(metin("yonetim.ozellik.form.turDegisemez"))).toBeVisible();
    await expect(
      duzen.getByRole("radio", { name: new RegExp(metin("yonetim.ozellik.tur.sayi")) }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      duzen.getByRole("radio", { name: new RegExp(metin("yonetim.ozellik.tur.liste")) }),
    ).toBeChecked();

    // Var olan seçeneğin adı silinip kaydedilirse seçenek silinmez, alanın hatası görünür (bağımsız kontrolün
    // bulgusu: sessizce siliniyordu).
    await secenek(duzen, 1).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Enter");
    await expect(secenek(duzen, 1)).toHaveAttribute("aria-invalid", "true");
    await expect(secenek(duzen, 1)).toBeFocused();
    await page.keyboard.type("Pamuklu");
    // Değeri olan seçenek çıkarılınca kayıttan önce kaç üründen kalkacağı sorulur; Vazgeç hiçbir şey yazmaz.
    await klavyeyleBas(
      page,
      duzen.getByRole("button", {
        name: doldur(metin("yonetim.ozellik.form.secenegiCikar"), { ad: "Pamuklu" }),
      }),
    );
    await klavyeyleBas(page, duzen.getByRole("button", { name: metin("ortak.islem.kaydet") }));
    const onay = page.getByRole("alertdialog", {
      name: metin("yonetim.ozellik.secenekSilOnay.baslik"),
    });
    await expect(onay).toContainText(
      doldur(metin("yonetim.ozellik.secenekSilOnay.metin"), { sayi: "1" }),
    );
    await expect(onay.getByRole("button", { name: metin("ortak.islem.vazgec") })).toBeFocused();
    await page.keyboard.press("Enter");
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
