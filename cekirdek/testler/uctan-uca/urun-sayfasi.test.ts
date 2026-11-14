// Ürün sayfası gerçek tarayıcıda (kart 0138, karar 0108). Test kendi ürünlerini açar ve sonunda siler (site ürün
// adı çekirdeğin testine yazılmaz): Renk (Açık, Koyu) ve Beden (S, M) seçenekli bir ürün; Açık-M tükenmiş, Koyu-S
// son adette, Koyu birleşimleri kendi görselini seçmiş; galeride iki görsel ve bir video. Ayrıca bir taslak ve
// bir gizli ürün.
// - İlk satılabilir birleşim seçili açılır; tükenmiş beden üstü çizili görünür, adı "tükendi" der; testlerin sitesinde
//   stoğa gelince haber ver eklentisi açık olduğu için seçilebilir ve "Tükendi" ile haber ver kutusunu gösterir
//   (kart 0144; eklentisiz sitedeki "seçilemez" kuralı birim testlerindedir: secim.test.ts, urun-ust.test.tsx); klavyeyle renk
//   değişince fiyat, stok yazısı, stok kodu, galerinin görseli ve adres değişir; sayfa yenilenince seçim kalır.
// - Seçilen beden başka renkte tükenmişse korunur, "Tükendi" ve haber ver kutusu görünür (kart 0167).
// - Galeri klavyeyle gezilir, büyütme penceresi ok tuşlarıyla görselleri gezer ve kapanınca odağı geri verir;
//   video oynata basılana kadar video sitesine istek gitmez.
// - İki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yoktur.
// - Taslak ürünün adresi 404, gizli ürününki 200.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { dosyaSil, gorselKaydet } from "../../moduller/dosya/servis";
import { doldur } from "../../moduller/eposta/sablon";
import { fiyatGosterimServisi } from "../../moduller/fiyat/gosterim";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { basilmayanNoktalar } from "./basilan-alan";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";

if (existsSync(".env")) process.loadEnvFile(".env");

const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;

// Biçimli uzun açıklama: betik ve olay özniteliği tarayıcıda çalışmaz, bağlantı güvenli kalır.
const aciklama =
  '<p>Pamuk <strong>gömlek</strong><img src="x" onerror="window.__calisti = 1"></p><script>window.__calisti = 1</script><ul><li>Rahat kesim</li></ul><p><a href="javascript:window.__calisti=1">bağlantı</a></p>';

const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

type Hazirlik = {
  adres: string;
  taslakAdresi: string;
  gizliAdresi: string;
  urunAdi: string;
  // Birleşimin sitenin para biçimiyle yazılmış fiyatı ve stok kodu.
  birlesimler: Record<"acikS" | "acikM" | "koyuS" | "koyuM", { fiyat: string; stokKodu: string }>;
  temizle: () => Promise<void>;
};

const gorselUret = async (vt: Veritabani, mavi: number) => {
  const kayit = await gorselKaydet(
    vt,
    await sharp({
      create: { width: 800, height: 800, channels: 3, background: { r: 30, g: 80, b: mavi } },
    })
      .png()
      .toBuffer(),
  );
  if (!kayit.tamam) throw new Error(kayit.hata);
  return kayit.dosya.kimlik;
};

