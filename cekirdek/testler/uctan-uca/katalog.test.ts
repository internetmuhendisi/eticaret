// Bileşen kataloğu gerçek tarayıcıda (kart 0104): her parçanın kendi sayfası açık ve koyu temada, telefon,
// tablet ve masaüstü genişliğinde erişilebilirlik taramasından geçer, yana kaymaz, konsolda hata yoktur ve
// kullanıldığı yerleri listeler. Renk seçimi cihazın tercihini geçersiz kılar, açılır parçalara da geçer;
// genişlik seçimi sayfayı o genişlikte bir çerçevede aynı renkle açar. Ana sayfa her parçayı gösterir.
// Klavye denemeleri ana sayfada bilesenler.test.ts'tedir.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { kontrastOrani } from "../../../bilesenler/tasarim-degerleri/kontrast";
import { katalogAdresi, katalogParcalari } from "../../katalog/kayit";
import kullanimlar from "../../katalog/kullanimlar.json" with { type: "json" };
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { basilmayanNoktalar } from "./basilan-alan";
import { konsoluDinle } from "./konsol";
import { satirlarinSolu, satirlarinYazisi } from "./satir-hizasi";
import { sayfaHazir } from "./sayfa-hazir";

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

const ac = async (page: Page, adres: string) => {
  const hatalar = konsoluDinle(page);
  const yanit = await page.goto(adres);
  await sayfaHazir(page);
  return { hatalar, durum: yanit?.status() };
};

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

const zemin = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

for (const parca of katalogParcalari) {
  test(`${parca.kod}: iki renkte ve üç genişlikte taramadan geçer, kullanıldığı yerleri gösterir`, async ({
    page,
  }) => {
    const hatalar: string[] = [];
    for (const renk of ["acik", "koyu"] as const) {
      for (const { ad, width, height } of genislikler) {
        await page.setViewportSize({ width, height });
        const sayfa = await ac(page, `${katalogAdresi}/${parca.kod}?renk=${renk}`);
        expect(sayfa.durum).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("data-renk", renk);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(metin(parca.baslik));
        await expect(
          page.getByRole("region", { name: metin(parca.baslik), exact: true }),
        ).toBeVisible();
        await tara(page, `${renk}, ${ad}`);
        expect(await yanaKayma(page), `${renk}, ${ad}`).toBe(0);
        hatalar.push(...sayfa.hatalar);
      }
    }
    // Dosyası ve onu kullanan dosyalar (kullanimlar.json) listelenir; kullanılmıyorsa bu söylenir.
    await expect(page.getByText(parca.dosya, { exact: true })).toBeVisible();
    const kullananlar = (kullanimlar as Record<string, string[]>)[parca.dosya] ?? [];
    if (kullananlar.length === 0) {
      await expect(page.getByText(metin("gelistirme.katalog.kullanilmiyor"))).toBeVisible();
    }
    for (const dosya of kullananlar) {
      await expect(page.getByRole("listitem").filter({ hasText: dosya })).toHaveCount(1);
    }
    expect(hatalar).toEqual([]);
  });
}

test("ana sayfa her parçayı kendi bölümünde ve sayfasına bağlantıyla gösterir", async ({
  page,
}) => {
  const { hatalar } = await ac(page, katalogAdresi);
  for (const parca of katalogParcalari) {
    const bolum = page.getByRole("region", { name: metin(parca.baslik), exact: true });
    await expect(bolum).toBeVisible();
    await expect(bolum.getByRole("heading", { level: 2 }).getByRole("link")).toHaveAttribute(
      "href",
      `${katalogAdresi}/${parca.kod}`,
    );
  }
  expect(hatalar).toEqual([]);
});

// Seçenek grubu (kart 0138): Tab gruba girer, ok tuşları değerleri gezer ve seçer; seçilemeyen değer odak alır
// ama seçilmez, adı ekiyle okunur, aria-disabled'dır. Radix ok tuşunda seçimi tuş basılıyken yapar: tuşa gerçek bir
// süre basılır.
test("seçenek grubu: ok tuşları seçer, seçilemeyen değer odak alır ama seçilmez", async ({
  page,
}) => {
  const { hatalar } = await ac(page, `${katalogAdresi}/secenek-grubu`);
  const grup = page.getByRole("radiogroup", { name: metin("gelistirme.ornek.beden") });
  await expect(grup.getByRole("radio", { checked: true })).toHaveText("S");
  const ek = metin("gelistirme.ornek.tukendiEki").trim();
  const secilemez = grup.getByRole("radio", { name: new RegExp(`^M\\s*${ek}$`) });
  await expect(secilemez).toHaveAttribute("aria-disabled", "true");
  await grup.getByRole("radio", { checked: true }).focus();
  await page.keyboard.press("ArrowRight", { delay: 50 });
  await expect(secilemez).toBeFocused();
  await expect(grup.getByRole("radio", { checked: true })).toHaveText("S");
  await page.keyboard.press("ArrowRight", { delay: 50 });
  await expect(grup.getByRole("radio", { name: "L", exact: true })).toBeFocused();
  await expect(grup.getByRole("radio", { checked: true })).toHaveText("L");
  await expect(page.getByText(metin("gelistirme.ornek.bedenAciklamasi"))).toBeVisible();
  expect(hatalar).toEqual([]);
});

