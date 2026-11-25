// Blog tarayıcıda (kart 0272, karar 0176):
// - Mağaza sahibi menüden klavyeyle Blog'a gelir; ekran (anahtar ve liste) iki renkte ve üç genişlikte taramadan geçer.
// - "Yazı ekle": boş başlıkta alanın hatası ve odak; başlık, özet ve kalın yazılı içerik klavyeyle yazılır, kategori
//   seçilir, yazı taslak olarak kaydedilir ve yazının ekranı açılır. Yayın durumu ok tuşuyla "Yayında" yapılıp kaydedilir;
//   "Vitrinde gör" yazının sayfasını başlığı, kategorisi, kalın içeriği ve sayfa yoluyla açar; /blog listesinde yazı
//   görünür, kategori seçimi adreste durur ve seçili bağlantı işaretlidir.
// - Yazı formu iki renkte ve üç genişlikte taranır. Silme onayla: Vazgeç silmez; silinen yazının adresi bulunamaz.
// - Blog kategorileri: pencerede klavyeyle eklenir, onayla silinir; ekran ve pencere taranır.
// - Konsolda hata yok (bilerek gönderilen hatalı formun 400'ü ve silinen yazının 404'ü dışında).
//
// Testin yazıları ve kategorileri "Deneme <ek>" ile başlar, sonunda silinir.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { like } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { blogKategorileri, blogYazilari } from "../../moduller/icerik/model";
import { blogYazisiOku, icerikServisi } from "../../moduller/icerik/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { blogListesiAdresi } from "../../vitrin/adresler";
import { blogAdresi, blogKategorileriAdresi } from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("tarayici-testi");
const servis = () => icerikServisi(() => calisanSite().ayarlar.saatDilimi);
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

test.afterAll(async () => {
  await vt.$client.end();
});

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

// Testin yazılarını ve kategorilerini siler.
const temizle = async (ek: string) => {
  const kalan = await vt
    .select({ kimlik: blogYazilari.kimlik })
    .from(blogYazilari)
    .where(like(blogYazilari.baslik, `Deneme ${ek}%`));
  for (const { kimlik } of kalan)
    await servis()
      .yaziSil(vt, yapan, kimlik)
      .catch(() => undefined);
  const kategoriler = await vt
    .select({ kimlik: blogKategorileri.kimlik })
    .from(blogKategorileri)
    .where(like(blogKategorileri.ad, `Deneme ${ek}%`));
  for (const { kimlik } of kategoriler) {
    await servis()
      .kategoriSil(vt, yapan, kimlik)
      .catch(() => undefined);
  }
};

const beklenenHata = (ileti: string) => ileti.includes("status of 400") || ileti.includes("404");

