// Panelin vitrin bölümleri ekranı ve Slider kısayolu gerçek tarayıcıda ve gerçek veritabanıyla (kart 0142, karar
// 0080 ve 0101): mağaza sahibi klavyeyle bölüm ekler, düzenler, sıralar, gizler, siler, silmeyi geri alır ve önceki
// hâline döner; her değişiklik vitrinde görünür. Kısayol üç durumda karardaki gibi davranır: slider yoksa yeni form
// (kaydedilince ana sayfanın en üstüne), birden çok slider varsa ilki ve sayısı, gizli slider'da "Görünür yap".
// Ekran iki renkte ve üç genişlikte, pencereleri açıkken de taramadan geçer, yana kaymaz, konsolda hata yoktur.
//
// Düzen sitenin paylaşılan düzenidir (vitrin-cercevesi.test.ts gibi): test kendi bölümlerini ekler ve sonunda
// kaldırır; kısayol testi ana sayfadaki slider'ları kaldırıp sonunda aynı yerlerine geri koyar.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { dosyaKlasoruDegiskeni } from "../../kayitlar/dosya";
import { metin } from "../../metinler/site-metni";
import { dosyaSil, gorselKaydet } from "../../moduller/dosya/servis";
import { duzenServisi } from "../../moduller/duzen/servis";
import { doldur } from "../../moduller/eposta/sablon";
import { menuEkle, menuSil, ogeEkle } from "../../moduller/menu/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../../vitrin/adresler";
import type { BolumOrnegi } from "../../vitrin/bolum-kutuphanesi/duzen";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, type DenemeYoneticisi, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const servis = duzenServisi(calisanSite);
const kim = sistemIslemi("uctan-uca-vitrin-bolumleri");

const bolumlerAdresi = "/yonetim/vitrin-bolumleri";
const sliderAdresi = "/yonetim/slider";

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

let yonetici: DenemeYoneticisi;

// Kart 0197: tıklama ve odaklanmanın Playwright'ta kendi sınırı yoktur; bulunamayan öğeyi bekleyen eylem testin
// 60 saniyelik sınırına kadar bekliyordu. Sınır dolunca dosyanın bağlantısı kapanır, testin temizliği "Cannot use a
// pool after calling end" ile düşer: bu ileti takılan eylemi gizler ve eklenen bölümler paylaşılan düzende kalır
// (ölçüldü). Eylem bu sınırla kendi iletisiyle düşer, temizlik bağlantı açıkken çalışır.
test.use({ actionTimeout: 15_000 });

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

const alanSekmesi = (page: Page, alan: "ust-kisim" | "ana-sayfa" | "alt-kisim") =>
  page.getByRole("tab", { name: new RegExp(`^${metin(`yonetim.bolumler.alanlar.${alan}`)}`) });

const duyuruAdi = () => metin("vitrin.bolum.duyuruSeridi.ad");
const eylemAdi = (anahtar: Parameters<typeof metin>[0]) =>
  doldur(metin(anahtar), { ad: duyuruAdi() });

// Testin eklediği bölümlerin kaldırılması: metni bilinen bölümler silinir.
const ustKisimdakileriSil = async (metinler: string[]) => {
  const { duzen } = await servis.duzenOku(vt);
  for (const bolum of duzen["ust-kisim"]) {
    if (metinler.includes(String(bolum.degerler["metin"]))) {
      await servis.bolumSil(vt, kim, bolum.kimlik);
    }
  }
};

const ustKisimSirasi = async () =>
  (await servis.duzenOku(vt)).duzen["ust-kisim"].map((bolum) => String(bolum.degerler["metin"]));

