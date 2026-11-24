// Panelin Yorumlar ekranı tarayıcıda (kart 0277, karar 0174):
// - Mağaza sahibi menüden klavyeyle gelir; menüde onay bekleyen yorum sayısı (veritabanıyla aynı); liste Onay bekleyen
//   sekmesiyle açılır, Türkçe harfsiz arama adrese yazılır, puan süzgeci klavyeyle seçilip şeritten kaldırılır.
// - Klavyeyle Yayınla ve Reddet: kart sekmeden çıkar, odak sonraki (yoksa önceki) kartın düğmesine geçer.
// - Toplu yayınla: boşlukla seçim, onay, sonuç odakta; aranan sekme boşalınca sonuçsuz hâl, arama yine durur.
// - Yayında sekmesinde "Ana sayfada göster": rozet, odak aynı kartta. Reddedilen sekmesinde HTML yazı olarak görünür.
// - Vitrinde ürün sayfası yayınlanan yorumu gösterir, reddedileni göstermez.
// - Liste, seçimli liste ve onay penceresi iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; konsolda hata yok.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { sql } from "drizzle-orm";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { yorumlar } from "../../moduller/yorum/model";
import { onayBekleyenYorumSayisi } from "../../moduller/yorum/panel-listesi";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { yorumlarAdresi } from "../../yonetim-paneli/adresler";
import { bildirimSuresiniDurdur } from "./bildirim-suresi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = sistemIslemi("uctan-uca-yorum-onayi");
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