// Sıralanabilir liste (kart 0141): tutamağa odaklanıp boşlukla alınan satır ok tuşuyla taşınır, boşlukla bırakılır;
// Escape taşımayı geri alır; fareyle tutamaktan sürüklenir; yukarı ve aşağı al düğmeleri telefonda da vardır ve
// dokunarak taşır (sürüklemeye tek dokunuşluk karşılık, WCAG 2.5.7). Her taşıma ekran okuyucuya duyurulur.
test("sıralanabilir liste: klavyeyle, düğmeyle ve fareyle taşınır, Escape geri alır", async ({
  page,
}) => {
  const { hatalar } = await ac(page, `${katalogAdresi}/siralanabilir-liste`);
  const liste = page.getByRole("list", { name: metin("gelistirme.ornek.siralanabilirListe") });
  const ad = (kod: string) => metin(`gelistirme.ornek.${kod}` as MetinAnahtari);
  const sira = async () =>
    (await liste.locator('[data-slot="siralanabilir-satir"] .font-kalin').allTextContents()).map(
      (yazi) => yazi.trim(),
    );
  const baslangic = [
    "bolumSlider",
    "bolumGuvenSeridi",
    "bolumKampanya",
    "bolumUrunVitrini",
    "bolumBulten",
  ].map(ad);
  await expect.poll(sira).toEqual(baslangic);
  const tutamak = (kod: string) =>
    liste.getByRole("button", {
      name: doldur(metin("ortak.parca.siralama.tasi"), { ad: ad(kod) }),
    });

  // Her klavye adımının duyurusu beklenir: sürükleme bir sonraki tuştan önce yerini ölçer.
  const duyuruldu = (anahtar: MetinAnahtari, kod: string, sirasi: number) =>
    expect(
      page.getByText(doldur(metin(anahtar), { ad: ad(kod), sira: String(sirasi), toplam: "5" }), {
        exact: true,
      }),
    ).toBeAttached();

  // @dnd-kit sürükleme başlayınca ok tuşu dinleyicisini sayfanın bir sonraki işinde bağlar (setTimeout): "alındı"
  // duyurusundan hemen sonra basılan tuş yük altında kaçıyordu (ölçüldü). Sayfanın sırasındaki o iş bitince basılır.
  const dinleyiciBaglansin = () =>
    page.evaluate(() => new Promise<void>((tamam) => setTimeout(tamam, 0)));

  // Klavye: boşlukla al, iki kez aşağı, boşlukla bırak.
  await tutamak("bolumSlider").focus();
  await page.keyboard.press("Space");
  await duyuruldu("ortak.parca.siralama.alindi", "bolumSlider", 1);
  await dinleyiciBaglansin();
  await page.keyboard.press("ArrowDown");
  await duyuruldu("ortak.parca.siralama.tasindi", "bolumSlider", 2);
  await page.keyboard.press("ArrowDown");
  await duyuruldu("ortak.parca.siralama.tasindi", "bolumSlider", 3);
  await page.keyboard.press("Space");
  await duyuruldu("ortak.parca.siralama.birakildi", "bolumSlider", 3);
  await expect
    .poll(sira)
    .toEqual([
      ad("bolumGuvenSeridi"),
      ad("bolumKampanya"),
      ad("bolumSlider"),
      ad("bolumUrunVitrini"),
      ad("bolumBulten"),
    ]);
  await expect(tutamak("bolumSlider")).toBeFocused();

  // Escape taşımayı geri alır.
  await page.keyboard.press("Space");
  await duyuruldu("ortak.parca.siralama.alindi", "bolumSlider", 3);
  await dinleyiciBaglansin();
  await page.keyboard.press("ArrowUp");
  await duyuruldu("ortak.parca.siralama.tasindi", "bolumSlider", 2);
  await page.keyboard.press("Escape");
  await duyuruldu("ortak.parca.siralama.vazgecildi", "bolumSlider", 3);
  await expect
    .poll(sira)
    .toEqual([
      ad("bolumGuvenSeridi"),
      ad("bolumKampanya"),
      ad("bolumSlider"),
      ad("bolumUrunVitrini"),
      ad("bolumBulten"),
    ]);

  // Düğme: Enter ile bir yukarı; odak düğmede kalır, duyurulur.
  const yukari = liste.getByRole("button", {
    name: doldur(metin("ortak.parca.siralama.yukari"), { ad: ad("bolumSlider") }),
  });
  await yukari.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(sira)
    .toEqual([
      ad("bolumGuvenSeridi"),
      ad("bolumSlider"),
      ad("bolumKampanya"),
      ad("bolumUrunVitrini"),
      ad("bolumBulten"),
    ]);
  await expect(yukari).toBeFocused();
  await expect(
    page.getByText(
      doldur(metin("ortak.parca.siralama.tasindi"), {
        ad: ad("bolumSlider"),
        sira: "2",
        toplam: "5",
      }),
    ),
  ).toBeAttached();

  // Fare: tutamaktan tutup son satırın üstüne bırakır.
  const kutu = await tutamak("bolumGuvenSeridi").boundingBox();
  const hedef = await liste.locator('[data-slot="siralanabilir-satir"]').last().boundingBox();
  if (kutu === null || hedef === null) throw new Error("Satırın yeri ölçülemedi.");
  await page.mouse.move(kutu.x + kutu.width / 2, kutu.y + kutu.height / 2);
  await page.mouse.down();
  await page.mouse.move(kutu.x + kutu.width / 2, hedef.y + hedef.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(sira)
    .toEqual([
      ad("bolumSlider"),
      ad("bolumKampanya"),
      ad("bolumUrunVitrini"),
      ad("bolumBulten"),
      ad("bolumGuvenSeridi"),
    ]);

  // Telefonda da tutamak ve yukarı, aşağı al düğmeleri vardır; dokunuşla taşınır, sayfa yana kaymaz.
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(tutamak("bolumSlider")).toBeVisible();
  await expect(yukari).toBeVisible();
  await liste
    .getByRole("button", {
      name: doldur(metin("ortak.parca.siralama.yukari"), { ad: ad("bolumGuvenSeridi") }),
    })
    .click();
  await expect
    .poll(sira)
    .toEqual([
      ad("bolumSlider"),
      ad("bolumKampanya"),
      ad("bolumUrunVitrini"),
      ad("bolumGuvenSeridi"),
      ad("bolumBulten"),
    ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(hatalar).toEqual([]);
});

test("olmayan parçanın sayfası yoktur", async ({ page }) => {
  expect((await ac(page, `${katalogAdresi}/olmayan-parca`)).durum).toBe(404);
});

test("renk seçimi cihazın tercihini geçersiz kılar, açılan pencereye de geçer", async ({
  page,
}) => {
  const pencereyiAc = async () => {
    await page
      .getByRole("button", { name: metin("gelistirme.ornek.pencereyiAc" as MetinAnahtari) })
      .click();
    const pencere = page.getByRole("dialog");
    await expect(pencere).toBeVisible();
    // Açılış hareketi bitince renk ölçülür.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const renk = await pencere.evaluate((e) => getComputedStyle(e).backgroundColor);
    await page.keyboard.press("Escape");
    await expect(pencere).toHaveCount(0);
    return renk;
  };
  // Cihazın kendi renkleri: seçim yokken açık ve koyu tercihte.
  const cihaz: Record<"acik" | "koyu", { zemin: string; pencere: string }> = {
    acik: { zemin: "", pencere: "" },
    koyu: { zemin: "", pencere: "" },
  };
  for (const [renk, tercih] of [
    ["acik", "light"],
    ["koyu", "dark"],
  ] as const) {
    await page.emulateMedia({ colorScheme: tercih });
    await ac(page, `${katalogAdresi}/pencere`);
    cihaz[renk] = { zemin: await zemin(page), pencere: await pencereyiAc() };
  }
  expect(cihaz.koyu.zemin).not.toBe(cihaz.acik.zemin);
  expect(cihaz.koyu.pencere).not.toBe(cihaz.acik.pencere);

  // Tercihin tersi seçilir: sayfa ve gövdeye çizilen pencere seçilen renktedir.
  for (const [renk, tercih] of [
    ["acik", "dark"],
    ["koyu", "light"],
  ] as const) {
    await page.emulateMedia({ colorScheme: tercih });
    await ac(page, `${katalogAdresi}/pencere?renk=${renk}`);
    expect(await zemin(page), renk).toBe(cihaz[renk].zemin);
    expect(await pencereyiAc(), renk).toBe(cihaz[renk].pencere);
  }

  // Seçili renk işaretlidir; "cihazınki" seçimi kaldırır.
  const renkler = page.getByRole("navigation", { name: metin("gelistirme.katalog.renk") });
  await expect(
    renkler.getByRole("link", { name: metin("gelistirme.katalog.renkKoyu") }),
  ).toHaveAttribute("aria-current", "page");
  await renkler.getByRole("link", { name: metin("gelistirme.katalog.renkCihaz") }).click();
  await expect(page).toHaveURL(`${katalogAdresi}/pencere`);
  await expect(page.locator("html")).not.toHaveAttribute("data-renk", /.*/);
  expect(await zemin(page)).toBe(cihaz.acik.zemin);
});

for (const { ad, piksel } of [
  { ad: "telefon", piksel: 375 },
  { ad: "tablet", piksel: 768 },
  { ad: "masaustu", piksel: 1280 },
]) {
  test(`genişlik seçimi (${ad}) sayfayı ${piksel} px çerçevede aynı renkle açar, sayfa yana kaymaz`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const { hatalar } = await ac(page, `${katalogAdresi}/kart?renk=koyu&genislik=${ad}`);
    const cerceve = page.locator("iframe");
    await expect(cerceve).toHaveAttribute("width", String(piksel));
    expect(await yanaKayma(page)).toBe(0);
    const ic = page.frameLocator("iframe");
    // Çerçevedeki sayfa o genişliktedir, seçim çubuğu yoktur, renk aynıdır.
    await expect(
      ic.getByRole("region", { name: metin("gelistirme.katalog.parca.kart"), exact: true }),
    ).toBeVisible();
    await expect(ic.getByRole("navigation")).toHaveCount(0);
    await expect(ic.locator("html")).toHaveAttribute("data-renk", "koyu");
    const icGenislik = await ic.locator("html").evaluate((e) => e.clientWidth);
    expect(icGenislik).toBe(piksel);
    expect(hatalar).toEqual([]);
  });
}

// Bölüm kütüphanesinin sayfası (kart 0106): deneme bölümü iki görünümüyle çizilir, tariften çıkan form her
// alanı gösterir; iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yoktur.
test("bölüm kütüphanesi: deneme bölümü ve tarifinden çıkan form iki renkte ve üç genişlikte taramadan geçer", async ({
  page,
}) => {
  const hatalar: string[] = [];
  for (const renk of ["acik", "koyu"] as const) {
    for (const { ad, width, height } of genislikler) {
      await page.setViewportSize({ width, height });
      const sayfa = await ac(page, `${katalogAdresi}/bolum-kutuphanesi?renk=${renk}`);
      expect(sayfa.durum).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        metin("gelistirme.bolum.baslik"),
      );
      const cizim = page.getByRole("region", { name: metin("gelistirme.bolum.cizim") });
      await expect(cizim.getByText(metin("gelistirme.bolum.ornek.madde1"))).toBeVisible();
      const form = page.getByRole("region", { name: metin("gelistirme.bolum.form") });
      await expect(form.getByLabel(metin("gelistirme.bolum.alan.baslik"))).toHaveValue(
        metin("gelistirme.bolum.ornek.baslik"),
      );
      await expect(form.getByLabel(metin("gelistirme.bolum.alan.aciklama"))).toBeVisible();
      await tara(page, `${renk}, ${ad}`);
      expect(await yanaKayma(page), `${renk}, ${ad}`).toBe(0);
      hatalar.push(...sayfa.hatalar);
    }
  }
  // Formda liste öğesi eklenir ve sınırda ekleme düğmesi kapanır.
  const liste = page.getByRole("group", { name: metin("gelistirme.bolum.alan.maddeler") });
  const ekle = liste.getByRole("button", {
    name: doldur(metin("yonetim.bolumFormu.ogeEkle"), { ad: metin("gelistirme.bolum.alan.madde") }),
  });
  await ekle.click();
  await expect(liste.getByLabel(metin("gelistirme.bolum.alan.maddeMetni"))).toHaveCount(3);
  await expect(ekle).toBeDisabled();
  expect(hatalar).toEqual([]);
});

// Üst ve alt kısım bölümleri (kart 0108): yukarıdaki test sayfanın tamamını iki renkte ve üç genişlikte tarar;
// burada telefonda yan pencere, masaüstünde açılır menü klavyeyle denenir, açıkken de taranır.
// Kart 0168 kontrolü: "Kategoriler" açıkken yan pencere iki renkte taranır.
for (const renk of ["acik", "koyu"] as const) {
  test(`üst kısım: telefonda menü yan pencereden açılır, arama kutusu ve sepet görünür, klavyeyle kapanır (${renk})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const sayfa = await ac(page, `${katalogAdresi}/bolum-kutuphanesi?renk=${renk}`);
    const bolum = page.getByRole("region", { name: metin("gelistirme.bolum.ustAlt") });
    // Katalogda üst kısım bir bölümün içindedir: sayfanın başlığı (banner) sayılmaz.
    const ust = bolum.locator("header").first();
    // Arama telefonda satırın altındaki kutudur (kart 0137).
    await expect(
      ust
        .getByRole("searchbox", { name: metin("vitrin.bolum.ustSatir.aramaEtiketi") })
        .filter({ visible: true }),
    ).toHaveCount(1);
    await expect(
      ust.getByRole("link", { name: metin("vitrin.bolum.ustSatir.sepet") }),
    ).toBeVisible();
    await expect(
      ust.getByRole("link", { name: metin("vitrin.bolum.ustSatir.hesap") }),
    ).toBeHidden();
    await expect(
      ust.getByRole("navigation", { name: metin("vitrin.bolum.menuSatiri.gezinme") }),
    ).toBeHidden();
    const ac2 = ust.getByRole("button", { name: metin("vitrin.bolum.ustSatir.menuyuAc") });
    await ac2.focus();
    await page.keyboard.press("Enter");
    const pencere = page.getByRole("dialog", { name: metin("vitrin.bolum.ustSatir.menuBasligi") });
    await expect(pencere).toBeVisible();
    await expect(
      pencere.getByRole("link", { name: metin("gelistirme.bolum.ornek.menu.yeni") }),
    ).toBeVisible();
    await expect(
      pencere.getByRole("link", { name: metin("vitrin.bolum.ustSatir.hesap") }),
    ).toBeVisible();
    // Kategori menüsü tek bir "Kategoriler" dalıdır (kart 0168): ana menüde de geçen kategori en üst düzeyde bir
    // kez görünür; "Kategoriler" açılınca kategoriler onun içindedir.
    const giyimler = pencere.getByRole("button", {
      name: metin("gelistirme.bolum.ornek.menu.giyim"),
    });
    await expect(giyimler).toHaveCount(1);
    const kategoriler = pencere.getByRole("button", {
      name: metin("vitrin.bolum.menuSatiri.kategoriler"),
    });
    await expect(kategoriler).toHaveCount(1);
    await kategoriler.focus();
    await page.keyboard.press("Enter");
    await expect(kategoriler).toHaveAttribute("aria-expanded", "true");
    await expect(giyimler).toHaveCount(2);
    await tara(page, "yan pencerede kategoriler açık");
    await page.keyboard.press("Enter");
    await expect(giyimler).toHaveCount(1);
    // Alt düzeyi olan dal akordeonla açılır; dalın kendisi "Tümü" bağlantısıdır.
    const giyim = giyimler.first();
    await giyim.focus();
    await page.keyboard.press("Enter");
    await expect(
      pencere.getByRole("link", { name: metin("gelistirme.bolum.ornek.menu.kadin") }).first(),
    ).toBeVisible();
    await expect(
      pencere.getByRole("link", { name: metin("vitrin.bolum.ustSatir.tumu") }).first(),
    ).toHaveAttribute("href", "/kategori/giyim");
    await tara(page, "yan pencere açık");
    await page.keyboard.press("Escape");
    await expect(pencere).toBeHidden();
    await expect(ac2).toBeFocused();
    expect(await yanaKayma(page)).toBe(0);
    expect(sayfa.hatalar).toEqual([]);
  });
}

// Hidrasyon yarışı (kart 0121): kontrol hattının yavaş makinesinde sayfa bağlanmadan açılan yan pencere bölümlere
// aria-hidden yazıyor, React uyuşmazlığı konsola yazıyordu. İşlemci 4 kat yavaşlatılınca bilgisayarda da her seferinde
// oluyordu (ölçüldü); sayfaHazir beklendiğinde konsol temiz kalır.
test("yavaş işlemcide yan pencere sayfa hazır olunca açılır, konsolda uyuşmazlık uyarısı yok", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const sayfa = await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  const ust = page
    .getByRole("region", { name: metin("gelistirme.bolum.ustAlt") })
    .locator("header")
    .first();
  await ust.getByRole("button", { name: metin("vitrin.bolum.ustSatir.menuyuAc") }).click();
  const pencere = page.getByRole("dialog", { name: metin("vitrin.bolum.ustSatir.menuBasligi") });
  await expect(pencere).toBeVisible();
  // Bekleyen bağlanma varsa uyarı birazdan gelir: sayfanın bütün bölümleri bağlanana kadar beklenir.
  await sayfaHazir(page);
  await page.keyboard.press("Escape");
  await expect(pencere).toBeHidden();
  await expect(page.locator("[data-aria-hidden]")).toHaveCount(0);
  expect(sayfa.hatalar).toEqual([]);
});

test("üst kısım: masaüstünde menü satırı açılır menülerle klavyeyle gezilir, menü düğmesi gizlidir", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const sayfa = await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  const bolum = page.getByRole("region", { name: metin("gelistirme.bolum.ustAlt") });
  // Katalogda üst kısım bir bölümün içindedir: sayfanın başlığı (banner) sayılmaz.
  const ust = bolum.locator("header").first();
  await expect(
    ust.getByRole("button", { name: metin("vitrin.bolum.ustSatir.menuyuAc") }),
  ).toBeHidden();
  await expect(ust.getByRole("link", { name: metin("vitrin.bolum.ustSatir.hesap") })).toBeVisible();
  const menu = ust.getByRole("navigation", { name: metin("vitrin.bolum.menuSatiri.gezinme") });
  await expect(menu).toBeVisible();
  // Kategoriler: Enter açar, ok tuşları gezer, sağ ok alt kategorilere girer, Escape kapatıp odağı geri verir.
  const kategoriler = menu.getByRole("button", {
    name: metin("vitrin.bolum.menuSatiri.kategoriler"),
  });
  await kategoriler.focus();
  await page.keyboard.press("Enter");
  const acilir = page.getByRole("menu");
  await expect(acilir).toBeVisible();
  const giyim = acilir.getByRole("menuitem", { name: metin("gelistirme.bolum.ornek.menu.giyim") });
  await expect(giyim).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const alt = page.getByRole("menu").last();
  await expect(
    alt.getByRole("menuitem", { name: metin("gelistirme.bolum.ornek.menu.kadin") }),
  ).toBeVisible();
  await expect(
    alt.getByRole("menuitem", { name: metin("vitrin.bolum.menuSatiri.tumu") }),
  ).toHaveAttribute("href", "/kategori/giyim");
  await tara(page, "açılır menü açık");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(kategoriler).toBeFocused();
  // Altı olmayan dal düz bağlantıdır; Tab ile sıradaki menüye geçilir.
  await expect(
    menu.getByRole("link", { name: metin("gelistirme.bolum.ornek.menu.yeni") }),
  ).toHaveAttribute("href", "/");
  await page.keyboard.press("Tab");
  await expect(
    menu.getByRole("link", { name: metin("gelistirme.bolum.ornek.menu.yeni") }),
  ).toBeFocused();
  expect(sayfa.hatalar).toEqual([]);
});

// Renkli zeminli bölgede odak çerçevesi bölgenin yazı rengindedir (kart 0108 kontrolü): alt kısımda ve birincil
// renkli duyuru şeridinde, iki temada, çerçeve zemine karşı en az 3:1.
const onaltilik = (rgb: string) => {
  const parcalar = rgb.match(/^rgba?\((\d+), (\d+), (\d+)(?:, 1)?\)$/);
  if (parcalar === null) throw new Error(`Saydam ya da tanınmayan renk: ${rgb}`);
  return `#${parcalar
    .slice(1, 4)
    .map((k) => Number(k).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
};

for (const renk of ["acik", "koyu"] as const) {
  test(`üst ve alt kısım: renkli zeminde odak çerçevesi okunur (${renk})`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ac(page, `${katalogAdresi}/bolum-kutuphanesi?renk=${renk}`);
    const bolum = page.getByRole("region", { name: metin("gelistirme.bolum.ustAlt") });
    const olc = async (baglanti: Locator, zemin: Locator, ne: string) => {
      await baglanti.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(baglanti, ne).toBeFocused();
      await page.evaluate(() =>
        Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
      );
      const cerceve = await baglanti.evaluate((e) => getComputedStyle(e).outlineColor);
      const arka = await zemin.evaluate((e) => getComputedStyle(e).backgroundColor);
      expect(kontrastOrani(onaltilik(cerceve), onaltilik(arka)), ne).toBeGreaterThanOrEqual(3);
    };
    const altKisim = bolum.locator("footer").first();
    await olc(
      altKisim.getByRole("link", { name: metin("gelistirme.bolum.ornek.menu.uyelik") }),
      altKisim,
      "alt kısım",
    );
    // Öteki görünümlerdeki duyuru şeridi birincil renkli zemindedir.
    const serit = bolum.locator("header").nth(1).locator("div").first();
    await expect(serit).toHaveClass(/bg-birincil/);
    await olc(serit.getByRole("link"), serit, "duyuru şeridi");
  });
}

// Geniş logo dar ekranda oranını korur, ezilmez (kart 0108 kontrolü).
for (const width of [320, 375, 768, 1280]) {
  test(`üst kısım: geniş logo ${width} px'te oranını korur`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
    const logo = page
      .getByRole("region", { name: metin("gelistirme.bolum.ustAlt") })
      .locator("header img")
      .first();
    await expect(logo).toBeVisible();
    const oran = await logo.evaluate((e) => {
      const kutu = e.getBoundingClientRect();
      return kutu.width / kutu.height;
    });
    expect(Math.abs(oran - 10) / 10).toBeLessThan(0.02);
    expect(await yanaKayma(page)).toBe(0);
  });
}

// Ürün kartının sayfası (kart 0109): her görünüm her durumla (indirimli, tükenmiş, varyantlı, görselsiz, uzun
// adlı, büyük fiyatlı, puanlı, fiyatsız) iki renkte ve üç genişlikte taramadan geçer, sayfa yana kaymaz,
// hiçbir kartın içeriği kartın dışına taşmaz; uzun ad iki satırda kesilir.
test("ürün kartı: her görünüm her durumla iki renkte ve üç genişlikte taramadan geçer, kart taşmaz", async ({
  page,
}) => {
  const hatalar: string[] = [];
  for (const renk of ["acik", "koyu"] as const) {
    for (const { ad, width, height } of genislikler) {
      await page.setViewportSize({ width, height });
      const sayfa = await ac(page, `${katalogAdresi}/urun-karti?renk=${renk}`);
      expect(sayfa.durum).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        metin("gelistirme.urunKarti.baslik"),
      );
      for (const gorunum of ["dikey", "yatay", "buyuk-gorsel"] as const) {
        const bolum = page.getByRole("region", {
          name: metin(`gelistirme.urunKarti.gorunum.${gorunum}`),
        });
        await expect(bolum.locator("article")).toHaveCount(9);
      }
      await tara(page, `${renk}, ${ad}`);
      expect(await yanaKayma(page), `${renk}, ${ad}`).toBe(0);
      // Kartın her öğesi kartın sınırları içindedir (ekran okuyucu metni dışında).
      const tasanlar = await page.locator("article[data-slot=urun-karti]").evaluateAll((kartlar) =>
        kartlar.flatMap((kart) => {
          const sinir = kart.getBoundingClientRect();
          return [...kart.querySelectorAll("*")]
            .filter((oge) => !oge.closest(".sr-only"))
            .filter((oge) => {
              const kutu = oge.getBoundingClientRect();
              if (kutu.width === 0 && kutu.height === 0) return false;
              return (
                kutu.left < sinir.left - 0.5 ||
                kutu.right > sinir.right + 0.5 ||
                kutu.bottom > sinir.bottom + 0.5
              );
            })
            .map((oge) => `${kart.textContent?.slice(0, 30)}: ${oge.tagName}`);
        }),
      );
      expect(tasanlar, `${renk}, ${ad}`).toEqual([]);
      // Uzun ad iki satırda kesilir: yazının tamamı kutuya sığmaz, kutu iki satır yüksekliğindedir.
      const uzun = page
        .getByRole("link", { name: metin("gelistirme.urunKarti.ornek.uzunAdli") })
        .first();
      const olcu = await uzun.evaluate((oge) => ({
        kesik: oge.scrollHeight > oge.clientHeight,
        satir: oge.clientHeight / Number.parseFloat(getComputedStyle(oge).lineHeight),
      }));
      expect(olcu.kesik, `${renk}, ${ad}`).toBe(true);
      expect(Math.round(olcu.satir), `${renk}, ${ad}`).toBe(2);
      hatalar.push(...sayfa.hatalar);
    }
  }
  expect(hatalar).toEqual([]);
});