test("blog: mağaza sahibi klavyeyle yazar, yayınlar, vitrinde okur ve siler; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const ek = randomBytes(3).toString("hex");
  const kategori = await servis().kategoriEkle(vt, yapan, { ad: `Deneme ${ek} Rehber` });
  const kategoriAdresi = `deneme-${ek}-rehber`;
  const konsol = konsoluDinle(page, { haric: beklenenHata });
  try {
    await ayriBaglanti(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());

    const menu = page.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
    await menu.getByRole("link", { name: metin("yonetim.sayfa.blog.ad"), exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${blogAdresi}$`));
    await sayfaHazir(page);
    await expect(
      page.getByRole("switch", { name: metin("yonetim.blog.ayar.anahtar") }),
    ).toBeVisible();
    await ikiRenkUcGenislik(page, "blog listesi");

    // Yazı ekle: boş başlıkta alanın hatası ve odak.
    const ekle = page.getByRole("link", { name: metin("yonetim.eylem.yaziEkle") });
    await ekle.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${blogAdresi}/yeni$`));
    await sayfaHazir(page);
    const kaydet = page.getByRole("button", { name: metin("yonetim.blog.ekle"), exact: true });
    await kaydet.focus();
    await page.keyboard.press("Enter");
    const baslik = page.getByRole("textbox", { name: metin("yonetim.blog.baslik") });
    await expect(baslik).toBeFocused();
    await expect(baslik).toHaveAttribute("aria-invalid", "true");

    await page.keyboard.type(`Deneme ${ek} Kış rehberi`);
    await page.keyboard.press("Tab");
    await page.keyboard.type("Katmanlı giyinmenin kısa rehberi.");
    // Biçimli içerik: araç çubuğu tek sekme durağı, sonra yazı alanı; Ctrl+B kalın yazar.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const icerik = page.getByRole("textbox", { name: metin("yonetim.blog.icerik"), exact: true });
    await expect(icerik).toBeFocused();
    await page.keyboard.type("Sabahları ");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type("ince katmanlar");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type(" daha rahattır.");

    // Kategori: seçim kutusu klavyeyle.
    const kategoriKutusu = page.getByRole("combobox", { name: metin("yonetim.blog.kategori") });
    await kategoriKutusu.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("option", { name: `Deneme ${ek} Rehber` }).focus();
    await page.keyboard.press("Enter");
    await expect(kategoriKutusu).toHaveText(`Deneme ${ek} Rehber`);

    await kaydet.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/yonetim\/blog\/yazi\?kimlik=/);
    await sayfaHazir(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Deneme ${ek} Kış rehberi`);
    const kimlik = new URL(page.url()).searchParams.get("kimlik") ?? "";
    const yazi = await blogYazisiOku(vt, kimlik);
    expect(yazi).toMatchObject({ durum: "taslak", kategori: kategori.kimlik });
    expect(yazi?.icerik).toContain("<strong>ince katmanlar</strong>");
    // Taslak vitrinde değildir: "Vitrinde gör" yok.
    await expect(page.getByRole("link", { name: metin("yonetim.eylem.vitrindeGor") })).toHaveCount(
      0,
    );
    await ikiRenkUcGenislik(page, "yazı formu");

    // Yayın durumu klavyeyle: radyo grubunda ok tuşları.
    const taslak = page.getByRole("radio", { name: metin("yonetim.blog.durum.taslak") });
    await taslak.focus();
    await expect(taslak).toBeChecked();
    await page.keyboard.press("ArrowUp", { delay: 50 });
    await page.keyboard.press("ArrowUp", { delay: 50 });
    await expect(
      page.getByRole("radio", { name: metin("yonetim.blog.durum.yayinda") }),
    ).toBeChecked();
    const kaydetVar = page.getByRole("button", { name: metin("yonetim.blog.kaydet"), exact: true });
    await kaydetVar.focus();
    await page.keyboard.press("Enter");
    const vitrindeGor = page.getByRole("link", { name: metin("yonetim.eylem.vitrindeGor") });
    await expect(vitrindeGor).toBeVisible();
    expect((await blogYazisiOku(vt, kimlik))?.durum).toBe("yayinda");

    // Vitrinde yazının sayfası.
    await expect(vitrindeGor).toHaveAttribute("target", "_blank");
    const adres = (await vitrindeGor.getAttribute("href")) ?? "";
    const vitrin = await page.context().newPage();
    await vitrin.goto(adres);
    await sayfaHazir(vitrin);
    await expect(vitrin.getByRole("heading", { level: 1 })).toHaveText(`Deneme ${ek} Kış rehberi`);
    await expect(vitrin.locator("strong", { hasText: "ince katmanlar" })).toBeVisible();
    await expect(
      vitrin.getByRole("navigation", { name: metin("ortak.parca.sayfaYolu") }).getByRole("link", {
        name: metin("vitrin.blog.baslik"),
      }),
    ).toBeVisible();
    // Kategorinin bağlantısı listeyi o kategoriyle açar; seçili bağlantı işaretlidir.
    await vitrin.getByRole("link", { name: `Deneme ${ek} Rehber` }).click();
    await expect(vitrin).toHaveURL(new RegExp(`\\?kategori=${kategoriAdresi}$`));
    await sayfaHazir(vitrin);
    await expect(
      vitrin
        .getByRole("navigation", { name: metin("vitrin.blog.kategoriler") })
        .getByRole("link", { name: `Deneme ${ek} Rehber` }),
    ).toHaveAttribute("aria-current", "page");
    await expect(vitrin.getByRole("link", { name: `Deneme ${ek} Kış rehberi` })).toBeVisible();
    await vitrin.goto(blogListesiAdresi({}));
    await sayfaHazir(vitrin);
    await expect(vitrin.getByRole("link", { name: `Deneme ${ek} Kış rehberi` })).toBeVisible();

    // Silme onayla: Vazgeç silmez, Sil siler ve listeye döner; yazının adresi bulunamaz.
    const sil = page.getByRole("button", { name: metin("yonetim.blog.sil"), exact: true });
    await sil.focus();
    await page.keyboard.press("Enter");
    const pencere = page.getByRole("alertdialog");
    await expect(pencere).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(pencere).toBeHidden();
    await expect(sil).toBeFocused();
    expect(await blogYazisiOku(vt, kimlik)).not.toBeNull();
    await page.keyboard.press("Enter");
    await pencere.getByRole("button", { name: metin("yonetim.blog.sil") }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${blogAdresi}$`));
    expect(await blogYazisiOku(vt, kimlik)).toBeNull();
    const yanit = await vitrin.goto(adres);
    expect(yanit?.status()).toBe(404);
    await vitrin.close();
    expect(konsol).toEqual([]);
  } finally {
    await temizle(ek);
  }
});

