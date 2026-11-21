// Ürün ekranının seçenekler bölümü gerçek tarayıcıda ve gerçek veritabanıyla (kart 0264, karar 0163): mağaza sahibi
// fiyatı ve stoğu olan basit ürüne klavyeyle iki seçenek ekler (Beden: S, M; Renk: Gri, Lacivert); birleşim tablosu
// dört satırdır, ilk satır basit ürünün stok kodunu gösterir. Bir birleşimin stok kodunu yazar, birinin görselini
// galeriden pencerede seçer (pencere kapanınca odak düğmeye döner) ve kaydeder: basit birim ilk birleşim olur (fiyatı ve
// stoğu kalır), öteki üçü açılır. Fiyatları servisle verilen birleşimler vitrinde seçilir, seçilen birleşimin stok kodu
// görünür. Seçeneğin sırası kartın düğmeleriyle değişir, odak düğmede kalır. Aynı değer iki kez yazılınca hata değerin alanında ve odak orada. Kayıtlı değeri kaldırmak onay penceresiyle
// sorulur ve kaç birleşimin silineceğini söyler; Vazgeç hiçbir şeyi değiştirmez, kaldırıp kaydedince birleşimleri
// silinir. Ekran, görsel penceresi ve onay penceresi iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda
// hata yoktur.
//
// Ürünler sitenin paylaşılan verisidir: test kendi ürününü ("Deneme <6 onaltılık> …") açar ve sonunda siler.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { dosyaSil, gorselKaydet } from "../../moduller/dosya/servis";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis";
import { stokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { baglan, type Veritabani, veritabaniAdresi } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { urunEkraniAdresi } from "../../yonetim-paneli/adresler";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
] as const;

test.beforeEach(({ page }) => ayriBaglanti(page));
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