// Kart 0190: dar telefonda fiyat iki satıra iner ama para simgesi (ya da aralığın çizgisi) tek başına bir satırda
// durmaz; fiyatın ve üstü çizili eski fiyatın her satırında bir tutar vardır. Dikey ve büyük görselli kart ölçülür.
// Yatay kartta sepet ve favori birlikteyken 320 px'te fiyata 70 px kalır, tek tutar bile sığmaz (kart 0193; sepet
// bugün vitrinde yok). Kart genişliğine hiç sığmayan büyük tutar kendi içinde kırılır (kart 0109).
for (const genislik of [320, 360]) {
  test(`ürün kartı: fiyatın her satırında tutar var, simge tek başına kalmaz (${genislik} px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: genislik, height: 800 });
    await ac(page, `${katalogAdresi}/urun-karti`);
    let kirilan = 0;
    for (const gorunum of ["dikey", "buyuk-gorsel"] as const) {
      const fiyatlar = page
        .getByRole("region", { name: metin(`gelistirme.urunKarti.gorunum.${gorunum}`) })
        .locator("[data-slot=fiyat] :is(strong, s)");
      expect(await fiyatlar.count()).toBeGreaterThan(0);
      for (const fiyat of await fiyatlar.all()) {
        const satirlar = await satirlarinYazisi(fiyat);
        if (satirlar.length > 1) kirilan += 1;
        expect(
          satirlar.filter((satir) => !/\d/u.test(satir)),
          `${gorunum}: ${satirlar.join(" | ")}`,
        ).toEqual([]);
      }
    }
    // Ölçüm boşa gitmesin: bu genişlikte en az bir fiyat aralığı iki satıra iner.
    expect(kirilan).toBeGreaterThan(0);
  });
}

// Kartın klavyesi: sırayla ürünün adı, sepete ekle ve favori; adın odağı bütün kartın çevresinde görünür.
test("ürün kartı: klavyede ad, sepet ve favori sırasıyla; adın odağı kartın çevresinde", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ac(page, `${katalogAdresi}/urun-karti`);
  const kart = page
    .getByRole("region", { name: metin("gelistirme.urunKarti.gorunum.dikey") })
    .locator("article")
    .first();
  const ad = kart.getByRole("link", { name: metin("gelistirme.urunKarti.ornek.indirimli") });
  // Kartın önündeki son odaklanabilir öğeden Tab ile girilir.
  await page
    .getByRole("region", { name: metin("gelistirme.urunKarti.gorunum.dikey") })
    .getByRole("heading", { level: 2 })
    .click();
  await page.keyboard.press("Tab");
  await expect(ad).toBeFocused();
  const cerceve = await ad.evaluate((oge) => {
    const after = getComputedStyle(oge, "::after");
    // Çerçeve kartın kenarlığının içindedir.
    return {
      stil: after.outlineStyle,
      genislik: after.width,
      kart: oge.closest("article")?.clientWidth,
    };
  });
  expect(cerceve.stil).toBe("solid");
  expect(Number.parseFloat(cerceve.genislik)).toBeCloseTo(cerceve.kart ?? 0, 0);
  await page.keyboard.press("Tab");
  await expect(
    kart.getByRole("button", { name: metin("vitrin.urunKarti.sepeteEkle") }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    kart.getByRole("button", {
      name: doldur(metin("vitrin.urunKarti.favoriyeEkle"), {
        urun: metin("gelistirme.urunKarti.ornek.indirimli"),
      }),
    }),
  ).toBeFocused();
});

// Bütün kart ürün sayfasına gider: görselin ortasında en üstteki öğe adın bağlantısıdır; düğmeler onun üstündedir.
test("ürün kartı: görsele tıklayan ürün sayfasına, düğmeye tıklayan düğmeye basar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await ac(page, `${katalogAdresi}/urun-karti`);
  const kart = page
    .getByRole("region", { name: metin("gelistirme.urunKarti.gorunum.dikey") })
    .locator("article")
    .first();
  const ustteki = (x: number, y: number) =>
    kart.evaluate(
      (_, [px, py]) => {
        const bulunan = document.elementFromPoint(px ?? 0, py ?? 0);
        return (
          bulunan?.closest("a, button")?.textContent ??
          bulunan?.closest("a, button")?.getAttribute("aria-label")
        );
      },
      [x, y],
    );
  const gorsel = await kart.locator("img").boundingBox();
  if (gorsel === null) throw new Error("Görsel yok.");
  expect(await ustteki(gorsel.x + gorsel.width / 2, gorsel.y + gorsel.height / 2)).toBe(
    metin("gelistirme.urunKarti.ornek.indirimli"),
  );
  for (const ad of [
    metin("vitrin.urunKarti.sepeteEkle"),
    doldur(metin("vitrin.urunKarti.favoriyeEkle"), {
      urun: metin("gelistirme.urunKarti.ornek.indirimli"),
    }),
  ]) {
    const kutu = await kart.getByRole("button", { name: ad }).boundingBox();
    if (kutu === null) throw new Error("Düğme yok.");
    const bulunan = await kart.evaluate(
      (_, [px, py]) =>
        document
          .elementFromPoint(px ?? 0, py ?? 0)
          ?.closest("button")
          ?.getAttribute("aria-label"),
      [kutu.x + kutu.width / 2, kutu.y + kutu.height / 2],
    );
    expect(bulunan).toBe(ad);
  }
});

// Kayan afiş (Slider, kart 0110): katalogdaki ilk kayan afiş üç slaytlıdır, 6 saniyede bir geçer. Saat ileri
// alınarak geçiş ölçülür; fare üstündeyken ve hareket azaltma tercihinde geçmez. Klavyeyle durdurulur,
// önceki, sonraki ve noktalarla gezilir; slaytın adı ekran okuyucuda "2 / 3".
const kayanAfis = (page: Page) =>
  page
    .getByRole("region", { name: metin("gelistirme.bolum.anaSayfa"), exact: true })
    .getByRole("region", { name: metin("vitrin.bolum.kayanAfis.etiket") })
    .first();
const etkinSlayt = (afis: Locator) => afis.getByRole("group");

test("kayan afiş: kendiliğinden geçer, fare üstündeyken bekler, durdurulunca geçmez", async ({
  page,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1280, height: 900 });
  await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  const afis = kayanAfis(page);
  await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "1 / 3");
  await page.clock.runFor(6100);
  await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "2 / 3");
  // Fare üstündeyken bekler. Saat geçiş süresinden biraz uzun adımlarla ilerler: tek büyük sıçrama bozuk
  // kodu yakalamıyordu (ölçüldü).
  await afis.hover();
  for (let adim = 0; adim < 3; adim += 1) {
    await page.clock.runFor(6100);
    await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "2 / 3");
  }
  await page.mouse.move(0, 0);
  await page.clock.runFor(6100);
  await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "3 / 3");
  // Durdurulunca geçmez; yeni slayt duyurulur.
  await afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.durdur") }).click();
  await page.mouse.move(0, 0);
  for (let adim = 0; adim < 3; adim += 1) {
    await page.clock.runFor(6100);
    await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "3 / 3");
  }
  await expect(afis.locator("[aria-live]")).toHaveAttribute("aria-live", "polite");
  await expect(
    afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.baslat") }),
  ).toBeVisible();
});

test("kayan afiş: klavyeyle durdurulur, önceki, sonraki ve noktalarla gezilir", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  const afis = kayanAfis(page);
  const durdur = afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.durdur") });
  // Afişin önündeki son odaklanabilir öğeden Tab ile girilir: ilk denetim durdurma düğmesidir.
  await page
    .getByRole("region", { name: metin("gelistirme.bolum.anaSayfa"), exact: true })
    .getByRole("heading", { level: 2 })
    .first()
    .click();
  await page.keyboard.press("Tab");
  await expect(durdur).toBeFocused();
  // Odak afişin içindeyken geçiş bekler; Enter durdurur.
  await page.keyboard.press("Enter");
  await expect(
    afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.baslat") }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.onceki") }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "3 / 3");
  await afis.getByRole("button", { name: "2. slaytı göster" }).focus();
  await page.keyboard.press("Enter");
  await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "2 / 3");
  await expect(afis.getByRole("button", { name: "2. slaytı göster" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.sonraki") }).focus();
  await page.keyboard.press("Enter");
  await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "3 / 3");
  await page.keyboard.press("Enter");
  await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "1 / 3");
});

// Kart 0191, karar 0123: telefonda noktaların yerinde "1 / 3" sayacı durur, denetimler tek satırdadır ve sonraki
// düğmesiyle sayaç ilerler; tablet ve üstünde her nokta 44 × 44 px basılır, komşusuyla çakışmaz.
for (const genislik of [320, 390, 768]) {
  test(`kayan afiş: telefonda sayaç, tablette 44 px noktalar (${genislik} px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: genislik, height: 900 });
    await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
    const afis = kayanAfis(page);
    await afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.durdur") }).click();
    const sonraki = afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.sonraki") });
    const noktalar = [1, 2, 3].map((sira) =>
      afis.getByRole("button", {
        name: doldur(metin("vitrin.bolum.kayanAfis.slaytaGit"), { sira: String(sira) }),
        exact: true,
      }),
    );
    if (genislik < 768) {
      for (const nokta of noktalar) await expect(nokta).toBeHidden();
      const sayac = afis.getByText("1 / 3", { exact: true });
      await expect(sayac).toBeVisible();
      // Denetimler tek satırdadır: durdur, önceki, sayaç ve sonraki aynı yükseklikte.
      const ustler = await afis
        .locator("button:visible")
        .evaluateAll((liste) => [
          ...new Set(liste.map((b) => Math.round(b.getBoundingClientRect().top))),
        ]);
      expect(ustler).toHaveLength(1);
      expect(await basilmayanNoktalar(sonraki)).toEqual([]);
      await sonraki.click();
      await expect(afis.getByText("2 / 3", { exact: true })).toBeVisible();
    } else {
      for (const nokta of noktalar) {
        await expect(nokta).toBeVisible();
        expect(
          await basilmayanNoktalar(nokta),
          (await nokta.getAttribute("aria-label")) ?? "",
        ).toEqual([]);
      }
    }
    expect(await yanaKayma(page)).toBe(0);
  });
}

