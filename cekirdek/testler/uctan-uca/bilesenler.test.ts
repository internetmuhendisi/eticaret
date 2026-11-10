// Ortak parçalar gerçek tarayıcıda (kart 0103, 0104): bileşen kataloğunun ana sayfası bütün parçaları bir
// arada gösterir; açık ve koyu temada, üç genişlikte erişilebilirlik taramasından (axe, WCAG 2.2 AA) geçer; açılır parçalar açıkken
// de taranır. Her parça yalnız klavyeyle kullanılır: odak açılan parçaya girer, Escape kapatır, odak açan
// öğeye döner. Sayfa yana kaymaz, konsolda hata yoktur, hareketi azaltan kullanıcıda hareket olmaz.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { sayfaHazir } from "./sayfa-hazir";

const adres = "/gelistirme/bilesenler";
const m = (anahtar: string) => metin(`gelistirme.ornek.${anahtar}` as MetinAnahtari);
const dugme = (page: Page, ad: string) => page.getByRole("button", { name: ad, exact: true });

const ac = async (page: Page) => {
  const hatalar: string[] = [];
  page.on("console", (ileti) => {
    if (ileti.type() === "error") hatalar.push(ileti.text());
  });
  page.on("pageerror", (hata) => hatalar.push(hata.message));
  await page.goto(adres);
  await sayfaHazir(page);
  return hatalar;
};

// Açılış animasyonu sürerken öğeler yarı saydamdır, kontrast yanlış ölçülür: tarama sonlu animasyonların
// bitmesini bekler. Next.js'in geliştirme göstergesi sayfanın parçası değildir, taranmaz.
const tara = async (page: Page, ne: string) => {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY)
        // Kapanırken iptal edilen animasyonun sözü hatayla biter; o da bitmiş sayılır.
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

const odakta = (oge: Locator) => expect(oge).toBeFocused();

for (const tema of ["light", "dark"] as const) {
  for (const { ad, width, height } of [
    { ad: "telefon", width: 375, height: 800 },
    { ad: "tablet", width: 768, height: 1000 },
    { ad: "masaüstü", width: 1280, height: 900 },
  ]) {
    test(`katalog ${tema === "light" ? "açık" : "koyu"} temada, ${ad} genişliğinde taramadan geçer`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme: tema });
      const hatalar = await ac(page);
      await tara(page, "sayfa");

      // Sayfa yana kaymaz.
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0);

      // Her açılır parça açıkken de taranır.
      await dugme(page, m("eylemler")).click();
      await expect(page.getByRole("menu")).toBeVisible();
      await tara(page, "açılır menü");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu")).toHaveCount(0);

      await page.getByRole("combobox", { name: m("zaman") }).click();
      await expect(page.getByRole("listbox")).toBeVisible();
      await tara(page, "seçim listesi");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("listbox")).toHaveCount(0);

      for (const [acan, baslik] of [
        ["pencereyiAc", "pencereBasligi"],
        ["yanPencereyiAc", "yanPencereBasligi"],
      ]) {
        await dugme(page, m(acan ?? "")).click();
        const pencere = page.getByRole("dialog", { name: m(baslik ?? "") });
        await expect(pencere).toBeVisible();
        await tara(page, m(acan ?? ""));
        // Pencere ekrana sığar, sayfa yana kaymaz.
        const kutu = await pencere.boundingBox();
        expect((kutu?.x ?? -1) >= 0 && (kutu?.x ?? 0) + (kutu?.width ?? 0) <= width + 1).toBe(true);
        await page.keyboard.press("Escape");
        await expect(pencere).toHaveCount(0);
      }

      // Sayfa kayınca Radix ipucunu kapatır: düğme önce görünür alana getirilir, sonra odaklanır.
      await dugme(page, m("kargoHakkinda")).scrollIntoViewIfNeeded();
      // Kaydırma olayı bir sonraki karede gelir; odaktan sonra gelirse ipucu kapanır.
      await page.evaluate(
        () => new Promise((bitti) => requestAnimationFrame(() => requestAnimationFrame(bitti))),
      );
      await dugme(page, m("kargoHakkinda")).focus();
      await expect(page.getByRole("tooltip")).toContainText(m("kargoIpucu"));
      await tara(page, "ipucu");
      await page.keyboard.press("Escape");

      await dugme(page, m("bildirimGoster")).click();
      await expect(page.getByText(m("bildirimMetni"), { exact: true })).toBeVisible();
      await tara(page, "bildirim");

      await dugme(page, m("soruBir")).click();
      await expect(page.getByText(m("cevapBir"), { exact: true })).toBeVisible();
      await tara(page, "açık akordeon");

      expect(hatalar).toEqual([]);
    });
  }
}

