// Panelin menüler ekranı gerçek tarayıcıda ve gerçek veritabanıyla (kart 0143, karar 0082 ve 0116): mağaza sahibi
// ana menüye klavyeyle öğe ekler (kayıt arayarak ve adresle), bir öğeyi başlığın altına taşır, sıralar, onay
// penceresiyle siler; her değişiklik vitrinin menüsünde görünür. Kategori menüsünde öğe eklenmez, nedeni yazar.
// Ekran ve pencereleri iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yoktur.
//
// Menüler sitenin paylaşılan verisidir: test kendi öğelerini ekler ve sonunda kaldırır.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { menuleriOku, ogeSil, panelMenusu } from "../../moduller/menu/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../../vitrin/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, type DenemeYoneticisi, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const kim = sistemIslemi("uctan-uca-menuler");
const menulerAdresi = "/yonetim/menuler";

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

const bildirim = (page: Page, anahtar: Parameters<typeof metin>[0]) =>
  page
    .getByRole("region", { name: metin("ortak.parca.bildirimler") })
    .getByText(metin(anahtar), { exact: true });

const menuKimligi = async (kod: string) => {
  const menu = (await menuleriOku(vt)).find((m) => m.kod === kod);
  if (menu === undefined) throw new Error(`${kod} menüsü yok.`);
  return menu.kimlik;
};

// Testin öğelerinin metni: "Deneme <6 onaltılık>". Yarıda kalan eski bir çalışmanın öğeleri de bu kalıpla bulunup
// testlerden önce kaldırılır (bir test süre sınırını aşınca temizliği yarıda kalabiliyor, ölçüldü).
const denemeKalibi = /^Deneme [0-9a-f]{6}$/;
const denemeMetni = () => `Deneme ${randomBytes(3).toString("hex")}`;
test.beforeAll(async () => {
  for (const menu of await menuleriOku(vt)) {
    const okunan = await panelMenusu(vt, menu.kimlik);
    if (!("ogeler" in okunan)) continue;
    for (const oge of [...okunan.ogeler, ...okunan.ogeler.flatMap((o) => o.altlar)]) {
      if (oge.metin !== null && denemeKalibi.test(oge.metin)) {
        await ogeSil(vt, kim, oge.kimlik).catch(() => undefined);
      }
    }
  }
});

// Testin eklediği öğeler: metni bilinen öğeler (altlarıyla) silinir.
const ogeleriSil = async (menu: string, metinler: string[]) => {
  const okunan = await panelMenusu(vt, menu);
  if (!("ogeler" in okunan)) return;
  const silinecek = [...okunan.ogeler, ...okunan.ogeler.flatMap((oge) => oge.altlar)].filter(
    (oge) => oge.metin !== null && metinler.includes(oge.metin),
  );
  for (const oge of silinecek) await ogeSil(vt, kim, oge.kimlik).catch(() => undefined);
};

const anaMenuyuAc = async (page: Page) => {
  await page.goto(`${menulerAdresi}?menu=${await menuKimligi("ana-menu")}`);
  await sayfaHazir(page);
};

const vitrinMenusu = (page: Page) =>
  page
    .getByRole("banner")
    .getByRole("navigation", { name: metin("vitrin.bolum.menuSatiri.gezinme") });