test("kayan afiş: hareket azaltma tercihinde kendiliğinden geçmez, başlat düğmesiyle geçer", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.setViewportSize({ width: 1280, height: 900 });
  await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  const afis = kayanAfis(page);
  const baslat = afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.baslat") });
  await expect(baslat).toBeVisible();
  for (let adim = 0; adim < 3; adim += 1) {
    await page.clock.runFor(6100);
    await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "1 / 3");
  }
  await baslat.click();
  // Odak afişin içindeyken geçiş bekler: odak ve fare afişin dışına çıkar.
  await page.getByRole("heading", { level: 1 }).click();
  await page.clock.runFor(6100);
  await expect(etkinSlayt(afis)).toHaveAttribute("aria-label", "2 / 3");
});

test("kayan afiş: telefonda telefon görseli, masaüstünde asıl görsel", async ({ page }) => {
  for (const [width, beklenen] of [
    [375, "dikey"],
    [1280, "asil"],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
    const afis = kayanAfis(page);
    await afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.durdur") }).click();
    // Telefonda nokta yoktur (kart 0191): ikinci slayta sonraki düğmesiyle geçilir.
    await afis.getByRole("button", { name: metin("vitrin.bolum.kayanAfis.sonraki") }).click();
    const gorsel = etkinSlayt(afis).locator("img");
    const { dogal, kaynaklar } = await gorsel.evaluate((img: HTMLImageElement) => ({
      dogal: img.naturalHeight > img.naturalWidth,
      kaynaklar: [...(img.parentElement?.querySelectorAll("source") ?? [])].length,
    }));
    expect(kaynaklar, String(width)).toBe(2);
    // Katalogda telefon görseli dikey (480 × 640), asıl görsel karedir.
    expect(dogal, String(width)).toBe(beklenen === "dikey");
  }
});

// Ürün bölümleri (kart 0111): bölüm kütüphanesi testi sayfanın tamamını (ürün bölümleri dahil) iki renkte ve üç
// genişlikte tarar; burada sekmeli vitrin klavyeyle, fırsatların geri sayımı saat ilerletilerek denenir.
const om = (anahtar: string) =>
  metin(`gelistirme.bolum.ornek.anaSayfa.${anahtar}` as MetinAnahtari);

test("sekmeli vitrin: ok tuşları sekmeyi değiştirir, Tab seçili sekmenin ürünlerine geçer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  const bolum = page.getByRole("region", { name: om("kategoriyeGore") });
  const sekmeler = bolum.getByRole("tab");
  await expect(sekmeler).toHaveText([om("sekmeYeni"), om("sekmeIndirimli"), om("sekmeMarka")]);
  await sekmeler.first().focus();
  await expect(sekmeler.first()).toHaveAttribute("aria-selected", "true");
  const panel = bolum.getByRole("tabpanel");
  const ilkKartlar = await panel.getByRole("heading", { level: 3 }).allTextContents();
  await page.keyboard.press("ArrowRight");
  await expect(sekmeler.nth(1)).toBeFocused();
  await expect(sekmeler.nth(1)).toHaveAttribute("aria-selected", "true");
  const ikinciKartlar = await panel.getByRole("heading", { level: 3 }).allTextContents();
  expect(ikinciKartlar).not.toEqual(ilkKartlar);
  expect(ikinciKartlar.length).toBeGreaterThan(0);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("link").first()).toBeFocused();
  await tara(page, "sekmeli vitrin, ikinci sekme");
});