// Testin kendi ürünü ve üç onay bekleyen yorumu (A en eski, C en yeni). Ürünün adı Türkçe harfli ve her çalışmada
// ayrıdır: paylaşılan veritabanında başka teste karışmaz.
const hazirla = async () => {
  const ek = randomBytes(4)
    .toString("hex")
    .replace(/[0-9]/g, (r) => "abcdefghij"[Number(r)] ?? "a");
  const ad = `Çiçekli Kupa ${ek}`;
  const adresAdi = `cicekli-kupa-${ek}`;
  const urun = await calisanSiteninUrunServisi().urunEkle(vt, yapan, {
    ad,
    adresAdi,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const yaz = async (puan: number, kisi: string, metni: string, sira: number) => {
    const [satir] = await vt
      .insert(yorumlar)
      .values({
        urun_kimligi: urun,
        puan,
        metin: metni,
        ad: kisi,
        durum: "onay-bekliyor",
        olusturma_zamani: sql`now() - make_interval(mins => ${10 - sira})`,
      })
      .returning({ kimlik: yorumlar.kimlik });
    return satir?.kimlik ?? "";
  };
  const a = { ad: "Ayşe K.", metin: `Kulpu <b>kırık</b> geldi ${ek}` };
  const b = { ad: "Mert A.", metin: `Çiçekleri çok canlı ${ek}` };
  const c = { ad: "Selin B.", metin: `Hediye için aldım ${ek}` };
  await yaz(2, a.ad, a.metin, 1);
  await yaz(5, b.ad, b.metin, 2);
  await yaz(4, c.ad, c.metin, 3);
  return { ad, adresAdi, aranan: `cicekli kupa ${ek}`, a, b, c };
};

test("yorumlar: menüdeki sayı, arama, puan, klavyeyle yayınla ve reddet, toplu yayınla, ana sayfa; vitrin; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page);
  const h = await hazirla();
  await ayriBaglanti(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yoneticiAc());

  // Menüde onay bekleyen sayısı (rozet) ve ekran okuyucu yazısı; menüden klavyeyle.
  const menu = page.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
  const menuBaglantisi = menu.getByRole("link", {
    name: new RegExp(`^${metin("yonetim.sayfa.yorumlar.ad")}`),
  });
  const sayiYazisi = async () =>
    doldur(metin("yonetim.yorumlar.menuSayisi"), {
      sayi: String(await onayBekleyenYorumSayisi(vt)),
    });
  await expect(menuBaglantisi).toHaveAccessibleName(
    `${metin("yonetim.sayfa.yorumlar.ad")} ${await sayiYazisi()}`,
  );
  await menuBaglantisi.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${yorumlarAdresi}$`));
  await sayfaHazir(page);
  const sekmeler = page.getByRole("navigation", { name: metin("yonetim.yorumlar.suzgec.durum") });
  await expect(
    sekmeler.getByRole("link", { name: new RegExp(metin("yonetim.yorumlar.durum.onay-bekliyor")) }),
  ).toHaveAttribute("aria-current", "page");

  // Türkçe harfsiz arama: adrese yazılır, testin üç yorumu en yeni önce.
  const ara = page.getByRole("searchbox", { name: metin("yonetim.yorumlar.ara") });
  await ara.fill(h.aranan);
  await ara.press("Enter");
  await expect(page).toHaveURL(/ara=/);
  const liste = page.getByRole("list", { name: metin("yonetim.yorumlar.liste") });
  const kartlar = liste.getByRole("listitem");
  await expect(kartlar).toHaveCount(3);
  await expect(kartlar.nth(0)).toContainText(h.c.metin);
  await expect(kartlar.nth(2)).toContainText(h.a.metin);
  await ikiRenkUcGenislik(page, "yorum listesi");

  // Puan süzgeci klavyeyle: 5 yıldız; şeritten kaldırılır.
  await page.getByRole("button", { name: metin("yonetim.yorumlar.suzgec.puan") }).focus();
  await page.keyboard.press("Enter");
  const besYildiz = doldur(metin("yonetim.yorumlar.puanSecenegi"), { puan: "5" });
  await page.getByRole("menuitemcheckbox", { name: besYildiz }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(kartlar).toHaveCount(1);
  await expect(kartlar.first()).toContainText(h.b.metin);
  await page
    .getByRole("link", {
      name: doldur(metin("yonetim.liste.suzgeciKaldir"), {
        ad: `${metin("yonetim.yorumlar.suzgec.puan")}: ${besYildiz}`,
      }),
    })
    .click();
  await expect(kartlar).toHaveCount(3);

  const dugme = (eylem: string, kisi: { ad: string }) =>
    page.getByRole("button", {
      name: doldur(metin("yonetim.yorumlar.eylemAdi"), { eylem, ad: kisi.ad, urun: h.ad }),
    });
  const yayinla = metin("yonetim.yorumlar.eylem.yayinla");
  const reddet = metin("yonetim.yorumlar.eylem.reddet");

  // Ortadaki (B) klavyeyle yayınlanır: kart çıkar, odak sonraki karta (A).
  await dugme(yayinla, h.b).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(metin("yonetim.yorumlar.basari.yayinlandi"))).toBeVisible();
  await expect(kartlar).toHaveCount(2);
  await expect(dugme(yayinla, h.a)).toBeFocused();
  // Son kart (A) reddedilir: sonraki yok, odak öncekine (C).
  await page.keyboard.press("Tab");
  await expect(dugme(reddet, h.a)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(kartlar).toHaveCount(1);
  await expect(dugme(yayinla, h.c)).toBeFocused();

  // Menüdeki sayı sayfa yenilenince güncel.
  await expect(menuBaglantisi).toHaveAccessibleName(
    `${metin("yonetim.sayfa.yorumlar.ad")} ${await sayiYazisi()}`,
  );

  // Toplu yayınla: boşlukla seçim, çubuk, onay, sonuç odakta.
  await page.getByRole("checkbox", { name: `Seç: ${h.c.ad}, ${h.ad}` }).focus();
  await page.keyboard.press("Space");
  const cubuk = page.getByRole("region", { name: metin("yonetim.liste.topluIslem") });
  await expect(cubuk).toBeVisible();
  await ikiRenkUcGenislik(page, "seçimli yorum listesi");
  await cubuk.getByRole("button", { name: yayinla }).click();
  const onay = page.getByRole("alertdialog");
  await expect(onay).toContainText(
    doldur(metin("yonetim.yorumlar.toplu.yayinla.baslik"), { sayi: "1" }),
  );
  await tara(page, "toplu yayınla onayı");
  await onay.getByRole("button", { name: yayinla }).click();
  const sonuc = page.getByText(
    doldur(metin("yonetim.yorumlar.toplu.yayinla.basari"), { sayi: "1" }),
  );
  await expect(sonuc).toBeVisible();
  await expect(page.locator(":focus")).toContainText(
    doldur(metin("yonetim.yorumlar.toplu.yayinla.basari"), { sayi: "1" }),
  );
  // Aranan sekme boşaldı: sonuçsuz hâl (arama seçili), arama ve sekmeler yine durur.
  await expect(page.getByText(metin("yonetim.liste.sonucsuz.baslik"))).toBeVisible();
  await expect(ara).toBeVisible();

  // Yayında: ana sayfada göster, rozet, odak aynı kartta.
  await sekmeler
    .getByRole("link", { name: new RegExp(metin("yonetim.yorumlar.durum.yayinda")) })
    .click();
  await expect(page).toHaveURL(/durum=yayinda/);
  await expect(kartlar).toHaveCount(2);
  await dugme(metin("yonetim.yorumlar.eylem.anaSayfadaGoster"), h.b).focus();
  await page.keyboard.press("Enter");
  await expect(dugme(metin("yonetim.yorumlar.eylem.anaSayfadanKaldir"), h.b)).toBeFocused();
  await expect(kartlar.filter({ hasText: h.b.metin })).toContainText(
    metin("yonetim.yorumlar.anaSayfada"),
  );
  await ikiRenkUcGenislik(page, "yayındaki yorumlar");

  // Reddedilen: HTML yazı olarak, yeniden yayınlanabilir.
  await sekmeler
    .getByRole("link", { name: new RegExp(metin("yonetim.yorumlar.durum.reddedildi")) })
    .click();
  await expect(page).toHaveURL(/durum=reddedildi/);
  await expect(kartlar).toHaveCount(1);
  await expect(kartlar.first()).toContainText(h.a.metin);
  expect(await kartlar.first().locator("b").count()).toBe(0);
  await expect(dugme(yayinla, h.a)).toBeVisible();

  // Vitrin: yayınlanan yorum ürün sayfasında, reddedilen yok.
  await page.goto(kayitAdresleri.urun(h.adresAdi));
  await sayfaHazir(page);
  await expect(page.getByText(h.b.metin)).toBeVisible();
  await expect(page.getByText(h.c.metin)).toBeVisible();
  await expect(page.getByText(h.a.metin)).toHaveCount(0);
  expect(hatalar).toEqual([]);
});