test.describe("klavye", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ac(page);
  });

  test("düğme Enter ve boşlukla çalışır, odak görünür", async ({ page }) => {
    const kaydet = page
      .getByRole("region", { name: metin("gelistirme.katalog.parca.dugme") })
      .getByRole("button", { name: m("birincil"), exact: true });
    await kaydet.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: m("basildi") })).toBeVisible();
    const cerceve = await kaydet.evaluate((e) => getComputedStyle(e).outlineStyle);
    expect(cerceve).toBe("solid");
    // Kapalı düğme odak almaz.
    await expect(dugme(page, m("kapali"))).toBeDisabled();
  });

  test("yalnız ikonlu düğmenin adı vardır, odaklanınca ipucunda görünür", async ({ page }) => {
    const bilgi = dugme(page, m("ikonDugmesi"));
    await bilgi.focus();
    await expect(page.getByRole("tooltip")).toHaveText(m("ikonDugmesi"));
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });

  test("giriş alanı etiketiyle bulunur, açıklaması ve hatası alana bağlıdır", async ({ page }) => {
    const ad = page.getByLabel(m("ad"), { exact: true });
    await ad.focus();
    await page.keyboard.type("Deneme");
    await expect(ad).toHaveValue("Deneme");
    await expect(ad).toHaveAccessibleDescription(m("adAciklama"));
    const soyad = page.getByLabel(m("soyad"), { exact: true });
    await expect(soyad).toHaveAttribute("aria-invalid", "true");
    await expect(soyad).toHaveAccessibleDescription(m("soyadHata"));
  });

  // Kart 0106: uzun metin alanı Enter'la yeni satır açar, formu göndermez; odak görünür; yazdıkça uzar.
  test("uzun metin alanı çok satır alır, açıklaması ve hatası bağlıdır, odak görünür", async ({
    page,
  }) => {
    const bolum = page.getByRole("region", {
      name: metin("gelistirme.katalog.parca.uzunMetinAlani"),
    });
    const [not, hatali] = [bolum.getByRole("textbox").nth(0), bolum.getByRole("textbox").nth(1)];
    await not.focus();
    expect(await not.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe("solid");
    const ilkYukseklik = await not.evaluate((e) => e.getBoundingClientRect().height);
    await page.keyboard.type("Birinci satır");
    for (let i = 0; i < 4; i += 1) await page.keyboard.press("Enter");
    await page.keyboard.type("Son satır");
    await expect(not).toHaveValue("Birinci satır\n\n\n\nSon satır");
    expect(await not.evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThan(
      ilkYukseklik,
    );
    await expect(not).toHaveAccessibleDescription(m("siparisNotuAciklama"));
    await expect(hatali).toHaveAttribute("aria-invalid", "true");
    await expect(hatali).toHaveAccessibleDescription(m("siparisNotuHata"));
  });

  test("seçim kutusu klavyeyle açılır, seçilir ve kapanır", async ({ page }) => {
    const secim = page.getByRole("combobox", { name: m("zaman") });
    await secim.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await odakta(secim);
    await expect(secim).not.toHaveText(m("zamanSec"));
    const secilen = await secim.textContent();
    expect([m("sabah"), m("ogle"), m("aksam")]).toContain(secilen);
  });

  test("onay kutusu boşlukla işaretlenir, yazısına basmak da işaretler", async ({ page }) => {
    const kutu = page.getByRole("checkbox", { name: m("onay") });
    await kutu.focus();
    await page.keyboard.press("Space");
    await expect(kutu).toHaveAttribute("aria-checked", "true");
    await page.getByText(m("onay"), { exact: true }).click();
    await expect(kutu).toHaveAttribute("aria-checked", "false");
    // Dokunma alanı yazının tamamıdır.
    const etiket = await page.locator("label", { hasText: m("onay") }).boundingBox();
    expect(etiket?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("açılır menü ok tuşlarıyla gezilir, alt menüye girilir, Escape odağı geri verir", async ({
    page,
  }) => {
    const tetik = dugme(page, m("eylemler"));
    await tetik.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu").first();
    await expect(menu).toBeVisible();
    await odakta(page.getByRole("menuitem", { name: m("duzenle") }));
    await page.keyboard.press("ArrowDown");
    await odakta(page.getByRole("menuitem", { name: m("kopyala") }));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: m("kopyala") })).toBeVisible();
    await expect(page.getByRole("menu")).toHaveCount(0);
    await odakta(tetik);

    // Alt menü: sağ ok açar, seçilen öğe çalışır.
    await page.keyboard.press("Enter");
    await odakta(page.getByRole("menuitem", { name: m("duzenle") }));
    await page.keyboard.press("ArrowDown");
    await odakta(page.getByRole("menuitem", { name: m("kopyala") }));
    await page.keyboard.press("ArrowDown");
    await odakta(page.getByRole("menuitem", { name: m("paylas") }));
    await page.keyboard.press("ArrowRight");
    await odakta(page.getByRole("menuitem", { name: m("epostaIle") }));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: m("epostaIle") })).toBeVisible();
    await expect(page.getByRole("menu")).toHaveCount(0);

    // Onay öğesi boşlukla değişir; Escape menüyü kapatır, odak tetikleyiciye döner.
    await tetik.focus();
    await page.keyboard.press("Enter");
    const ayrinti = page.getByRole("menuitemcheckbox", { name: m("ayrintilar") });
    await expect(ayrinti).toHaveAttribute("aria-checked", "true");
    // Onay öğesi seçilince değişir ve menü kapanır.
    await ayrinti.focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await tetik.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitemcheckbox", { name: m("ayrintilar") })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await odakta(tetik);
  });

  for (const [acan, baslik] of [
    ["pencereyiAc", "pencereBasligi"],
    ["yanPencereyiAc", "yanPencereBasligi"],
  ] as const) {
    test(`${m(acan)}: odak içeride kalır, Escape ve kapat düğmesi kapatır, odak geri döner`, async ({
      page,
    }) => {
      const tetik = dugme(page, m(acan));
      await tetik.focus();
      await page.keyboard.press("Enter");
      const pencere = page.getByRole("dialog", { name: m(baslik) });
      await expect(pencere).toBeVisible();
      // Tab ile dolaşan odak pencerenin dışına çıkmaz.
      for (let sira = 0; sira < 8; sira++) {
        await page.keyboard.press("Tab");
        expect(
          await pencere.evaluate((p) => p.contains(document.activeElement)),
          `${sira + 1}. Tab`,
        ).toBe(true);
      }
      // Pencerenin dışı etkisizdir (inert): ekran okuyucuya kapalıdır, odak alamaz.
      expect(await page.locator("main").evaluate((e) => e.closest("[inert]") !== null)).toBe(true);
      await page
        .locator("main button")
        .first()
        .evaluate((e) => (e as HTMLElement).focus());
      expect(await pencere.evaluate((p) => p.contains(document.activeElement))).toBe(true);
      // Odak kapat düğmesindeyken ipucu açıktır: ilk Escape ipucunu, ikincisi pencereyi kapatır.
      const kapat = pencere.getByRole("button", { name: metin("ortak.parca.kapat"), exact: true });
      await kapat.focus();
      await expect(page.getByRole("tooltip")).toHaveText(metin("ortak.parca.kapat"));
      await page.keyboard.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await expect(pencere).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(pencere).toHaveCount(0);
      await odakta(tetik);
      // İpucu açılırken hemen kapatılırsa (animasyonu sürerken) Escape'i boşa yutmaz.
      await page.keyboard.press("Enter");
      await kapat.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Escape");
      await expect(pencere).toHaveCount(0);
      await odakta(tetik);

      await page.keyboard.press("Enter");
      await pencere.getByRole("button", { name: metin("ortak.parca.kapat"), exact: true }).click();
      await expect(pencere).toHaveCount(0);
      await odakta(tetik);
    });
  }

  // Bir noktada en üstte çizilen öğe beklenen parçanın içindeyse parça görünür, arkada kalmamıştır.
  // Açılış hareketi sürerken ölçülmesin diye yerleşene kadar yeniden denenir.
  const enUstte = (oge: Locator) =>
    oge.evaluate((e) => {
      const kutu = e.getBoundingClientRect();
      const ustteki = document.elementFromPoint(kutu.x + kutu.width / 2, kutu.y + kutu.height / 2);
      return ustteki !== null && e.contains(ustteki);
    });

  for (const genislik of [375, 1280]) {
    test(`pencerenin içinde açılanlar pencerenin üstündedir, bildirim pencere açıkken okunur (${genislik} px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: genislik, height: 800 });
      await dugme(page, m("pencereyiAc")).click();
      const pencere = page.getByRole("dialog", { name: m("pencereBasligi") });
      await expect(pencere).toBeVisible();

      // Kapat düğmesinin ipucu pencerenin üstünde görünür.
      await pencere.getByRole("button", { name: metin("ortak.parca.kapat"), exact: true }).focus();
      const ipucu = page.getByRole("tooltip");
      await expect(ipucu).toBeVisible();
      await expect.poll(() => enUstte(page.locator('[data-slot="ipucu"]'))).toBe(true);

      // Pencerenin içindeki seçim listesi pencerenin üstünde açılır, klavyeyle seçilir, pencere açık kalır.
      const secim = pencere.getByRole("combobox", { name: m("zaman") });
      await secim.focus();
      await page.keyboard.press("Enter");
      const liste = page.getByRole("listbox");
      await expect(liste).toBeVisible();
      await expect.poll(() => enUstte(liste)).toBe(true);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await expect(liste).toHaveCount(0);
      await expect(secim).not.toHaveText(m("zamanSec"));
      await expect(pencere).toBeVisible();

      // Pencereden verilen bildirim etkisiz değildir: ekran okuyucuya açıktır, görünür ve en üsttedir,
      // kapat düğmesine fareyle basılır ve bu pencereyi kapatmaz. Klavye odağı pencerede kalır (WAI-ARIA'nın
      // pencere kalıbı); bildirim odak almadan okunur.
      await pencere.getByRole("button", { name: m("bildirimGoster"), exact: true }).click();
      const alan = page.getByRole("region", { name: metin("ortak.parca.bildirimler") });
      await expect(alan).toContainText(m("bildirimMetni"));
      expect(await alan.evaluate((e) => e.closest("[inert]") === null)).toBe(true);
      const bildirim = page.locator("[data-sonner-toast]").first();
      await expect.poll(() => enUstte(bildirim)).toBe(true);
      await alan.getByRole("button", { name: metin("ortak.parca.bildirimiKapat") }).click();
      await expect(alan).not.toContainText(m("bildirimMetni"));
      await expect(pencere).toBeVisible();
    });
  }

  test("sekmeler ok tuşlarıyla değişir, seçili sekme kalın yazıyla da ayrılır", async ({
    page,
  }) => {
    const aciklama = page.getByRole("tab", { name: m("aciklamaSekmesi") });
    const ozellikler = page.getByRole("tab", { name: m("ozelliklerSekmesi") });
    await aciklama.focus();
    await page.keyboard.press("ArrowRight");
    await odakta(ozellikler);
    await expect(ozellikler).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveText(m("ozelliklerIcerigi"));
    const kalinlik = async (oge: Locator) =>
      Number(await oge.evaluate((e) => getComputedStyle(e).fontWeight));
    expect(await kalinlik(ozellikler)).toBeGreaterThan(await kalinlik(aciklama));
  });

  test("bildirim ekran okuyucuya okunur, kapat düğmesinin adı vardır", async ({ page }) => {
    await dugme(page, m("bildirimGoster")).focus();
    await page.keyboard.press("Enter");
    const alan = page.getByRole("region", { name: metin("ortak.parca.bildirimler") });
    await expect(alan).toContainText(m("bildirimMetni"));
    await expect(
      alan.getByRole("button", { name: metin("ortak.parca.bildirimiKapat"), exact: true }),
    ).toBeVisible();
  });

  test("yükleniyor göstergesinin adı vardır, iskelet ekran okuyucuya görünmez", async ({
    page,
  }) => {
    // Durum alanının adı içeriğinden gelmez; ekran okuyucunun okuduğu, alanın içindeki yazıdır.
    await expect(
      page.getByRole("status").filter({ hasText: m("urunlerYukleniyor") }),
    ).toBeAttached();
    const iskeletler = page.locator('[data-slot="iskelet"]');
    await expect(iskeletler).toHaveCount(2);
    for (const iskelet of await iskeletler.all()) {
      await expect(iskelet).toHaveAttribute("aria-hidden", "true");
    }
  });

  test("kaydırmalı şerit düğmeleriyle ve ok tuşlarıyla geçer", async ({ page }) => {
    const serit = page.getByRole("region", { name: m("seritEtiketi") });
    await expect(serit).toHaveAttribute("aria-roledescription", metin("ortak.parca.seritTanimi"));
    const onceki = serit.getByRole("button", { name: metin("ortak.parca.onceki"), exact: true });
    const sonraki = serit.getByRole("button", { name: metin("ortak.parca.sonraki"), exact: true });
    await expect(onceki).toBeDisabled();
    await sonraki.focus();
    await page.keyboard.press("Enter");
    await expect(onceki).toBeEnabled();
    await page.keyboard.press("ArrowLeft");
    await expect(onceki).toBeDisabled();

    // Şeridin içindeki yazı alanında ok tuşu imleci yürütür, şeridi kaydırmaz.
    const not = serit.getByLabel(m("seritNotu"), { exact: true });
    await not.focus();
    await page.keyboard.type("abc");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    expect(await not.evaluate((e) => (e as HTMLInputElement).selectionStart)).toBe(1);
    await page.keyboard.press("ArrowRight");
    expect(await not.evaluate((e) => (e as HTMLInputElement).selectionStart)).toBe(2);
    await expect(onceki).toBeDisabled();
  });

  test("akordeon Enter ile açılıp kapanır, ok tuşu sonraki başlığa geçer", async ({ page }) => {
    const bir = dugme(page, m("soruBir"));
    await bir.focus();
    await page.keyboard.press("Enter");
    await expect(bir).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(m("cevapBir"), { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await odakta(dugme(page, m("soruIki")));
    await bir.focus();
    await page.keyboard.press("Enter");
    await expect(bir).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText(m("cevapBir"), { exact: true })).toHaveCount(0);
  });

  test("hareketi azaltan kullanıcıda açılış hareketi ve dönme yoktur", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await dugme(page, m("pencereyiAc")).click();
    const pencere = page.getByRole("dialog", { name: m("pencereBasligi") });
    await expect(pencere).toBeVisible();
    expect(await pencere.evaluate((e) => getComputedStyle(e).animationDuration)).toBe("0s");
    await page.keyboard.press("Escape");
    await expect(pencere).toHaveCount(0);
    const donen = page
      .getByRole("status")
      .filter({ hasText: m("urunlerYukleniyor") })
      .locator("svg");
    expect(await donen.evaluate((e) => getComputedStyle(e).animationIterationCount)).toBe("1");
  });
});