const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.ad}`);
      expect(await yanaKayma(page), `${ne} ${renk} ${boyut.ad}`).toBeLessThanOrEqual(0);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

const gorselUret = async (vt: Veritabani, mavi: number) => {
  const kayit = await gorselKaydet(
    vt,
    await sharp({
      create: { width: 600, height: 600, channels: 3, background: { r: 30, g: 80, b: mavi } },
    })
      .png()
      .toBuffer(),
  );
  if (!kayit.tamam) throw new Error(kayit.hata);
  return kayit.dosya.kimlik;
};

// Hatalı formun yanıtı (doğrulama ya da çakışma) tarayıcının konsoluna yazılır; beklenen hatadır.
const beklenenHata = (ileti: string) =>
  ileti.includes("status of 409") || ileti.includes("status of 400");

const bas = async (page: Page, oge: ReturnType<Page["getByRole"]>) => {
  await oge.focus();
  await page.keyboard.press("Enter");
};

test("mağaza sahibi basit ürüne klavyeyle seçenek ekler, birleşimleri doldurur, vitrinde seçer, değer kaldırır", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const ek = randomBytes(3).toString("hex");
  const servis = calisanSiteninUrunServisi();
  const temizlik: (() => Promise<unknown>)[] = [];
  const konsol = konsoluDinle(page, { haric: beklenenHata });
  try {
    const urun = await servis.urunEkle(vt, yapan, {
      ad: `Deneme ${ek} Sweatshirt`,
      vergiSinifi: null,
      durum: "yayinda",
      stokKodu: `D${ek}-BASIT`,
    });
    temizlik.push(() => servis.urunSil(vt, yapan, urun));
    const basit = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    const fiyat = siteninFiyatServisi(calisanSite());
    await fiyat.fiyatYaz(vt, yapan, basit, { satisFiyati: 64990 });
    await stokServisi().stokDuzelt(vt, yapan, basit, {
      yeniMiktar: 6,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    const dosyalar = [await gorselUret(vt, 200), await gorselUret(vt, 20)];
    for (const dosya of dosyalar) temizlik.push(() => dosyaSil(vt, dosya));
    await servis.galeriyeGorselEkle(vt, yapan, urun, {
      dosya: dosyalar[0] ?? "",
      alternatifMetin: `Gri sweatshirt ${ek}`,
    });
    const lacivertGorsel = await servis.galeriyeGorselEkle(vt, yapan, urun, {
      dosya: dosyalar[1] ?? "",
      alternatifMetin: `Lacivert sweatshirt ${ek}`,
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());
    await page.goto(urunEkraniAdresi(urun));
    await sayfaHazir(page);
    // Bölüm kendi kimliğiyle ("Bu sayfada" bağlantısı #urun-secenekler).
    const bolum = page.locator("#urun-secenekler");
    await expect(bolum.getByText(metin("yonetim.urunEkrani.secenek.yok"))).toBeVisible();

    // Seçenek ve değerler klavyeyle: "Seçenek ekle" odağı yeni seçeneğin adına, "Değer ekle" yeni değere verir.
    const secenekEkle = async (ad: string, degerler: string[], sira: number) => {
      await bas(
        page,
        bolum.getByRole("button", { name: metin("yonetim.urunEkrani.secenek.ekle") }),
      );
      const adAlani = bolum.getByRole("textbox", {
        name: doldur(metin("yonetim.urunEkrani.secenek.ad"), { sira: String(sira) }),
        exact: true,
      });
      await expect(adAlani).toBeFocused();
      await page.keyboard.type(ad);
      for (const [i, deger] of degerler.entries()) {
        if (i > 0) {
          await bas(
            page,
            bolum.getByRole("button", {
              name: doldur(metin("yonetim.urunEkrani.secenek.degerEkle"), { ad }),
            }),
          );
        } else {
          await bolum
            .getByRole("textbox", {
              name: doldur(metin("yonetim.urunEkrani.secenek.deger"), { secenek: ad, sira: "1" }),
              exact: true,
            })
            .focus();
        }
        const alan = bolum.getByRole("textbox", {
          name: doldur(metin("yonetim.urunEkrani.secenek.deger"), {
            secenek: ad,
            sira: String(i + 1),
          }),
          exact: true,
        });
        await expect(alan).toBeFocused();
        await page.keyboard.type(deger);
      }
    };
    await secenekEkle("Beden", ["S", "M"], 1);
    await secenekEkle("Renk", ["Gri", "Lacivert"], 2);

    // Seçeneğin sırası kartın düğmeleriyle: Beden aşağı inince birleşimler "Gri / S" diye yazılır, odak Beden'in
    // açık kalan düğmesindedir; yukarı alınca eski sıraya döner.
    const tasi = (yon: "yukari" | "asagi") =>
      bolum.getByRole("button", {
        name: doldur(metin(`ortak.parca.siralama.${yon}`), { ad: "Beden" }),
        exact: true,
      });
    await bas(page, tasi("asagi"));
    await expect(tasi("yukari")).toBeFocused();
    await expect(tasi("asagi")).toBeDisabled();
    await expect(
      bolum.getByRole("textbox", {
        name: doldur(metin("yonetim.urunEkrani.secenek.hucre"), {
          alan: metin("yonetim.urunEkrani.stokKodu"),
          birlesim: "Gri / S",
        }),
        exact: true,
      }),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(tasi("asagi")).toBeFocused();

    // Birleşimler: dört satır, ilk satır basit ürünün stok kodunu gösterir (karar 0163).
    const hucre = (alan: string, birlesim: string) =>
      bolum.getByRole("textbox", {
        name: doldur(metin("yonetim.urunEkrani.secenek.hucre"), { alan, birlesim }),
        exact: true,
      });
    const stokKodu = metin("yonetim.urunEkrani.stokKodu");
    await expect(
      bolum.getByRole("heading", {
        name: doldur(metin("yonetim.urunEkrani.secenek.birlesimler"), { sayi: "4" }),
      }),
    ).toBeVisible();
    await expect(hucre(stokKodu, "S / Gri")).toHaveValue(`D${ek}-BASIT`);
    await expect(hucre(stokKodu, "M / Lacivert")).toHaveValue("");
    await hucre(stokKodu, "M / Lacivert").focus();
    await page.keyboard.type(`D${ek}-M-LCV`);

    // Görsel: pencerede galerinin görselleri; seçince kapanır, odak düğmeye döner.
    const gorselDugmesi = bolum.getByRole("button", {
      name: doldur(metin("yonetim.urunEkrani.secenek.gorselSec"), { ad: "S / Lacivert" }),
    });
    await bas(page, gorselDugmesi);
    const pencere = page.getByRole("dialog");
    await expect(pencere).toBeVisible();
    await ikiRenkUcGenislik(page, "görsel penceresi");
    await bas(page, pencere.getByRole("button", { name: `Lacivert sweatshirt ${ek}` }));
    await expect(pencere).toBeHidden();
    const seciliDugme = bolum.getByRole("button", {
      name: doldur(metin("yonetim.urunEkrani.secenek.gorselSecili"), {
        ad: "S / Lacivert",
        gorsel: `Lacivert sweatshirt ${ek}`,
      }),
    });
    await expect(seciliDugme).toBeFocused();
    await ikiRenkUcGenislik(page, "seçenekler bölümü");

    // Kaydet: basit birim ilk birleşim olur, öteki üçü açılır.
    const kaydet = page.getByRole("button", {
      name: metin("yonetim.urunEkrani.kaydet"),
      exact: true,
    });
    await bas(page, kaydet);
    await expect(page.getByText(metin("yonetim.urunEkrani.kaydedildi"))).toBeVisible();
    const okunan = await servis.urunuOku(vt, urun);
    const adlar = new Map(
      (okunan?.secenekler ?? []).flatMap((s) => s.degerler.map((d) => [d.kimlik, d.ad])),
    );
    const canli = (okunan?.birimler ?? []).filter((b) => !b.silindi);
    const adiyla = new Map(canli.map((b) => [b.degerler.map((d) => adlar.get(d)).join("/"), b]));
    expect([...adiyla.keys()]).toEqual(["S/Gri", "S/Lacivert", "M/Gri", "M/Lacivert"]);
    expect(adiyla.get("S/Gri")).toMatchObject({ kimlik: basit, stokKodu: `D${ek}-BASIT` });
    expect(adiyla.get("S/Lacivert")?.gorsel).toBe(lacivertGorsel);
    expect(adiyla.get("M/Lacivert")?.stokKodu).toBe(`D${ek}-M-LCV`);
    expect((await stokServisi().stoklariOku(vt, [basit])).get(basit)?.miktar).toBe(6);

    // Vitrinde: fiyatı verilen birleşim seçilir, stok kodu görünür.
    for (const birim of canli) {
      await fiyat.fiyatYaz(vt, yapan, birim.kimlik, { satisFiyati: 64990 });
    }
    const mLacivert = adiyla.get("M/Lacivert")?.kimlik ?? "";
    await stokServisi().stokDuzelt(vt, yapan, mLacivert, {
      yeniMiktar: 3,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    await page.goto(kayitAdresleri.urun(okunan?.adresAdi ?? ""));
    await sayfaHazir(page);
    for (const deger of ["M", "Lacivert"]) {
      const secenek = page.getByRole("radio", { name: deger, exact: true });
      await secenek.focus();
      await page.keyboard.press("Space");
      await expect(secenek).toBeChecked();
    }
    await expect(
      page.getByText(doldur(metin("vitrin.urunSayfasi.stokKodu"), { kod: `D${ek}-M-LCV` })),
    ).toBeVisible();

    // Aynı değer iki kez: hata değerin alanında, odak orada.
    await page.goto(urunEkraniAdresi(urun));
    await sayfaHazir(page);
    await bas(
      page,
      bolum.getByRole("button", {
        name: doldur(metin("yonetim.urunEkrani.secenek.degerEkle"), { ad: "Beden" }),
      }),
    );
    await page.keyboard.type("m");
    await bas(page, kaydet);
    const tekrar = bolum.getByRole("textbox", {
      name: doldur(metin("yonetim.urunEkrani.secenek.deger"), { secenek: "Beden", sira: "3" }),
      exact: true,
    });
    await expect(tekrar).toBeFocused();
    await expect(tekrar).toHaveAttribute("aria-invalid", "true");
    await expect(bolum.getByText(metin("yonetim.urun.hata.deger-ad-tekrar"))).toBeVisible();
    await tara(page, "hatalı değer");
    await bas(page, page.getByRole("button", { name: metin("ortak.islem.vazgec"), exact: true }));

    // Kayıtlı değeri kaldırmak sorulur: kaç birleşimin silineceği yazar; Vazgeç değiştirmez.
    const kaldir = bolum.getByRole("button", {
      name: doldur(metin("yonetim.urunEkrani.secenek.degerKaldir"), {
        secenek: "Beden",
        deger: "S",
      }),
    });
    await bas(page, kaldir);
    const onay = page.getByRole("alertdialog");
    await expect(onay).toContainText(
      doldur(metin("yonetim.urunEkrani.secenek.cikarOnay.aciklama"), { sayi: "2" }),
    );
    await tara(page, "onay penceresi");
    await bas(page, onay.getByRole("button", { name: metin("ortak.islem.vazgec") }));
    await expect(onay).toBeHidden();
    await expect(kaldir).toBeFocused();
    await bas(page, kaldir);
    await bas(
      page,
      onay.getByRole("button", {
        name: metin("yonetim.urunEkrani.secenek.cikarOnay.degerOnay"),
      }),
    );
    await expect(
      bolum.getByRole("heading", {
        name: doldur(metin("yonetim.urunEkrani.secenek.birlesimler"), { sayi: "2" }),
      }),
    ).toBeVisible();
    await bas(page, kaydet);
    await expect(page.getByText(metin("yonetim.urunEkrani.kaydedildi"))).toBeVisible();
    const sonra = (await servis.urunuOku(vt, urun))?.birimler.filter((b) => !b.silindi) ?? [];
    expect(sonra.map((b) => b.kimlik).toSorted()).toEqual(
      [adiyla.get("M/Gri")?.kimlik, mLacivert].toSorted(),
    );
    expect(konsol).toEqual([]);
  } finally {
    for (const is of temizlik.toReversed()) await is().catch(() => undefined);
  }
});