const hazirla = async (): Promise<Hazirlik> => {
  const vt = baglan(veritabaniAdresi());
  const ek = randomUUID().slice(0, 8);
  const temizlik: (() => Promise<unknown>)[] = [];
  const temizle = async () => {
    for (const adim of temizlik.reverse()) await adim();
    await vt.$client.end();
  };
  try {
    const servis = calisanSiteninUrunServisi();
    const fiyat = siteninFiyatServisi(calisanSite());
    const stok = stokServisi();
    const urunAdi = `Deneme gömlek ${ek}`;
    const urun = await servis.urunEkle(vt, yapan, {
      ad: urunAdi,
      adresAdi: `deneme-gomlek-${ek}`,
      vergiSinifi: null,
      durum: "yayinda",
      uzunAciklama: aciklama,
    });
    temizlik.push(() => servis.urunSil(vt, yapan, urun));
    const dosyalar = [await gorselUret(vt, 200), await gorselUret(vt, 20)];
    for (const dosya of dosyalar) temizlik.push(() => dosyaSil(vt, dosya));
    await servis.galeriyeGorselEkle(vt, yapan, urun, {
      dosya: dosyalar[0] ?? "",
      alternatifMetin: `Açık gömlek ${ek}`,
    });
    await servis.galeriyeVideoEkle(vt, yapan, urun, {
      adres: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      alternatifMetin: `Tanıtım videosu ${ek}`,
    });
    const koyuGorsel = await servis.galeriyeGorselEkle(vt, yapan, urun, {
      dosya: dosyalar[1] ?? "",
      alternatifMetin: `Koyu gömlek ${ek}`,
    });
    await servis.secenekEkle(vt, yapan, urun, { ad: "Renk", degerler: ["Açık", "Koyu"] });
    await servis.secenekEkle(vt, yapan, urun, { ad: "Beden", degerler: ["S", "M"] });
    const okunan = await servis.urunuOku(vt, urun);
    const d = Object.fromEntries(
      (okunan?.secenekler ?? []).flatMap((s) => s.degerler.map((x) => [x.ad, x.kimlik] as const)),
    ) as Record<"Açık" | "Koyu" | "S" | "M", string>;
    const tanimlar = {
      acikS: { degerler: [d.Açık, d.S], tutar: 30_000, miktar: 20 },
      acikM: { degerler: [d.Açık, d.M], tutar: 31_000, miktar: 0 },
      koyuS: { degerler: [d.Koyu, d.S], tutar: 32_000, miktar: 3, gorsel: koyuGorsel },
      koyuM: { degerler: [d.Koyu, d.M], tutar: 33_000, miktar: 20, gorsel: koyuGorsel },
    } as const;
    const birlesimler = {} as Hazirlik["birlesimler"];
    const gosterim = fiyatGosterimServisi(calisanSite());
    for (const [ad, tanim] of Object.entries(tanimlar) as [
      keyof typeof tanimlar,
      (typeof tanimlar)[keyof typeof tanimlar],
    ][]) {
      const stokKodu = `DG-${ek}-${ad}`.toUpperCase();
      const birim = await servis.birlesimEkle(vt, yapan, urun, {
        degerler: [...tanim.degerler],
        stokKodu,
        ...("gorsel" in tanim ? { gorsel: tanim.gorsel } : {}),
      });
      await fiyat.fiyatYaz(vt, yapan, birim, { satisFiyati: tanim.tutar });
      if (tanim.miktar > 0) {
        await stok.stokDuzelt(vt, yapan, birim, {
          yeniMiktar: tanim.miktar,
          gorulenMiktar: 0,
          sebep: "sayim",
        });
      }
      const yazili = (await gosterim.gosterilecekFiyatlar(vt, [birim])).get(birim)?.yazili.tutar;
      if (yazili === undefined) throw new Error("Birleşimin fiyatı okunamadı.");
      birlesimler[ad] = { fiyat: yazili, stokKodu };
    }
    const taslak = await servis.urunEkle(vt, yapan, {
      ad: `Deneme taslak ${ek}`,
      adresAdi: `deneme-taslak-${ek}`,
      vergiSinifi: null,
      durum: "taslak",
    });
    temizlik.push(() => servis.urunSil(vt, yapan, taslak));
    const gizli = await servis.urunEkle(vt, yapan, {
      ad: `Deneme gizli ${ek}`,
      adresAdi: `deneme-gizli-${ek}`,
      vergiSinifi: null,
      durum: "gizli",
    });
    temizlik.push(() => servis.urunSil(vt, yapan, gizli));
    return {
      adres: kayitAdresleri.urun(`deneme-gomlek-${ek}`),
      taslakAdresi: kayitAdresleri.urun(`deneme-taslak-${ek}`),
      gizliAdresi: kayitAdresleri.urun(`deneme-gizli-${ek}`),
      urunAdi,
      birlesimler,
      temizle,
    };
  } catch (hata) {
    await temizle();
    throw hata;
  }
};

