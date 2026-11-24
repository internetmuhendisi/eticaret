// Sabit sayfalar tarayıcıda (kart 0273):
// - Mağaza sahibi menüden klavyeyle Sayfalar'a gelir; liste iki renkte ve üç genişlikte taramadan geçer.
// - "Sayfa ekle": boş başlıkta alanın hatası ve odak; başlık ve kalın yazılı içerik klavyeyle yazılır, sayfa taslak olarak
//   kaydedilir ve sayfanın ekranı açılır; taslağın "Vitrinde gör"ü yok, vitrindeki adresi 404. Form iki renkte ve üç
//   genişlikte taranır. Yayın durumu ok tuşuyla "Yayında" yapılıp kaydedilir.
// - "Menüye ekle" menüler ekranını öğe penceresi açık, "Sayfa" ve bu sayfa seçili getirir; ana menüye eklenir, vitrinin
//   menü satırında sayfanın başlığıyla görünür ve sayfayı açar. Vitrindeki sayfa (sayfa yolu, başlık, kalın içerik) iki
//   renkte ve üç genişlikte taranır, yana kaymaz.
// - Listeden onayla silme: Vazgeç silmez; silinen sayfa vitrinin menüsünden kalkar, adresi 404.
// - Konsolda hata yok (bilerek gönderilen boş formun 400'ü ve taslak ile silinen sayfanın 404'ü dışında).
//
// Testin sayfaları "Deneme <ek>" ile başlar; menü öğeleri ve sayfalar sonunda silinir.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { like } from "drizzle-orm";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { sabitSayfalar } from "../../moduller/icerik/model";
import { sabitSayfaOku, sabitSayfaServisi } from "../../moduller/icerik/sayfa";
import { menuleriOku, ogeSil, panelMenusu } from "../../moduller/menu/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../../vitrin/adresler";
import {
  menulerAdresi,
  menuyeSayfaEkleAdresi,
  sayfalarAdresi,
} from "../../yonetim-paneli/adresler";
import { bildirimSuresiniDurdur } from "./bildirim-suresi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("tarayici-testi");
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

test.afterAll(async () => {
  await vt.$client.end();
});

