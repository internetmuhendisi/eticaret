// Tarayıcı testlerinin erişilebilirlik taraması (kart 0288). Bütün testler bu yardımcıyla tarar; `@axe-core/playwright`
// başka dosyada içe aktarılmaz (denetim/kurallar/elle-tarama.grit). Kurallar WCAG 2.2 AA etiketleridir, gevşetilmez.
//
// Taramadan önce sırayla:
// - Bildirimlerin süresi durdurulur (kart 0220, bildirim-suresi.ts): süre tarama sürerken dolarsa kapanma geçişindeki
//   yarı saydam yazı kontrastı düşürür. Yan etkisi: ekranda bildirim varsa fare onun üstüne gider ve orada kalır;
//   bildirim taramadan sonra da kendiliğinden kapanmaz, üst üste duranlar açılmış görünür, fareyle açılmış ipucu ya da
//   menü kapanabilir. Taramadan sonra bildirimin kapanmasını bekleyen test fareyi bildirimden uzaklaştırır.
// - Sonlu animasyon ve geçişlerin bitmesi beklenir (kart 0136): geçişin ortasındaki ara renkler kontrastı düşürür.
//   Sonsuz animasyonlar (yükleniyor göstergesi) beklenmez.
// - Sayfanın başlığının dolması beklenir (kart 0287): geliştirme sunucusunda bir yenilemeden sonra Next.js sayfa
//   bilgisini baştan kurar, `<title>` ~300 ms yok kalabilir ve tarama "document-title" bulur. Canlı derlemede ölçülmedi.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { bildirimSuresiniDurdur } from "./bildirim-suresi";

const etiketler = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Geliştirme sunucusunun kendi araç düğmesi (gölge DOM) taranmaz: uygulamanın parçası değildir.
const gelistirmeAraci = "nextjs-portal";

export type TaramaSecenekleri = {
  // Taramanın dışında bırakılan seçiciler. Bilerek taranmayan bir yeri kendi testinde gerekçesiyle yazın.
  readonly haric?: readonly string[];
  // Verilirse yalnız bu seçiciler taranır (ör. üst kısım ve açık menü).
  readonly yalniz?: readonly string[];
};

export type Ihlal = { kural: string; ogeler: string[] };

// Sayfanın sonlu animasyon ve geçişlerinin bitmesini bekler.
export const hareketlerBitsin = (page: Page): Promise<unknown> =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) =>
          Number.isFinite(a.effect?.getComputedTiming().endTime ?? Number.POSITIVE_INFINITY),
        )
        // Kapanırken iptal edilen animasyonun sözü hatayla biter; o da bitmiş sayılır.
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );

// Taramadan önceki beklemeler ve tarama; bulunan ihlalleri döner.
export const ihlalleriBul = async (
  page: Page,
  secenekler: TaramaSecenekleri = {},
): Promise<Ihlal[]> => {
  await bildirimSuresiniDurdur(page);
  await hareketlerBitsin(page);
  await expect(page, "taramadan önce sayfanın başlığı dolu").toHaveTitle(/\S/);
  let tarayici = new AxeBuilder({ page }).withTags(etiketler);
  for (const secici of secenekler.yalniz ?? []) tarayici = tarayici.include(secici);
  for (const secici of [gelistirmeAraci, ...(secenekler.haric ?? [])]) {
    tarayici = tarayici.exclude(secici);
  }
  const sonuc = await tarayici.analyze();
  return sonuc.violations.map((ihlal) => ({
    kural: ihlal.id,
    ogeler: ihlal.nodes.map((oge) => oge.target.join(" ")),
  }));
};

// Sayfayı tarar; ihlal varsa `ne` adıyla düşer.
export const tara = async (
  page: Page,
  ne: string,
  secenekler: TaramaSecenekleri = {},
): Promise<void> => {
  expect(await ihlalleriBul(page, secenekler), ne).toEqual([]);
};