test("mağaza sahibi klavyeyle kayıt arayarak ve adresle öğe ekler; vitrinin menüsünde görünür", async ({
  page,
  context,
}) => {
  const kategoriYazisi = denemeMetni();
  const adresYazisi = denemeMetni();
  const menu = await menuKimligi("ana-menu");
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yonetici);
    const bag = page
      .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
      .getByRole("link", { name: metin("yonetim.sayfa.menuler.ad") });
    await bag.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${menulerAdresi}`));
    await sayfaHazir(page);
    await anaMenuyuAc(page);

    // Kayıt arayarak: "giyim" yazılır, ok tuşu ve Enter ile seçilir.
    const ekle = page.getByRole("button", {
      name: doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.menu.oge") }),
    });
    await ekle.focus();
    await page.keyboard.press("Enter");
    const form = page.getByRole("dialog", { name: metin("yonetim.menu.form.yeniOge") });
    const arama = form.getByRole("combobox", { name: metin("yonetim.menu.hedef.kategori") });
    await arama.focus();
    await page.keyboard.type("giyim");
    await expect(form.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("ArrowDown");
    // Öneri açıkken Escape pencereyi kapatmaz, yalnız listeyi.
    await page.keyboard.press("Escape");
    await expect(form).toBeVisible();
    await expect(arama).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(arama).toHaveAttribute("aria-expanded", "false");
    await expect(arama).toHaveValue(/Giyim/);
    await form.getByLabel(metin("yonetim.menu.form.metin")).fill(kategoriYazisi);
    await form.getByLabel(metin("yonetim.menu.form.metin")).press("Enter");
    await expect(bildirim(page, "yonetim.menu.eklendi")).toBeVisible();
    await expect(form).toHaveCount(0);

    // Adresle; metinsiz kaydetmek alanın altında hata verir.
    await ekle.click();
    await form.getByRole("radio", { name: metin("yonetim.menu.form.secim.site-adresi") }).click();
    // Yeni sekme yalnız dış bağlantıda sorulur.
    await expect(
      form.getByRole("checkbox", { name: metin("yonetim.menu.form.yeniSekme") }),
    ).toHaveCount(0);
    await form.getByLabel(metin("yonetim.menu.form.adres")).fill("/kampanya");
    await form.getByRole("button", { name: metin("yonetim.menu.form.kaydet") }).click();
    await expect(form.getByText(metin("yonetim.menu.hata.metin-gerekli"))).toBeVisible();
    await form.getByLabel(metin("yonetim.menu.form.metin")).fill(adresYazisi);
    await form.getByRole("button", { name: metin("yonetim.menu.form.kaydet") }).click();
    await expect(form).toHaveCount(0);
    const satir = page.getByRole("listitem").filter({ hasText: adresYazisi });
    await expect(satir.getByText("/kampanya")).toBeVisible();

    const vitrin = await context.newPage();
    await vitrin.goto(vitrinAdresleri.anasayfa);
    await expect(vitrinMenusu(vitrin).getByRole("link", { name: kategoriYazisi })).toBeVisible();
    await expect(vitrinMenusu(vitrin).getByRole("link", { name: adresYazisi })).toHaveAttribute(
      "href",
      "/kampanya",
    );
  } finally {
    await ogeleriSil(menu, [kategoriYazisi, adresYazisi]);
  }
});

test("mağaza sahibi öğeyi başlığın altına taşır, en üste çıkarır, sıralar ve onayla siler; vitrinde görünür", async ({
  page,
  context,
}) => {
  const baslik = denemeMetni();
  const alt = denemeMetni();
  const ikinciAlt = denemeMetni();
  const menu = await menuKimligi("ana-menu");
  const { ogeEkle } = await import("../../moduller/menu/servis");
  const baslikKimligi = await ogeEkle(vt, kim, menu, { metin: baslik, hedef: { tur: "baslik" } });
  await ogeEkle(vt, kim, menu, {
    metin: ikinciAlt,
    hedef: { tur: "adres", adres: "/iletisim" },
    ust: baslikKimligi,
  });
  await ogeEkle(vt, kim, menu, { metin: alt, hedef: { tur: "adres", adres: "/hakkimizda" } });
  const altSirasi = async () => {
    const okunan = await panelMenusu(vt, menu);
    return "ogeler" in okunan
      ? (okunan.ogeler.find((oge) => oge.metin === baslik)?.altlar.map((oge) => oge.metin) ?? [])
      : [];
  };
  const ustSirasi = async () => {
    const okunan = await panelMenusu(vt, menu);
    return "ogeler" in okunan ? okunan.ogeler.map((oge) => oge.metin) : [];
  };
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yonetici);
    await anaMenuyuAc(page);
    const altSatir = page.getByRole("listitem").filter({ hasText: alt }).last();

    // "Diğer işlemler" menüsünden klavyeyle başlığın altına.
    await altSatir
      .getByRole("button", { name: doldur(metin("yonetim.menu.diger"), { ad: alt }) })
      .focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: metin("yonetim.menu.altinaTasi") }).focus();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("menuitem", { name: baslik }).press("Enter");
    await expect(bildirim(page, "yonetim.menu.tasindi")).toBeVisible();
    const altListe = page.getByRole("list", {
      name: doldur(metin("yonetim.menu.altListeEtiketi"), { oge: baslik }),
    });
    await expect(altListe).toContainText(alt);
    expect(await altSirasi()).toEqual([ikinciAlt, alt]);
    // Taşınan satır yeni yerinde odaktadır (sayfanın başına düşmez).
    await expect
      .poll(() =>
        page.evaluate(() => document.activeElement?.closest("[data-anahtar]")?.textContent ?? ""),
      )
      .toContain(alt);

    // Alt öğeler kendi listesinde klavyeyle sıralanır: tutamakta boşluk, yukarı ok, boşluk.
    await altListe
      .getByRole("button", { name: doldur(metin("ortak.parca.siralama.tasi"), { ad: alt }) })
      .focus();
    await page.keyboard.press("Space");
    await expect(
      page.getByText(
        doldur(metin("ortak.parca.siralama.alindi"), { ad: alt, sira: "2", toplam: "2" }),
        { exact: true },
      ),
    ).toBeAttached();
    // @dnd-kit ok tuşu dinleyicisini sayfanın bir sonraki işinde bağlar (katalog.test.ts).
    await page.evaluate(() => new Promise<void>((tamam) => setTimeout(tamam, 0)));
    await page.keyboard.press("ArrowUp");
    await expect(
      page.getByText(
        doldur(metin("ortak.parca.siralama.tasindi"), { ad: alt, sira: "1", toplam: "2" }),
        { exact: true },
      ),
    ).toBeAttached();
    await page.keyboard.press("Space");
    await expect.poll(altSirasi).toEqual([alt, ikinciAlt]);

    // Derinlik sınırı ekranda da tutar: altı olan başlık başka bir öğenin altına taşınamaz, seçenek sunulmaz;
    // formdaki üst öğe seçimi kapalıdır.
    const baslikMenusu = page
      .getByRole("listitem")
      .filter({ hasText: baslik })
      .first()
      .getByRole("button", { name: doldur(metin("yonetim.menu.diger"), { ad: baslik }) });
    await baslikMenusu.click();
    await expect(page.getByRole("menuitem", { name: metin("yonetim.menu.sil") })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: metin("yonetim.menu.altinaTasi") }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page
      .getByRole("listitem")
      .filter({ hasText: baslik })
      .first()
      .getByRole("button", { name: doldur(metin("yonetim.menu.duzenle"), { ad: baslik }) })
      .click();
    const duzenleme = page.getByRole("dialog", { name: metin("yonetim.menu.form.ogeyiDuzenle") });
    await expect(
      duzenleme.getByRole("combobox", { name: metin("yonetim.menu.form.ust") }),
    ).toBeDisabled();
    await expect(duzenleme.getByText(metin("yonetim.menu.form.ustKapali"))).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(duzenleme).toHaveCount(0);

    const vitrin = await context.newPage();
    await vitrin.goto(vitrinAdresleri.anasayfa);
    await expect(vitrinMenusu(vitrin).getByRole("button", { name: baslik })).toBeVisible();

    // Sıralama: başlık klavyeyle bir yukarı.
    const once = await ustSirasi();
    const baslikSatiri = page.getByRole("listitem").filter({ hasText: baslik }).first();
    await baslikSatiri
      .getByRole("button", { name: doldur(metin("ortak.parca.siralama.yukari"), { ad: baslik }) })
      .click();
    await expect
      .poll(async () => (await ustSirasi()).indexOf(baslik))
      .toBe(once.indexOf(baslik) - 1);

    // En üst düzeye çıkar.
    await page
      .getByRole("listitem")
      .filter({ hasText: alt })
      .last()
      .getByRole("button", { name: doldur(metin("yonetim.menu.diger"), { ad: alt }) })
      .click();
    await page.getByRole("menuitem", { name: metin("yonetim.menu.enUsteCikar") }).click();
    await expect.poll(async () => (await ustSirasi()).at(-1)).toBe(alt);
    // Satır ekranda da yeni yerindedir (başlığın alt listesinden çıkar): yeniden kurulan satırın menüsü açılır.
    await expect(altListe).not.toContainText(alt);

    // Onayla silme: Vazgeç silmez, Sil siler.
    // Menü klavyeyle açılır, "Sil" son öğedir (End). Ekranın altındaki satırda bildirimler menünün üstünde durabilir.
    const sil = async () => {
      await page
        .getByRole("listitem")
        .filter({ hasText: alt })
        .last()
        .getByRole("button", { name: doldur(metin("yonetim.menu.diger"), { ad: alt }) })
        .focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("End");
      await expect(page.getByRole("menuitem", { name: metin("yonetim.menu.sil") })).toBeFocused();
      await page.keyboard.press("Enter");
      return page.getByRole("alertdialog", {
        name: doldur(metin("yonetim.menu.ogeSilOnay.baslik"), { ad: alt }),
      });
    };
    let onay = await sil();
    await expect(onay.getByRole("button", { name: metin("ortak.islem.vazgec") })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(onay).toHaveCount(0);
    expect(await ustSirasi()).toContain(alt);
    onay = await sil();
    await onay.getByRole("button", { name: metin("yonetim.menu.sil") }).click();
    await expect(bildirim(page, "yonetim.menu.silindi")).toBeVisible();
    await expect.poll(ustSirasi).not.toContain(alt);
    // Silinen satırın yerine odak komşu satıra geçer, sayfanın başına düşmez.
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.closest("[data-anahtar]") !== null))
      .toBe(true);
    await vitrin.reload();
    await expect(vitrinMenusu(vitrin).getByText(alt)).toHaveCount(0);
  } finally {
    await ogeleriSil(menu, [baslik, alt, ikinciAlt]);
  }
});

test("kategori menüsüne öğe eklenmez, ağaç ve nedeni görünür", async ({ page }) => {
  await paneleGir(page, yonetici);
  await page.goto(`${menulerAdresi}?menu=${await menuKimligi("kategori-menusu")}`);
  await sayfaHazir(page);
  await expect(page.getByText(metin("yonetim.menu.kategoriAciklamasi"))).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.menu.oge") }),
    }),
  ).toHaveCount(0);
});

// Her renk ve genişlik ayrı testtir (kart 0142: altısı tek testte süre sınırını zorlardı).
for (const renk of ["light", "dark"] as const) {
  for (const { ad, width, height } of genislikler) {
    test(`${renk} ${ad}: ekran, öğe formu ve onay penceresi taramadan geçer, yana kaymaz`, async ({
      page,
    }) => {
      const hatalar = konsoluDinle(page, { haric: (ileti) => ileti.includes("status of 400") });
      await page.emulateMedia({ colorScheme: renk });
      await page.setViewportSize({ width, height });
      await paneleGir(page, yonetici);
      await anaMenuyuAc(page);
      await tara(page, "liste");
      expect(await yanaKayma(page)).toBe(0);
      await page
        .getByRole("button", {
          name: doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.menu.oge") }),
        })
        .click();
      const form = page.getByRole("dialog", { name: metin("yonetim.menu.form.yeniOge") });
      await form.getByRole("combobox", { name: metin("yonetim.menu.hedef.kategori") }).fill("a");
      await expect(form.getByRole("option").first()).toBeVisible();
      await tara(page, "öğe formu, öneriler açık");
      await form.getByRole("radio", { name: metin("yonetim.menu.hedef.baslik") }).click();
      await form.getByRole("button", { name: metin("yonetim.menu.form.kaydet") }).click();
      await expect(form.getByText(metin("yonetim.menu.hata.metin-gerekli"))).toBeVisible();
      await tara(page, "hatalı form");
      expect(await yanaKayma(page)).toBe(0);
      await form.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
      await form.getByRole("button", { name: metin("yonetim.bolumler.form.birak") }).click();
      await expect(form).toHaveCount(0);
      const anaMenu = (await menuleriOku(vt)).find((m) => m.kod === "ana-menu");
      await page
        .getByRole("list", {
          name: doldur(metin("yonetim.menu.listeEtiketi"), { menu: anaMenu?.ad ?? "" }),
        })
        .getByRole("listitem")
        .first()
        .getByRole("button", {
          name: new RegExp(`^${doldur(metin("yonetim.menu.diger"), { ad: "" })}`),
        })
        .first()
        .focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("End");
      await expect(page.getByRole("menuitem", { name: metin("yonetim.menu.sil") })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await tara(page, "onay penceresi");
      await page.keyboard.press("Escape");
      expect(hatalar).toEqual([]);
    });
  }
}