// Radix'in radyo grubu ok tuşunda seçimi tuş bırakılmadan önce yapar: tuşa gerçek bir süre basılı tutulur.
const okTusu = (page: Page, tus: "ArrowLeft" | "ArrowRight") =>
  page.keyboard.press(tus, { delay: 50 });

const grup = (page: Page, ad: string) => page.getByRole("radiogroup", { name: ad });

const stokKoduYazisi = (kod: string) => doldur(metin("vitrin.urunSayfasi.stokKodu"), { kod });

const galeriAdi = (sira: number, toplam: number) =>
  doldur(metin("vitrin.urunSayfasi.galeri"), { sira: String(sira), toplam: String(toplam) });

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

let h: Hazirlik;
test.beforeAll(async () => {
  h = await hazirla();
});
test.afterAll(async () => {
  await h?.temizle();
});

test("ilk satılabilir birleşim seçili; tükenmiş beden haber için seçilir; klavyeyle seçim fiyatı, stoğu, görseli ve adresi değiştirir", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(h.adres);
  await sayfaHazir(page);
  const renk = grup(page, "Renk");
  const beden = grup(page, "Beden");
  await expect(renk.getByRole("radio", { checked: true })).toHaveText("Açık");
  await expect(beden.getByRole("radio", { checked: true })).toHaveText("S");
  await expect(page.getByText(stokKoduYazisi(h.birlesimler.acikS.stokKodu))).toBeVisible();
  await expect(page.locator("main").getByText(h.birlesimler.acikS.fiyat).first()).toBeVisible();

  // Açık-M tükenmiş: görünür, adı "tükendi" der. Eklenti açık: klavyeyle seçilir, "Tükendi" ve haber ver kutusu
  // görünür; S'ye dönülünce kutu kalkar.
  // Ekin önüne tarayıcı ekran okuyucu yazısı için boşluk koyabilir ("M , tükendi").
  const ek = metin("vitrin.urunSayfasi.tukendiEki").trim();
  const tukenmis = beden.getByRole("radio", { name: new RegExp(`^M\\s*${ek}$`) });
  await expect(tukenmis).not.toHaveAttribute("aria-disabled");
  const haberKutusu = page.getByRole("region", {
    name: metin("eklenti.stokBildirimi.form.baslik"),
  });
  await expect(haberKutusu).toHaveCount(0);
  await beden.getByRole("radio", { checked: true }).focus();
  await okTusu(page, "ArrowRight");
  await expect(tukenmis).toBeChecked();
  await expect(page.locator('[data-slot="stok-durumu"]')).toHaveText(metin("vitrin.stok.tukendi"));
  await expect(page).toHaveURL(/\?secenek-renk=acik&secenek-beden=m$/);
  await expect(haberKutusu).toBeVisible();
  await okTusu(page, "ArrowLeft");
  await expect(beden.getByRole("radio", { checked: true })).toHaveText("S");
  await expect(haberKutusu).toHaveCount(0);

  // Koyu'ya geçilir: Koyu-S son adette; kendi görseli (galerinin üçüncü öğesi) görünür.
  await renk.getByRole("radio", { checked: true }).focus();
  await okTusu(page, "ArrowRight");
  await expect(renk.getByRole("radio", { checked: true })).toHaveText("Koyu");
  await expect(beden.getByRole("radio", { checked: true })).toHaveText("S");
  await expect(page).toHaveURL(/\?secenek-renk=koyu&secenek-beden=s$/);
  await expect(page.getByText(stokKoduYazisi(h.birlesimler.koyuS.stokKodu))).toBeVisible();
  await expect(page.locator("main").getByText(h.birlesimler.koyuS.fiyat).first()).toBeVisible();
  const sonAdet = doldur(metin("vitrin.stok.son-adet"), {
    adet: siteninBicimleyicisi(calisanSite().ayarlar).sayi(3),
  });
  await expect(page.getByText(sonAdet)).toBeVisible();
  await expect(page.getByRole("region", { name: galeriAdi(3, 3) })).toBeVisible();
  // Koyu'da M satılabilir: seçilir.
  await beden.getByRole("radio", { name: "M", exact: true }).click();
  await expect(page).toHaveURL(/\?secenek-renk=koyu&secenek-beden=m$/);
  await expect(page.getByText(stokKoduYazisi(h.birlesimler.koyuM.stokKodu))).toBeVisible();

  // Sayfa yenilenince seçim adresten gelir.
  await page.reload();
  await sayfaHazir(page);
  await expect(renk.getByRole("radio", { checked: true })).toHaveText("Koyu");
  await expect(beden.getByRole("radio", { checked: true })).toHaveText("M");
  await expect(page.getByText(h.birlesimler.koyuM.fiyat).first()).toBeVisible();

  // Adresle verilen birleşimin görseli ilk açılışta görünen ve hemen yüklenen görseldir.
  await page.goto(`${h.adres}?secenek-renk=koyu&secenek-beden=m`);
  await sayfaHazir(page);
  await expect(page.getByRole("region", { name: galeriAdi(3, 3) })).toBeVisible();
  const koyu = page.getByRole("img", { name: /^Koyu gömlek/ }).first();
  await expect(koyu).toHaveAttribute("loading", "eager");
  await expect(koyu).toBeInViewport();
  await expect(page.getByRole("img", { name: /^Açık gömlek/ }).first()).toHaveAttribute(
    "loading",
    "lazy",
  );

  // Adresle verilen tükenmiş birleşim seçili açılır, "Tükendi" yazar.
  await page.goto(`${h.adres}?secenek-renk=acik&secenek-beden=m`);
  await sayfaHazir(page);
  await expect(beden.getByRole("radio", { checked: true })).toContainText("M");
  await expect(page.locator('[data-slot="stok-durumu"]')).toHaveText(metin("vitrin.stok.tukendi"));
  await expect(page.getByText(stokKoduYazisi(h.birlesimler.acikM.stokKodu))).toBeVisible();
});