test("fırsatlar: kalan süre kartta ve sayaçta; biten kart kalkar, hepsi bitince bölüm kalkar", async ({
  page,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1280, height: 900 });
  await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  const bolum = page.getByRole("region", { name: om("firsatBaslik") });
  await expect(
    bolum.getByRole("timer", { name: metin("vitrin.bolum.firsatlar.kalanSure") }),
  ).toBeVisible();
  // Katalogdaki ilk iki fırsat 40 dakika ve 3 saat 20 dakika sonra biter (cekirdek/katalog/ornek-baglam.ts).
  await expect(bolum.getByText(/^Bitmesine (40|39) dakika$/)).toBeVisible();
  await expect(bolum.getByRole("heading", { level: 3 })).toHaveCount(2);
  await page.clock.runFor(41 * 60_000);
  await expect(bolum.getByRole("heading", { level: 3 })).toHaveCount(1);
  await expect(bolum.getByText(/^Bitmesine 2 saat (39|40) dakika$/)).toBeVisible();
  await tara(page, "fırsatlar, bir kart bitti");
  await page.clock.runFor(3 * 60 * 60_000);
  await expect(bolum).toHaveCount(0);
});

test("marka logoları: logolu markada logo, logosuzda adı; her kutu markanın sayfasına bağlı", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  // İlk örnek başlıksızdır, adı "Markalar"dır; ikincisinin başlığı da "Markalar"dır.
  const bolum = page.getByRole("region", { name: om("markalar") }).first();
  await expect(bolum.getByRole("link", { name: om("marka1") }).locator("img")).toBeVisible();
  await expect(bolum.getByRole("link", { name: om("marka3") })).toHaveText(om("marka3"));
  expect(await yanaKayma(page)).toBe(0);
});