const tara = async (page: Page, ne: string) => {
  await bildirimSuresiniDurdur(page);
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) =>
          Number.isFinite(a.effect?.getComputedTiming().endTime ?? Number.POSITIVE_INFINITY),
        )
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

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.width}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${ne} ${renk} ${boyut.width} yana kaymaz`,
      ).toBe(true);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

// Testin sayfalarına bağlı menü öğelerini ve sayfaları siler (yarıda kalan eski çalışmanınkiler de).
const temizle = async () => {
  const sayfalar = await vt
    .select({ kimlik: sabitSayfalar.kimlik })
    .from(sabitSayfalar)
    .where(like(sabitSayfalar.baslik, "Deneme %"));
  const kimlikler = new Set(sayfalar.map((sayfa) => sayfa.kimlik));
  for (const menu of await menuleriOku(vt)) {
    const okunan = await panelMenusu(vt, menu.kimlik);
    if (!("ogeler" in okunan)) continue;
    for (const oge of [...okunan.ogeler, ...okunan.ogeler.flatMap((o) => o.altlar)]) {
      if (oge.hedef.tur === "sayfa" && kimlikler.has(oge.hedef.kimlik)) {
        await ogeSil(vt, yapan, oge.kimlik).catch(() => undefined);
      }
    }
  }
  for (const kimlik of kimlikler) {
    await sabitSayfaServisi.sayfaSil(vt, yapan, kimlik).catch(() => undefined);
  }
};
test.beforeAll(temizle);

const beklenenHata = (ileti: string) => ileti.includes("status of 400") || ileti.includes("404");

const vitrinMenusu = (page: Page) =>
  page
    .getByRole("banner")
    .getByRole("navigation", { name: metin("vitrin.bolum.menuSatiri.gezinme") });

test("sabit sayfa: mağaza sahibi klavyeyle yazar, yayınlar, menüye ekler, vitrinde görür ve siler; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const ek = randomBytes(3).toString("hex");
  const baslikYazisi = `Deneme ${ek} Hakkımızda`;
  const konsol = konsoluDinle(page, { haric: beklenenHata });
  try {
    await ayriBaglanti(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());

    const menu = page.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
    await menu.getByRole("link", { name: metin("yonetim.sayfa.sayfalar.ad"), exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${sayfalarAdresi}$`));
    await sayfaHazir(page);
    await ikiRenkUcGenislik(page, "sayfa listesi");

    // Sayfa ekle: boş başlıkta alanın hatası ve odak.
    await page
      .getByRole("link", { name: metin("yonetim.eylem.sayfaEkle") })
      .first()
      .focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${sayfalarAdresi}/yeni$`));
    await sayfaHazir(page);
    const kaydet = page.getByRole("button", {
      name: metin("yonetim.sabitSayfa.ekle"),
      exact: true,
    });
    await kaydet.focus();
    await page.keyboard.press("Enter");
    const baslik = page.getByRole("textbox", { name: metin("yonetim.sabitSayfa.baslik") });
    await expect(baslik).toBeFocused();
    await expect(baslik).toHaveAttribute("aria-invalid", "true");
    await page.keyboard.type(baslikYazisi);
    // Biçimli içerik: araç çubuğu tek sekme durağı, sonra yazı alanı; Ctrl+B kalın yazar.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const icerik = page.getByRole("textbox", {
      name: metin("yonetim.sabitSayfa.icerik"),
      exact: true,
    });
    await expect(icerik).toBeFocused();
    await page.keyboard.type("Biz ");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type("küçük bir mağazayız");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type(".");
    await kaydet.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/yonetim\/sayfalar\/sayfa\?kimlik=/);
    await sayfaHazir(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(baslikYazisi);
    const kimlik = new URL(page.url()).searchParams.get("kimlik") ?? "";
    const sayfa = await sabitSayfaOku(vt, kimlik);
    expect(sayfa).toMatchObject({ durum: "taslak", adresAdi: `deneme-${ek}-hakkimizda` });
    expect(sayfa?.icerik).toContain("<strong>küçük bir mağazayız</strong>");
    const adres = kayitAdresleri.sayfa(sayfa?.adresAdi ?? "");
    // Taslak vitrinde değildir: "Vitrinde gör" yok, adresi bulunamadı.
    await expect(page.getByRole("link", { name: metin("yonetim.eylem.vitrindeGor") })).toHaveCount(
      0,
    );
    const vitrin = await page.context().newPage();
    expect((await vitrin.goto(adres))?.status()).toBe(404);
    await ikiRenkUcGenislik(page, "sayfa formu");

    // Yayın durumu klavyeyle: radyo grubunda ok tuşu (Yayında, Taslak).
    const taslak = page.getByRole("radio", { name: metin("yonetim.sabitSayfa.durum.taslak") });
    await taslak.focus();
    await expect(taslak).toBeChecked();
    await page.keyboard.press("ArrowUp", { delay: 50 });
    await expect(
      page.getByRole("radio", { name: metin("yonetim.sabitSayfa.durum.yayinda") }),
    ).toBeChecked();
    const kaydetVar = page.getByRole("button", {
      name: metin("yonetim.sabitSayfa.kaydet"),
      exact: true,
    });
    await kaydetVar.focus();
    await page.keyboard.press("Enter");
    const vitrindeGor = page.getByRole("link", { name: metin("yonetim.eylem.vitrindeGor") });
    await expect(vitrindeGor).toBeVisible();
    await expect(vitrindeGor).toHaveAttribute("href", adres);
    expect((await sabitSayfaOku(vt, kimlik))?.durum).toBe("yayinda");
    await expect(page.getByText(metin("yonetim.sabitSayfa.menudeDegilUzun"))).toBeVisible();

    // "Menüye ekle": menüler ekranı öğe penceresi açık, sayfa seçili gelir.
    const menuyeEkle = page.getByRole("link", { name: metin("yonetim.sabitSayfa.menuyeEkle") });
    await expect(menuyeEkle).toHaveAttribute("href", menuyeSayfaEkleAdresi(kimlik));
    await menuyeEkle.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${menulerAdresi}\\?`));
    await sayfaHazir(page);
    let pencere = page.getByRole("dialog");
    await expect(pencere).toBeVisible();
    await expect(
      pencere.getByRole("radio", { name: metin("yonetim.menu.hedef.sayfa"), exact: true }),
    ).toBeChecked();
    await expect(
      pencere.getByRole("combobox", { name: metin("yonetim.menu.hedef.sayfa"), exact: true }),
    ).toHaveValue(baslikYazisi);
    // Adres temizlenir: sayfa yenilenince pencere yeniden açılmaz.
    await expect(page).not.toHaveURL(/ekle-sayfa/);
    await tara(page, "menüye ekleme penceresi");
    // Ana menüye eklenir: menü adreste verilir, pencere yine sayfa seçili açılır.
    await page.keyboard.press("Escape");
    await expect(pencere).toBeHidden();
    const anaMenu = (await menuleriOku(vt)).find((m) => m.kod === "ana-menu");
    if (anaMenu === undefined) throw new Error("Ana menü yok.");
    await page.goto(`${menulerAdresi}?menu=${anaMenu.kimlik}&ekle-sayfa=${kimlik}`);
    await sayfaHazir(page);
    pencere = page.getByRole("dialog");
    await expect(pencere).toBeVisible();
    await pencere.getByRole("button", { name: metin("yonetim.menu.form.kaydet") }).focus();
    await page.keyboard.press("Enter");
    await expect(pencere).toBeHidden();

    // Vitrinin menü satırında sayfanın başlığıyla görünür ve sayfayı açar.
    await vitrin.goto(vitrinAdresleri.anasayfa);
    await sayfaHazir(vitrin);
    const menuBaglantisi = vitrinMenusu(vitrin).getByRole("link", { name: baslikYazisi });
    await expect(menuBaglantisi).toHaveAttribute("href", adres);
    await menuBaglantisi.click();
    await expect(vitrin).toHaveURL(new RegExp(`${adres}$`));
    await sayfaHazir(vitrin);
    await expect(vitrin.getByRole("heading", { level: 1 })).toHaveText(baslikYazisi);
    await expect(vitrin.locator("strong", { hasText: "küçük bir mağazayız" })).toBeVisible();
    await expect(
      vitrin.getByRole("navigation", { name: metin("ortak.parca.sayfaYolu") }).getByRole("link", {
        name: metin("vitrin.sayfa.anasayfa"),
      }),
    ).toBeVisible();
    await ikiRenkUcGenislik(vitrin, "vitrindeki sayfa");

    // Sayfanın ekranında menüdeki yeri görünür.
    await page.goto(`${sayfalarAdresi}/sayfa?kimlik=${kimlik}`);
    await sayfaHazir(page);
    await expect(
      page.getByRole("region", { name: metin("yonetim.sabitSayfa.bolum.menuler") }),
    ).toContainText(anaMenu.ad);

    // Listeden onayla silme: Vazgeç silmez; silinen sayfa vitrinin menüsünden kalkar, adresi 404.
    await page.goto(sayfalarAdresi);
    await sayfaHazir(page);
    const silDugmesi = page.getByRole("button", {
      name: doldur(metin("yonetim.sabitSayfa.silAdli"), { baslik: baslikYazisi }),
    });
    await silDugmesi.focus();
    await page.keyboard.press("Enter");
    const onay = page.getByRole("alertdialog");
    await expect(onay).toBeVisible();
    await tara(page, "silme onayı");
    await page.keyboard.press("Enter");
    await expect(onay).toBeHidden();
    await expect(silDugmesi).toBeFocused();
    expect(await sabitSayfaOku(vt, kimlik)).not.toBeNull();
    await page.keyboard.press("Enter");
    await onay.getByRole("button", { name: metin("yonetim.sabitSayfa.sil") }).focus();
    await page.keyboard.press("Enter");
    // Pencere açıkken liste ekran okuyucudan gizlidir: önce pencerenin kapanması beklenir.
    await expect(onay).toBeHidden();
    await expect(page.getByRole("link", { name: baslikYazisi })).toHaveCount(0);
    expect(await sabitSayfaOku(vt, kimlik)).toBeNull();
    await vitrin.goto(vitrinAdresleri.anasayfa);
    await sayfaHazir(vitrin);
    await expect(vitrinMenusu(vitrin).getByRole("link", { name: baslikYazisi })).toHaveCount(0);
    expect((await vitrin.goto(adres))?.status()).toBe(404);
    await vitrin.close();
    expect(konsol).toEqual([]);
  } finally {
    await temizle();
  }
});