// Kart 0167: müşterinin elle seçtiği beden başka renkte tükenmişse sessizce başka bedene geçilmez; eski kural
// satılabilir S'ye geçiyordu (müşteri M istediğini sanırken S'yi seçmiş oluyordu). Seçim adresle değil tıklamayla
// yapılır (bağımsız kontrolün bulgusu): sonraki seçenekte elle seçilen değer, önceki seçenek değişince korunur.
test("elle seçilen beden başka renkte tükenmişse korunur: Tükendi ve haber ver kutusu görünür", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(h.adres);
  await sayfaHazir(page);
  const renk = grup(page, "Renk");
  const beden = grup(page, "Beden");
  await renk.getByRole("radio", { name: "Koyu", exact: true }).click();
  await beden.getByRole("radio", { name: "M", exact: true }).click();
  await expect(page).toHaveURL(/\?secenek-renk=koyu&secenek-beden=m$/);
  await renk.getByRole("radio", { name: "Açık", exact: true }).click();
  await expect(page).toHaveURL(/\?secenek-renk=acik&secenek-beden=m$/);
  await expect(beden.getByRole("radio", { checked: true })).toContainText("M");
  await expect(page.locator('[data-slot="stok-durumu"]')).toHaveText(metin("vitrin.stok.tukendi"));
  await expect(
    page.getByRole("region", { name: metin("eklenti.stokBildirimi.form.baslik") }),
  ).toBeVisible();
  await expect(page.getByText(stokKoduYazisi(h.birlesimler.acikM.stokKodu))).toBeVisible();
});