test("blog kategorileri: pencerede klavyeyle eklenir, onayla silinir; tarama", async ({ page }) => {
  test.setTimeout(240_000);
  const ek = randomBytes(3).toString("hex");
  const konsol = konsoluDinle(page, { haric: beklenenHata });
  try {
    await ayriBaglanti(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());
    await page.goto(blogAdresi);
    await sayfaHazir(page);
    const kategoriler = page.getByRole("link", { name: metin("yonetim.eylem.blogKategorileri") });
    await kategoriler.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${blogKategorileriAdresi}$`));
    await sayfaHazir(page);

    const ekleAdi = doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.blog.kategoriTek") });
    await page.getByRole("button", { name: ekleAdi }).first().focus();
    await page.keyboard.press("Enter");
    const pencere = page.getByRole("dialog");
    await expect(pencere).toBeVisible();
    await expect(
      pencere.getByRole("textbox", { name: metin("yonetim.kategori.form.ad"), exact: true }),
    ).toBeFocused();
    await page.keyboard.type(`Deneme ${ek} Bakım`);
    await tara(page, "kategori penceresi");
    await page.keyboard.press("Enter");
    await expect(pencere).toBeHidden();
    const satir = page.getByText(`Deneme ${ek} Bakım`, { exact: true });
    await expect(satir).toBeVisible();
    await expect(
      page.getByText(`/blog?kategori=deneme-${ek}-bakim`, { exact: false }),
    ).toBeVisible();
    await ikiRenkUcGenislik(page, "blog kategorileri");

    await page
      .getByRole("button", {
        name: doldur(metin("yonetim.kategori.silAdli"), { ad: `Deneme ${ek} Bakım` }),
      })
      .focus();
    await page.keyboard.press("Enter");
    const onay = page.getByRole("alertdialog");
    await expect(onay).toContainText(metin("yonetim.blog.kategoriSilOnay.yazisiz"));
    await onay.getByRole("button", { name: metin("yonetim.kategori.sil") }).focus();
    await page.keyboard.press("Enter");
    await expect(satir).toBeHidden();
    expect(konsol).toEqual([]);
  } finally {
    await temizle(ek);
  }
});