// İşleve bağlı bölümler (kart 0112): bölüm kütüphanesi testi sayfanın tamamını iki renkte ve üç genişlikte
// tarar; burada bülten formu klavyeyle denenir. Katalogda gönderim adresi yoktur: form yalnız doğrular.
test("bülten kaydı: boş gönderilince odak e-postaya gider, iki hata görünür; doldurulunca hata kalkar", async ({
  page,
}) => {
  const istekler: string[] = [];
  page.on("request", (istek) => {
    if (istek.url().includes("/kapi/")) istekler.push(istek.url());
  });
  await page.setViewportSize({ width: 375, height: 800 });
  await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  const bolum = page.getByRole("region", { name: om("bultenBaslik") }).first();
  const eposta = bolum.getByLabel(metin("vitrin.bolum.bultenKaydi.eposta"));
  const gonder = bolum.getByRole("button", { name: metin("vitrin.bolum.bultenKaydi.gonder") });
  await expect(gonder).toBeEnabled();
  await gonder.focus();
  await page.keyboard.press("Enter");
  await expect(eposta).toBeFocused();
  await expect(eposta).toHaveAttribute("aria-invalid", "true");
  await expect(bolum.getByText(metin("vitrin.bolum.bultenKaydi.hataOnay"))).toBeVisible();
  await tara(page, "bülten, hatalar görünürken");
  await eposta.fill("musteri@ornek.test");
  // Sıra e-posta, onay, düğme: onay düğmeden önce gelir.
  await page.keyboard.press("Tab");
  const onay = bolum.getByRole("checkbox", { name: metin("vitrin.onay.pazarlama") });
  await expect(onay).toBeFocused();
  // Odak çerçevesi form kutusunun zemininde okunur (kart 0112 kontrolü: renkli şeridin kuralı onu kutunun zemin
  // rengine çeviriyordu).
  const odakOkunur = async (oge: Locator) => {
    // Düğmenin renk geçişi çerçeve rengini de değiştirir: geçiş bitince ölçülür.
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
    );
    const cerceve = await oge.evaluate((e) => getComputedStyle(e).outlineColor);
    const arka = await oge.evaluate(
      (e) => getComputedStyle(e.closest(".bg-zemin") ?? document.body).backgroundColor,
    );
    return kontrastOrani(onaltilik(cerceve), onaltilik(arka));
  };
  expect(await odakOkunur(onay)).toBeGreaterThanOrEqual(3);
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(bolum.getByRole("link", { name: metin("vitrin.kayit.kvkkBaglanti") })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(gonder).toBeFocused();
  expect(await odakOkunur(gonder)).toBeGreaterThanOrEqual(3);
  await page.keyboard.press("Enter");
  await expect(bolum.getByText(metin("vitrin.bolum.bultenKaydi.hataOnay"))).toHaveCount(0);
  await expect(eposta).not.toHaveAttribute("aria-invalid", "true");
  // Form sayfa açılınca robot sorusu istemez (ertelenmiş), katalogda gönderim de yoktur.
  expect(istekler).toEqual([]);
  expect(await yanaKayma(page)).toBe(0);
});