// Kart 0173: telefonun kaydırmalı galerisi adresle seçili gelen birleşimin görseliyle açılır, sayfanın kodu
// bağlanmadan da. Eski hâlde şerit HTML'de ilk öğede başlıyordu; kod bağlanana kadar (ölçüldü: 0,5–1 saniye) başka
// renkteki ürünün görseli görünüyordu. Kod yüklüyken aynı adreste hidrasyon uyarısı yoktur.
test("telefonda seçili birleşimin görseli sayfanın kodu bağlanmadan görünür, hidrasyon uyarısı yok", async ({
  page,
  context,
}) => {
  const adres = `${h.adres}?secenek-renk=koyu&secenek-beden=m`;
  const gorunenGorsel = (sayfa: Page) =>
    sayfa.evaluate(() => {
      const serit = document.querySelector('[data-slot="urun-galerisi"] section');
      if (serit === null) return "şerit yok";
      const r = serit.getBoundingClientRect();
      const orta = r.left + r.width / 2;
      const img = [...serit.querySelectorAll("img")].find((oge) => {
        const b = oge.getBoundingClientRect();
        return b.left <= orta && b.right >= orta;
      });
      return img?.alt ?? "görsel yok";
    });
  const kodsuz = await context.newPage();
  try {
    await kodsuz.setViewportSize({ width: 375, height: 800 });
    await kodsuz.route("**/_next/static/**/*.js", (istek) => istek.abort());
    await kodsuz.goto(adres, { waitUntil: "load" });
    // Görünür olduğu ilk karede: sayfa yüklendikten sonra en çok bir saniye (bağımsız kontrolün bulgusu).
    await expect.poll(() => gorunenGorsel(kodsuz), { timeout: 1_000 }).toMatch(/^Koyu gömlek/);
  } finally {
    await kodsuz.close();
  }
  const hatalar = konsoluDinle(page, { haric: (metin) => metin.includes("401") });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(adres);
  await sayfaHazir(page);
  await expect.poll(() => gorunenGorsel(page)).toMatch(/^Koyu gömlek/);
  expect(hatalar).toEqual([]);
});

test("galeri klavyeyle gezilir, büyütme penceresi görselleri gezer; video oynata basılana kadar yüklenmez", async ({
  page,
}) => {
  const videoIstekleri: string[] = [];
  page.on("request", (istek) => {
    if (/youtube|vimeo/.test(new URL(istek.url()).hostname)) videoIstekleri.push(istek.url());
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(h.adres);
  await sayfaHazir(page);
  const galeri = page.getByRole("region", { name: galeriAdi(1, 3) });
  await galeri.focus();
  await okTusu(page, "ArrowRight");
  await expect(page.getByRole("region", { name: galeriAdi(2, 3) })).toBeFocused();
  const oynat = page.getByRole("button", {
    name: doldur(metin("vitrin.urunSayfasi.videoyuOynat"), { ad: "" }),
  });
  await expect(oynat).toBeVisible();
  expect(videoIstekleri).toEqual([]);

  // Küçük görselle ilk görsele dönülür, büyütülür; pencerede ok tuşu videoyu atlayıp sonraki görsele geçer.
  await page.getByRole("button", { name: /^1\. / }).click();
  const buyut = page.getByRole("button", { name: metin("vitrin.urunSayfasi.buyut") });
  await buyut.focus();
  await page.keyboard.press("Enter");
  const pencere = page.getByRole("dialog");
  await expect(pencere.getByRole("img")).toHaveAttribute("alt", /^Açık gömlek/);
  await okTusu(page, "ArrowRight");
  await expect(pencere.getByRole("img")).toHaveAttribute("alt", /^Koyu gömlek/);
  // İlk Escape açık ipucunu kapatabilir (kart 0103); pencere en geç ikincisiyle kapanır.
  await page.keyboard.press("Escape");
  if (await pencere.isVisible()) await page.keyboard.press("Escape");
  await expect(pencere).toBeHidden();
  await expect(buyut).toBeFocused();

  // Video yalnız oynata basınca, çerezsiz oynatıcıyla yüklenir.
  await page.getByRole("button", { name: /^2\. / }).click();
  await oynat.click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
  );
});

test("iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yok", async ({
  page,
}) => {
  // Girişsiz ziyaretçinin oturum sorusu 401 alır (karar 0098); bu bir hata değildir.
  const hatalar = konsoluDinle(page, { haric: (metin) => metin.includes("401") });
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const genislik of genislikler) {
      await page.setViewportSize(genislik);
      const yanit = await page.goto(h.adres);
      await sayfaHazir(page);
      expect(yanit?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(h.urunAdi);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0);
      await tara(page, `${renk}, ${genislik.width}`);
    }
  }
  expect(hatalar).toEqual([]);
});