// Testler kısa tutulur: tam takımın yükünde tek uzun test süre sınırını (60 saniye) aştı ve temizliği yarıda kaldı
// (ölçüldü). Ekleme ve düzenleme bir testte, sıralama, gizleme ve silme kendi hazırladığı bölümle ötekinde.
test("mağaza sahibi klavyeyle bölüm ekler ve düzenler, kaydedilmemiş değişikliği sorar; vitrinde görünür", async ({
  page,
  context,
}) => {
  const ilk = `duyuru-${randomBytes(4).toString("hex")}`;
  const ikinci = `duyuru-${randomBytes(4).toString("hex")}`;
  const vitrin = await context.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yonetici);
    // Menüden Enter ile ekrana gidilir.
    const bag = page
      .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
      .getByRole("link", { name: metin("yonetim.sayfa.vitrinBolumleri.ad") });
    await bag.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${bolumlerAdresi}$`));
    await sayfaHazir(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      metin("yonetim.sayfa.vitrinBolumleri.ad"),
    );
    await expect(bag).toHaveAttribute("aria-current", "page");

    // Alan sekmeleri ok tuşlarıyla değişir: ana sayfadan üst kısma.
    await alanSekmesi(page, "ana-sayfa").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(alanSekmesi(page, "ust-kisim")).toHaveAttribute("aria-selected", "true");

    // Bölüm ekle yalnız bu alana konabilen türleri listeler.
    await page.getByRole("button", { name: metin("yonetim.bolumler.ekle.baslik") }).focus();
    await page.keyboard.press("Enter");
    const ekle = page.getByRole("dialog", { name: metin("yonetim.bolumler.ekle.baslik") });
    await expect(ekle.getByRole("button", { name: new RegExp(duyuruAdi()) })).toBeVisible();
    await expect(
      ekle.getByRole("button", { name: new RegExp(metin("vitrin.bolum.kayanAfis.ad")) }),
    ).toHaveCount(0);
    await ekle.getByRole("button", { name: new RegExp(duyuruAdi()) }).focus();
    await page.keyboard.press("Enter");

    // Form tariften çıkar; boş zorunlu alan sunucudan alanın hatasıyla döner.
    const form = page.getByRole("dialog", { name: duyuruAdi() });
    const kaydet = form.getByRole("button", { name: metin("yonetim.bolumler.form.kaydet") });
    await kaydet.click();
    await expect(form.getByText(metin("yonetim.bolumler.hata.form"))).toBeVisible();
    const duyuruAlani = form.getByLabel(metin("vitrin.bolum.duyuruSeridi.metin"));
    await expect(duyuruAlani).toHaveAttribute("aria-invalid", "true");
    await duyuruAlani.fill(ilk);
    await duyuruAlani.press("Enter");
    await expect(bildirim(page, "yonetim.bolumler.eklendi")).toBeVisible();
    await expect(form).toHaveCount(0);
    const satir = page.getByRole("listitem").filter({ hasText: ilk });
    await expect(satir).toBeVisible();
    expect((await ustKisimSirasi()).at(-1)).toBe(ilk);
    await vitrin.goto(vitrinAdresleri.anasayfa);
    await expect(vitrin.getByRole("banner").getByText(ilk)).toBeVisible();

    // Düzenleme: değer değişir, vitrinde yenisi görünür.
    await satir.getByRole("button", { name: eylemAdi("yonetim.bolumler.duzenle") }).click();
    await form.getByLabel(metin("vitrin.bolum.duyuruSeridi.metin")).fill(ikinci);
    // Kaydedilmemiş değişiklikle Escape pencereyi kapatmaz, sorar; "Düzenlemeye dön" formu bırakmaz.
    await page.keyboard.press("Escape");
    await expect(form.getByText(metin("yonetim.bolumler.form.kaydedilmedi"))).toBeVisible();
    await form.getByRole("button", { name: metin("yonetim.bolumler.form.don") }).click();
    await expect(form.getByLabel(metin("vitrin.bolum.duyuruSeridi.metin"))).toHaveValue(ikinci);
    await form.getByRole("button", { name: metin("yonetim.bolumler.form.kaydet") }).click();
    await expect(bildirim(page, "yonetim.bolumler.kaydedildi")).toBeVisible();
    const satir2 = page.getByRole("listitem").filter({ hasText: ikinci });
    await expect(satir2).toBeVisible();
    await vitrin.reload();
    await expect(vitrin.getByRole("banner").getByText(ikinci)).toBeVisible();
  } finally {
    await ustKisimdakileriSil([ilk, ikinci]);
  }
});

// Kart 0169: uzun formun kaydet çubuğu pencerenin alt kenarındadır, Slider sayfasında kartın içindedir; kaydırılan içeriğin iç boşluğu yüzünden çubuğun
// altında 24 px'lik bir aralık kalıyor, form orada görünüyordu (eski hâlde üç genişlikte ölçüldü).
test("uzun formda kaydet çubuğu pencerenin alt kenarındadır, altında form görünmez", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await paneleGir(page, yonetici);
  await page.goto(bolumlerAdresi);
  await sayfaHazir(page);
  await page.getByRole("button", { name: metin("yonetim.bolumler.ekle.baslik") }).click();
  await page
    .getByRole("dialog", { name: metin("yonetim.bolumler.ekle.baslik") })
    .getByRole("button", { name: new RegExp(metin("vitrin.bolum.kayanAfis.ad")) })
    .click();
  const form = page.getByRole("dialog", { name: metin("vitrin.bolum.kayanAfis.ad") });
  await expect(form).toBeVisible();
  for (const genislik of genislikler) {
    await page.setViewportSize(genislik);
    await expect
      .poll(
        () =>
          form.evaluate((pencere) => {
            const cubuk = pencere.querySelector('[data-slot="yan-pencere-alt-cubugu"]');
            if (cubuk === null) return "çubuk yok";
            if (pencere.scrollHeight <= pencere.clientHeight) return "form kaymıyor";
            const c = cubuk.getBoundingClientRect();
            const p = pencere.getBoundingClientRect();
            const alt = Math.min(p.bottom, window.innerHeight);
            if (alt - c.bottom > 1) return `çubuğun altında ${Math.round(alt - c.bottom)} px`;
            // Çubuğun bölgesinde en üstte çizilen öğe her yerde çubuğun kendisidir.
            for (let y = c.top + 2; y < alt; y += 4) {
              for (const x of [p.left + 8, (p.left + p.right) / 2, p.right - 8]) {
                const oge = document.elementFromPoint(x, y);
                if (oge !== null && !cubuk.contains(oge)) return `çubuğun üstünde öğe: ${y}`;
              }
            }
            return "tamam";
          }),
        { message: genislik.ad },
      )
      .toBe("tamam");
  }
  await page.keyboard.press("Escape");
  await expect(form).toHaveCount(0);

  // Aynı form Slider sayfasında kartın içindedir: çubuk kartın dışına taşmaz (bağımsız kontrolün bulgusu: telefonda
  // kartın iç boşluğu pencereninkinden küçüktü, çubuk iki yandan 8 px taşıyordu).
  await page.goto(sliderAdresi);
  await sayfaHazir(page);
  for (const genislik of genislikler) {
    await page.setViewportSize(genislik);
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const cubuk = document.querySelector('[data-slot="yan-pencere-alt-cubugu"]');
            const kart = cubuk?.closest('[data-slot="kart"]');
            if (cubuk === null || kart === null || kart === undefined)
              return "çubuk ya da kart yok";
            const c = cubuk.getBoundingClientRect();
            const k = kart.getBoundingClientRect();
            if (c.left < k.left - 0.5 || c.right > k.right + 0.5)
              return "çubuk kartın yanından taşıyor";
            if (c.bottom > window.innerHeight + 0.5) return "çubuk ekranın altında";
            return "tamam";
          }),
        { message: genislik.ad },
      )
      .toBe("tamam");
  }
});

// Kart 0172: vitrinde içeriği boş kaldığı için bugün çizilmeyen bölüm panelde "vitrinde görünmüyor" işaretini ve
// türüne göre nedenini alır; içerik gelince işaret kalkar. Test kendi boş menüsünü ve ona bağlı alt kısım bölümünü
// açar, sonunda kaldırır.
test("boş içerikli bölüm panelde nedeniyle işaretli, içerik gelince işaret kalkar", async ({
  page,
}) => {
  const ek = randomBytes(4).toString("hex");
  const menu = await menuEkle(vt, kim, { kod: `bos-${ek}`, ad: `Boş ${ek}`, tur: "elle" });
  const bolum = await servis.bolumEkle(vt, kim, "alt-kisim", {
    tur: "baglanti-sutunlari",
    gorunum: "sutunlu",
    degerler: { menu: `bos-${ek}` },
  });
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yonetici);
    await page.goto(bolumlerAdresi);
    await sayfaHazir(page);
    await alanSekmesi(page, "alt-kisim").click();
    const satirlar = page.getByRole("listitem").filter({
      hasText: metin("vitrin.bolum.baglantiSutunlari.ad"),
    });
    const neden = metin("yonetim.duzen.neden.bos.baglanti-sutunlari");
    await expect(satirlar.filter({ hasText: neden })).toHaveCount(1);
    await expect(
      satirlar
        .filter({ hasText: neden })
        .getByText(metin("yonetim.bolumler.gorunmuyorRozet"), { exact: true }),
    ).toBeVisible();
    // Menüye öğe eklenince bölüm vitrinde çizilir: işaret kalkar.
    await ogeEkle(vt, kim, menu, { metin: `Öğe ${ek}`, hedef: { tur: "adres", adres: "/" } });
    await page.reload();
    await sayfaHazir(page);
    await alanSekmesi(page, "alt-kisim").click();
    await expect(satirlar.filter({ hasText: neden })).toHaveCount(0);
  } finally {
    await servis.bolumSil(vt, kim, bolum);
    await menuSil(vt, kim, menu);
  }
});

test("mağaza sahibi sıralar, gizler, siler, silmeyi geri alır ve önceki hâline döner; vitrinde görünür", async ({
  page,
  context,
}) => {
  // Kart 0197: aynı türden birden çok bölümün paneldeki adı sırasını taşır ("Duyuru şeridi, 4. sıradaki").
  // Paylaşılan düzende başka duyuru şeridi olup olmadığı bilinmez (sitenin başlangıç düzeninde vardır, yereldeki
  // düzende silinmiş olabilir); test kendi eşlik bölümünü de koyar, ad her zaman sıralı biçimdedir.
  const eslik = `duyuru-${randomBytes(4).toString("hex")}`;
  const ikinci = `duyuru-${randomBytes(4).toString("hex")}`;
  for (const deger of [eslik, ikinci]) {
    await servis.bolumEkle(vt, kim, "ust-kisim", {
      tur: "duyuru-seridi",
      degerler: { metin: deger },
    });
  }
  const sirali = (sira: number) =>
    doldur(metin("yonetim.bolumler.ayniTurAdi"), { ad: duyuruAdi(), sira: String(sira) });
  const vitrin = await context.newPage();
  try {
    await vitrin.goto(vitrinAdresleri.anasayfa);
    await expect(vitrin.getByRole("banner").getByText(ikinci)).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yonetici);
    await page.goto(bolumlerAdresi);
    await sayfaHazir(page);
    await alanSekmesi(page, "ust-kisim").click();
    const satir2 = page.getByRole("listitem").filter({ hasText: ikinci });
    await expect(satir2).toBeVisible();

    // Sıralama klavyeyle: tutamağa odaklanıp boşluk, yukarı ok, boşluk.
    const once = await ustKisimSirasi();
    const yer = once.indexOf(ikinci) + 1;
    // Her adımın duyurusu beklenir; @dnd-kit ok tuşu dinleyicisini sayfanın bir sonraki işinde bağlar (katalog.test.ts).
    // Taşıma sürerken liste değişmez: duyurudaki ad bölümün alındığı sıradaki adıdır.
    const duyuruldu = (anahtar: Parameters<typeof metin>[0], sira: number) =>
      expect(
        page.getByText(
          doldur(metin(anahtar), {
            ad: sirali(yer),
            sira: String(sira),
            toplam: String(once.length),
          }),
          { exact: true },
        ),
      ).toBeAttached();
    await satir2
      .getByRole("button", {
        name: doldur(metin("ortak.parca.siralama.tasi"), { ad: sirali(yer) }),
        exact: true,
      })
      .focus();
    await page.keyboard.press("Space");
    await duyuruldu("ortak.parca.siralama.alindi", yer);
    await page.evaluate(() => new Promise<void>((tamam) => setTimeout(tamam, 0)));
    await page.keyboard.press("ArrowUp");
    await duyuruldu("ortak.parca.siralama.tasindi", yer - 1);
    await page.keyboard.press("Space");
    await expect(bildirim(page, "yonetim.bolumler.siralandi")).toBeVisible();
    await expect
      .poll(async () => (await ustKisimSirasi()).indexOf(ikinci))
      .toBe(once.indexOf(ikinci) - 1);
    // Aşağı al düğmesiyle geri.
    await satir2.getByRole("button", { name: eylemAdi("ortak.parca.siralama.asagi") }).click();
    await expect
      .poll(async () => (await ustKisimSirasi()).indexOf(ikinci))
      .toBe(once.indexOf(ikinci));

    // Gizleme: satır işaretlenir, vitrinde görünmez.
    await satir2.getByRole("button", { name: eylemAdi("yonetim.bolumler.gizle") }).click();
    await expect(bildirim(page, "yonetim.bolumler.gizlendi")).toBeVisible();
    await expect(satir2.getByText(metin("yonetim.bolumler.gizliRozet"))).toBeVisible();
    await vitrin.reload();
    await expect(vitrin.getByText(ikinci)).toHaveCount(0);
    await satir2.getByRole("button", { name: eylemAdi("yonetim.bolumler.goster") }).click();
    await expect(bildirim(page, "yonetim.bolumler.gosterildi")).toBeVisible();
    await vitrin.reload();
    await expect(vitrin.getByRole("banner").getByText(ikinci)).toBeVisible();

    // Silme "Diğer işlemler" menüsünden, klavyeyle; bildirimdeki "Geri al" bölümü geri getirir.
    await satir2.getByRole("button", { name: eylemAdi("yonetim.bolumler.diger") }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: metin("yonetim.bolumler.sil") }).press("Enter");
    await expect(bildirim(page, "yonetim.bolumler.silindi")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: ikinci })).toHaveCount(0);
    // Silinen satırın yerine odak komşu satıra geçer, sayfanın gövdesine düşmez.
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.closest("[data-anahtar]") !== null))
      .toBe(true);
    await page
      .getByRole("region", { name: metin("ortak.parca.bildirimler") })
      .getByRole("button", { name: metin("yonetim.bolumler.geriAl") })
      .click();
    await expect(bildirim(page, "yonetim.bolumler.geriDonuldu")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: ikinci })).toBeVisible();
    await vitrin.reload();
    await expect(vitrin.getByRole("banner").getByText(ikinci)).toBeVisible();

    // "Önceki hâline dön" son değişikliği (geri almayı) geri alır: bölüm yeniden silinmiş olur.
    await page.getByRole("button", { name: metin("yonetim.eylem.oncekiHaleDon") }).click();
    await expect(page.getByRole("listitem").filter({ hasText: ikinci })).toHaveCount(0);
    await vitrin.reload();
    await expect(vitrin.getByText(ikinci)).toHaveCount(0);
  } finally {
    await ustKisimdakileriSil([eslik, ikinci]);
  }
});

// Testin görseli: dosya klasörüne kaydedilir, panelin görsel seçiminde en yenidir.
const gorselAc = async () => {
  const klasor = process.env[dosyaKlasoruDegiskeni];
  if (klasor === undefined) throw new Error("Dosya klasörü verilmedi.");
  const icerik = await sharp({
    create: { width: 1200, height: 500, channels: 3, background: { r: 30, g: 80, b: 140 } },
  })
    .png()
    .toBuffer();
  const sonuc = await gorselKaydet(vt, icerik, klasor);
  if (!sonuc.tamam) throw new Error(sonuc.hata);
  return sonuc.dosya.kimlik;
};

const sliderTuru = "kayan-afis";
const sliderBasligi = (bolum: BolumOrnegi) =>
  String((bolum.degerler["slaytlar"] as { baslik?: string }[] | undefined)?.[0]?.baslik ?? "");

const slaytBasligi = (kap: Page | Locator) =>
  kap
    .getByRole("group", { name: `${metin("vitrin.bolum.kayanAfis.slayt")} 1` })
    .getByLabel(metin("vitrin.bolum.alan.baslik"));

test("Slider kısayolu: yoksa yeni form en üste ekler, birden çokta ilkini açar, gizlide görünür yapar", async ({
  page,
}) => {
  const birinci = `slider-${randomBytes(4).toString("hex")}`;
  const ikinci = `slider-${randomBytes(4).toString("hex")}`;
  // Ana sayfadaki slider'lar test boyunca kaldırılır, sonunda aynı yerlerine konur.
  const { duzen } = await servis.duzenOku(vt);
  const eskiler = duzen["ana-sayfa"]
    .map((bolum, sira) => ({ bolum, sira }))
    .filter(({ bolum }) => bolum.tur === sliderTuru);
  let guven: string | undefined;
  let gorsel = "";
  try {
    for (const { bolum } of eskiler) await servis.bolumSil(vt, kim, bolum.kimlik);
    // Ana sayfada slider olmayan bir bölüm durur: yeni slider onun üstüne, en üste eklenmeli (sona değil).
    guven = await servis.bolumEkle(vt, kim, "ana-sayfa", {
      tur: "guven-seridi",
      degerler: { maddeler: [{ ikon: "kargo", metin: birinci }] },
    });
    gorsel = await gorselAc();
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yonetici);
    await page
      .getByRole("navigation", { name: metin("yonetim.cerceve.menu") })
      .getByRole("link", { name: metin("vitrin.bolum.kayanAfis.ad") })
      .click();
    await expect(page).toHaveURL(new RegExp(`${sliderAdresi}$`));
    await sayfaHazir(page);

    // Slider yok: yeni slider formu bir boş slaytla açılır.
    await expect(page.getByText(metin("yonetim.bolumler.slider.yok"))).toBeVisible();
    const slayt = page.getByRole("group", { name: `${metin("vitrin.bolum.kayanAfis.slayt")} 1` });
    await slayt.getByLabel(metin("vitrin.bolum.kayanAfis.gorsel")).click();
    const pencere = page.getByRole("dialog", { name: metin("yonetim.gorselSecimi.baslik") });
    await pencere
      .getByRole("button", {
        name: doldur(metin("yonetim.gorselSecimi.gorselAdi"), {
          sira: "1",
          genislik: "1200",
          yukseklik: "500",
        }),
      })
      .click();
    await expect(pencere).toHaveCount(0);
    await slaytBasligi(page).fill(birinci);
    await page.getByRole("button", { name: metin("yonetim.bolumler.form.kaydet") }).click();
    await expect(bildirim(page, "yonetim.bolumler.eklendi")).toBeVisible();
    const yeni = (await servis.duzenOku(vt)).duzen["ana-sayfa"];
    expect(yeni[0]?.tur).toBe(sliderTuru);
    expect(sliderBasligi(yeni[0] as BolumOrnegi)).toBe(birinci);
    await expect(page.getByText(metin("yonetim.bolumler.slider.yok"))).toHaveCount(0);
    const vitrin = await page.context().newPage();
    await vitrin.goto(vitrinAdresleri.anasayfa);
    await expect(vitrin.getByRole("heading", { name: birinci })).toBeVisible();
    await vitrin.close();

    // Birden çok slider: ilki açılır, sayısı yazar. İlki gizliyse bu yazar ve "Görünür yap" durur.
    const ilkSlider = yeni[0] as BolumOrnegi;
    await servis.bolumEkle(vt, kim, "ana-sayfa", {
      tur: sliderTuru,
      degerler: { slaytlar: [{ gorsel, baslik: ikinci }] },
    });
    await servis.bolumGorunurlugu(vt, kim, ilkSlider.kimlik, true);
    await page.reload();
    await sayfaHazir(page);
    await expect(
      page.getByText(doldur(metin("yonetim.bolumler.slider.birdenCok"), { sayi: "2" })),
    ).toBeVisible();
    await expect(slaytBasligi(page)).toHaveValue(birinci);
    await expect(page.getByText(metin("yonetim.bolumler.slider.gizli"))).toBeVisible();
    await page.getByRole("button", { name: metin("yonetim.bolumler.slider.gorunurYap") }).click();
    await expect(bildirim(page, "yonetim.bolumler.gosterildi")).toBeVisible();
    await expect(page.getByText(metin("yonetim.bolumler.slider.gizli"))).toHaveCount(0);
    const sonra = (await servis.duzenOku(vt)).duzen["ana-sayfa"].find(
      (bolum) => bolum.kimlik === ilkSlider.kimlik,
    );
    expect(sonra?.gizli).toBe(false);
  } finally {
    const { duzen: son } = await servis.duzenOku(vt);
    for (const bolum of son["ana-sayfa"]) {
      if (bolum.tur === sliderTuru && [birinci, ikinci].includes(sliderBasligi(bolum))) {
        await servis.bolumSil(vt, kim, bolum.kimlik);
      }
    }
    const kalan = new Set(son["ana-sayfa"].map((bolum) => bolum.kimlik));
    for (const { bolum, sira } of eskiler) {
      if (kalan.has(bolum.kimlik)) continue;
      await servis.bolumEkle(
        vt,
        kim,
        "ana-sayfa",
        { tur: bolum.tur, gorunum: bolum.gorunum, gizli: bolum.gizli, degerler: bolum.degerler },
        sira,
      );
    }
    if (guven !== undefined) await servis.bolumSil(vt, kim, guven);
    if (gorsel !== "") await dosyaSil(vt, gorsel);
  }
});

// Her renk ve genişlik ayrı testtir: altısı tek testte yüksüz bilgisayarda 48 saniye sürdü, hattın yükünde süre
// sınırını (60 saniye) aşardı.
for (const renk of ["light", "dark"] as const) {
  for (const { ad, width, height } of genislikler) {
    test(`${renk} ${ad}: ekran ve pencereleri taramadan geçer, yana kaymaz, konsolda hata yok`, async ({
      page,
    }) => {
      // Boş gönderilen formun doğrulama yanıtı (400) beklenir: tarayıcı onu konsola yazar.
      const hatalar = konsoluDinle(page, { haric: (ileti) => ileti.includes("status of 400") });
      await page.emulateMedia({ colorScheme: renk });
      await page.setViewportSize({ width, height });
      await paneleGir(page, yonetici);
      await page.goto(bolumlerAdresi);
      await sayfaHazir(page);
      await tara(page, "liste");
      expect(await yanaKayma(page)).toBe(0);
      await alanSekmesi(page, "ust-kisim").click();
      await tara(page, "üst kısım");
      await page.getByRole("button", { name: metin("yonetim.bolumler.ekle.baslik") }).click();
      const ekle = page.getByRole("dialog", { name: metin("yonetim.bolumler.ekle.baslik") });
      await expect(ekle).toBeVisible();
      await tara(page, "bölüm ekle");
      await ekle.getByRole("button", { name: new RegExp(duyuruAdi()) }).click();
      const form = page.getByRole("dialog", { name: duyuruAdi() });
      await expect(form).toBeVisible();
      await form.getByRole("button", { name: metin("yonetim.bolumler.form.kaydet") }).click();
      await expect(form.getByText(metin("yonetim.bolumler.hata.form"))).toBeVisible();
      await tara(page, "hatalı form");
      expect(await yanaKayma(page)).toBe(0);
      await page.keyboard.press("Escape");
      await expect(form).toHaveCount(0);
      await page.goto(sliderAdresi);
      await sayfaHazir(page);
      await tara(page, "slider");
      expect(await yanaKayma(page)).toBe(0);
      expect(hatalar).toEqual([]);
    });
  }
}