// Kart 0130: aydınlatma metni bağlantısı telefonda iki satıra iner; satırlar formun öteki öğeleri gibi sola
// yaslıdır (düğmenin text-center'ı ikinci satırı ortalıyordu). Her bülten görünümü ölçülür.
for (const genislik of [320, 390]) {
  test(`bülten kaydı: aydınlatma bağlantısının iki satırı da sola yaslı (${genislik} px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: genislik, height: 800 });
    await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
    const baglantilar = page
      .getByRole("region", { name: om("bultenBaslik") })
      .getByRole("link", { name: metin("vitrin.kayit.kvkkBaglanti") });
    expect(await baglantilar.count()).toBeGreaterThan(0);
    for (const baglanti of await baglantilar.all()) {
      const satirlar = await satirlarinSolu(baglanti, '[data-slot="onay-kutusu"]');
      expect(satirlar.length, "bağlantı iki satıra inmeli").toBeGreaterThanOrEqual(2);
      expect(
        satirlar.every((sol) => sol === 0),
        `satırların solu: ${satirlar}`,
      ).toBe(true);
    }
    await tara(page, `bülten bağlantısı ${genislik} px`);
  });
}

// Kart 0112 kontrolü: şerit öğesinin içindeki mutlak konumlu öğe (ekran okuyucu yazısı) kırpma kutusunun dışında
// kalıyor, şeridin kodu yüklenene kadar sayfayı yana kaydırıyordu. Yalnız yük altında görülüyordu: işlemci
// yavaşlatılır, sayfa yüklenirken çeyrek saniyede bir ölçülür.
test("bölüm kütüphanesi telefonda yüklenirken de yana kaymaz (yavaş işlemci)", async ({ page }) => {
  test.setTimeout(90_000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 8 });
  await page.setViewportSize({ width: 375, height: 800 });
  const yuklenme = page.goto(`${katalogAdresi}/bolum-kutuphanesi`);
  const olcumler: number[] = [];
  for (let adim = 0; adim < 30; adim += 1) {
    await page.waitForTimeout(250);
    // Sayfa değişirken değerlendirme düşebilir: o adım sayılmaz.
    const kayma = await yanaKayma(page).catch(() => undefined);
    if (kayma !== undefined) olcumler.push(kayma);
  }
  await yuklenme;
  expect(olcumler.length).toBeGreaterThan(10);
  expect(Math.max(...olcumler)).toBe(0);
});

// Kart 0171: ürün vitrininin yan afişi. Masaüstünde görsel afişin iç genişliğini doldurur ve afiş ızgarayla aynı
// boydadır (eski hâlde görsel üçte iki genişlikte küçük bir kareydi); daha darda görsel sağda kendi oranıyla,
// kırpılmadan durur (dikey görsel geniş kutuya kırpılınca konusu kadrajdan çıkıyordu).
test("ürün vitrininin yan afişi: görsel masaüstünde altı doldurur, daha darda oranını korur", async ({
  page,
}) => {
  await ac(page, `${katalogAdresi}/bolum-kutuphanesi`);
  const baslik = page.getByRole("heading", {
    name: metin("gelistirme.bolum.ornek.anaSayfa.yeniGelenler"),
    exact: true,
  });
  const bolum = page.locator("section").filter({ has: baslik }).first();
  for (const genislik of [{ ad: "dar telefon", width: 320, height: 700 }, ...genislikler]) {
    await page.setViewportSize(genislik);
    await bolum.scrollIntoViewIfNeeded();
    await expect
      .poll(
        () =>
          bolum.evaluate((kap, masaustu) => {
            const img = [...kap.querySelectorAll("img")].find((oge) =>
              oge.parentElement?.className.includes("masaustu:w-panel"),
            );
            const afis = img?.parentElement;
            if (img === undefined || afis === null || afis === undefined || !img.complete)
              return "görsel yok";
            const r = img.getBoundingClientRect();
            const a = afis.getBoundingClientRect();
            const stil = getComputedStyle(afis);
            const ic =
              a.width - Number.parseFloat(stil.paddingLeft) - Number.parseFloat(stil.paddingRight);
            if (r.right > a.right + 0.5 || r.bottom > a.bottom + 0.5)
              return "görsel afişten taşıyor";
            // Yazı ve düğme dar sütunda kırılır, görselin üstüne ya da afişin dışına taşmaz.
            for (const oge of afis.querySelectorAll("p, h2, a")) {
              const o = oge.getBoundingClientRect();
              if (o.right > r.left + 0.5 && o.left < r.left && o.bottom > r.top && o.top < r.bottom)
                return `yazı görselin üstüne taşıyor: ${oge.tagName}`;
              if (o.right > a.right + 0.5) return `yazı afişten taşıyor: ${oge.tagName}`;
            }
            if (masaustu) {
              if (Math.abs(r.width - ic) > 1)
                return `görsel genişliği ${Math.round(r.width)}, iç ${Math.round(ic)}`;
              const izgara = afis.nextElementSibling?.getBoundingClientRect();
              if (izgara === undefined || Math.abs(a.height - izgara.height) > 1)
                return "afiş ızgaradan uzun";
              return "tamam";
            }
            const oran = r.width / r.height;
            const dogal = img.naturalWidth / img.naturalHeight;
            return Math.abs(oran - dogal) < 0.03
              ? "tamam"
              : `oran ${oran.toFixed(2)}, doğal ${dogal.toFixed(2)}`;
          }, genislik.width >= 1024),
        { message: genislik.ad },
      )
      .toBe("tamam");
  }
});