// Kart 0191: küçük görünen bağlantıların basılan alanı en az 44 × 44 px; görünüşleri değişmez. Sayfa yolunun
// bağlantıları (32 px satır), yorumsuz ürünün "henüz yorum yok" bağlantısı ve üst kısmın logosu.
for (const genislik of [320, 390, 768]) {
  test(`sayfa yolu, yorum bağlantısı ve logo 44 × 44 px basılır (${genislik} px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: genislik, height: 900 });
    await page.goto(h.adres);
    await sayfaHazir(page);
    const ogeler = [
      ...(await page
        .getByRole("navigation", { name: metin("ortak.parca.sayfaYolu") })
        .getByRole("link")
        .all()),
      page.getByRole("link", { name: metin("vitrin.yorum.henuzYorumYok") }),
      // Logo ana sayfaya giden ilk bağlantıdır (logo yoksa mağazanın adı).
      page.getByRole("banner").locator('a[href="/"]').first(),
    ];
    expect(ogeler.length).toBeGreaterThanOrEqual(3);
    for (const oge of ogeler) {
      await expect(oge).toBeVisible();
      const ad = (await oge.getAttribute("aria-label")) ?? (await oge.textContent()) ?? "";
      expect(await basilmayanNoktalar(oge), ad).toEqual([]);
    }
  });
}

test("uzun açıklama temizlenmiş çizilir: biçim kalır, betik çalışmaz, bağlantı güvenli", async ({
  page,
}) => {
  await page.goto(h.adres);
  await sayfaHazir(page);
  const metin = page.locator('[data-slot="bicimli-metin"]');
  await expect(metin.locator("strong")).toHaveText("gömlek");
  await expect(metin.getByRole("listitem")).toHaveText("Rahat kesim");
  await expect(metin.locator("img, script")).toHaveCount(0);
  // Adresi düşen bağlantı "link" rolü taşımaz.
  const baglanti = metin.locator("a", { hasText: "bağlantı" });
  await expect(baglanti).not.toHaveAttribute("href", /.*/);
  await expect(baglanti).toHaveAttribute("rel", "nofollow noopener noreferrer");
  expect(await page.evaluate(() => (window as { __calisti?: number }).__calisti)).toBeUndefined();
});

test("taslak ürünün adresi 404, gizli ürünün sayfası bağlantıyla açılır", async ({ page }) => {
  expect((await page.goto(h.taslakAdresi))?.status()).toBe(404);
  expect((await page.goto(h.gizliAdresi))?.status()).toBe(200);
  // Gizli ürün yalnız bağlantıyla açılır: arama motorlarına kapalı. Yayındaki ürün açık, kanonik adresi seçimsiz.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto(`${h.adres}?secenek-renk=koyu`);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`${h.adres}$`),
  );
});
