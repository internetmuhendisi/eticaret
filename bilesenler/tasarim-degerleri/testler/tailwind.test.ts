// Tailwind yalnız tasarım değerlerindeki adları tanır (kart 0102, karar 0076). Gerçek stil girişleri
// Tailwind'in kendi derleyicisiyle derlenir: hazır palet, hazır ölçü ve tanımsız ad hiçbir şey üretmez,
// her tasarım değerinin sınıfı vardır, tema değerlerinin değişkenleri sayfaya yazılan CSS'te tanımlıdır.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { compile } from "@tailwindcss/node";
import { describe, expect, it } from "vitest";
import { temaDegerleriCss } from "../css.ts";
import {
  bagliRenkAdlari,
  golgeAdlari,
  kalinlikAdlari,
  koseAdlari,
  renkAdlari,
  sabitDegerler,
  temaBoslukAdlari,
  varsayilanTemaDegerleri,
  yaziBoyuAdlari,
  yaziTipiAdlari,
  yuklenenYaziTipleri,
} from "../degerler.ts";
import tailwindAyari from "../tailwind.ayar.ts";

const kok = join(import.meta.dirname, "../../..");

const derleyici = async (giris: string) => {
  const yol = join(kok, giris);
  const sonuc = await compile(readFileSync(yol, "utf8"), {
    base: dirname(yol),
    from: yol,
    onDependency: () => {},
  });
  // Derleyici verilen sınıfları biriktirir: çıktı önceki çağrıların kurallarını da taşır. Bu yüzden
  // bir sınıfın kural üretip üretmediğine çıktıda kendi seçicisinin olup olmadığıyla bakılır.
  return (siniflar: string[]) => sonuc.build(siniflar);
};

const uygulama = await derleyici("cekirdek/uygulama/stil.css");
const sahipPaneli = await derleyici("sahip-paneli/stil.css");

// Sınıfın seçicisi Tailwind'in kaçışıyla yazılır (tablet:p-4 → .tablet\:p-4, @kart:p-4 → .\@kart\:p-4) ve tam
// adla biter: .text-tehlike-yaz, .text-tehlike-yazi'nin başı olduğu için bulunmuş sayılmaz.
const sinifKurali = (cikti: string, sinif: string) => {
  const secici = `.${sinif.replaceAll(/[:.[\]()/@]/g, (k) => `\\${k}`)}`;
  const kalip = secici.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${kalip}(?![a-z0-9_\\\\-])`).test(cikti);
};
const uretir = (derle: (siniflar: string[]) => string, sinif: string) =>
  sinifKurali(derle([sinif]), sinif);

describe("Tailwind yalnız tasarım değerlerini tanır", () => {
  it.each([
    ["hazır palet", ["bg-red-500", "text-white", "bg-black", "border-gray-200", "text-blue-600"]],
    ["ölçekte olmayan boşluk", ["p-37", "m-7", "gap-9", "w-13"]],
    ["hazır yazı boyu", ["text-sm", "text-lg", "text-2xl"]],
    ["hazır köşe ve gölge", ["rounded-lg", "rounded-md", "shadow-md", "shadow-lg"]],
    ["hazır yazı tipi ve kalınlık", ["font-sans", "font-mono", "font-bold", "font-semibold"]],
    ["hazır kırılma noktası", ["sm:p-4", "md:p-4", "lg:p-4"]],
    ["hazır genişlik", ["max-w-md", "max-w-7xl"]],
    ["tanımsız ad", ["bg-kirmizi", "text-baslik-9", "rounded-buyuk"]],
  ])("%s hiçbir şey üretmez", (_ad, siniflar) => {
    for (const derle of [uygulama, sahipPaneli]) {
      for (const sinif of siniflar) expect(uretir(derle, sinif), sinif).toBe(false);
    }
  });

  it("Tailwind'in kendi teması yüklenmez: hazır değişken yoktur", () => {
    const tamami = uygulama(["p-4", "bg-zemin"]);
    expect(tamami).not.toMatch(/--color-|--spacing:|--text-|--font-sans|--breakpoint-/);
  });

  it("her tasarım değerinin sınıfı vardır", () => {
    const beklenen = [
      ...renkAdlari.flatMap((ad) => [`bg-${ad}`, `text-${ad}`, `border-${ad}`]),
      ...golgeAdlari.map((ad) => `shadow-${ad}`),
      ...yaziTipiAdlari.map((ad) => `font-${ad}`),
      ...kalinlikAdlari.map((ad) => `font-${ad}`),
      ...yaziBoyuAdlari.map((ad) => `text-${ad}`),
      ...koseAdlari.map((ad) => `rounded-${ad}`),
      ...Object.keys(sabitDegerler.bosluklar).map((ad) => `p-${ad}`),
      ...Object.keys(sabitDegerler.genislikler).map((ad) => `max-w-${ad}`),
      ...Object.keys(sabitDegerler.katmanlar).map((ad) => `z-${ad}`),
      ...Object.keys(sabitDegerler.kirilmaNoktalari).map((ad) => `${ad}:p-4`),
      // Kart 0193: kapsayıcı genişlikleri.
      "@container",
      ...Object.keys(sabitDegerler.kapsayicilar).flatMap((ad) => [`@${ad}:p-4`, `@max-${ad}:p-4`]),
      // Kart 0124: bağlı renkler, tema boşlukları, ürün sütunu ve başlık biçimi.
      ...bagliRenkAdlari.flatMap((ad) => [`bg-${ad}`, `text-${ad}`, `border-${ad}`]),
      ...temaBoslukAdlari.flatMap((ad) => [`p-${ad}`, `gap-${ad}`]),
      "grid-cols-urun",
      "basis-urun",
      "baslik-bicimi",
    ];
    for (const derle of [uygulama, sahipPaneli]) {
      for (const sinif of beklenen) expect(uretir(derle, sinif), sinif).toBe(true);
    }
  });

  // Aynı önekle yazılan iki türün adı çakışırsa sınıf yalnız birini yazar: text-afis renk mi yazı boyu mu?
  it("aynı önekli değer türlerinin adları çakışmaz", () => {
    const ortak = (a: readonly string[], b: readonly string[]) => a.filter((ad) => b.includes(ad));
    expect(ortak(renkAdlari, yaziBoyuAdlari)).toEqual([]);
    expect(ortak(yaziTipiAdlari, kalinlikAdlari)).toEqual([]);
    expect(ortak(renkAdlari, golgeAdlari)).toEqual([]);
  });

  it.each<[string, (ad: string) => string, readonly string[], RegExp]>([
    ["renk", (ad) => `text-${ad}`, renkAdlari, /^color: var\(--renk-/],
    ["yazı boyu", (ad) => `text-${ad}`, yaziBoyuAdlari, /^font-size: var\(--yazi-boyu-/],
    ["yazı tipi", (ad) => `font-${ad}`, yaziTipiAdlari, /^font-family: var\(--yazi-tipi-/],
    ["kalınlık", (ad) => `font-${ad}`, kalinlikAdlari, /font-weight: var\(--kalinlik-/],
    ["gölge", (ad) => `shadow-${ad}`, golgeAdlari, /--tw-shadow: var\(--golge-/],
    ["köşe", (ad) => `rounded-${ad}`, koseAdlari, /^border-radius: var\(--kose-/],
  ])("her %s sınıfı kendi değişkenini yazar", (_tur, sinif, adlar, kalip) => {
    for (const ad of adlar) {
      const secici = sinif(ad);
      const kural = uygulama([secici]).match(new RegExp(`\\.${secici}\\s*\\{\\s*([^}]*)\\}`))?.[1];
      expect(kural, secici).toMatch(kalip);
    }
  });

  it("seçici denetimi yanılmaz: tanımlı sınıf bulunur, tanımsızı bulunmaz", () => {
    expect(uretir(uygulama, "tablet:p-4")).toBe(true);
    expect(uretir(uygulama, "text-tehlike-yazi")).toBe(true);
    expect(uretir(uygulama, "text-tehlike-yaz")).toBe(false);
  });

  it("kırılma noktaları tasarım değerlerindeki genişlikten başlar", () => {
    for (const [ad, genislik] of Object.entries(sabitDegerler.kirilmaNoktalari)) {
      expect(uygulama([`${ad}:p-4`])).toContain(`(width >= ${genislik})`);
    }
  });

  it("kapsayıcı sorguları tasarım değerlerindeki genişlikten başlar (kart 0193)", () => {
    for (const [ad, genislik] of Object.entries(sabitDegerler.kapsayicilar)) {
      expect(uygulama([`@${ad}:p-4`])).toContain(`(width >= ${genislik})`);
      expect(uygulama([`@max-${ad}:p-4`])).toContain(`(width < ${genislik})`);
    }
  });

  it("sınıfların okuduğu her değişken sayfaya yazılan CSS'te tanımlıdır", () => {
    const siniflar = [
      ...renkAdlari.map((ad) => `bg-${ad}`),
      ...golgeAdlari.map((ad) => `shadow-${ad}`),
      ...yaziTipiAdlari.map((ad) => `font-${ad}`),
      ...kalinlikAdlari.map((ad) => `font-${ad}`),
      ...yaziBoyuAdlari.map((ad) => `text-${ad}`),
      ...koseAdlari.map((ad) => `rounded-${ad}`),
      ...bagliRenkAdlari.map((ad) => `bg-${ad}`),
      ...temaBoslukAdlari.map((ad) => `p-${ad}`),
      "grid-cols-urun",
      "basis-urun",
      "baslik-bicimi",
    ];
    const okunan = new Set(
      [...uygulama(siniflar).matchAll(/var\((--[a-z0-9-]+)\)/g)]
        .map((e) => e[1])
        // Tailwind'in kendi (--tw-) ve Radix'in açılır parçalara verdiği (--radix-) değişkenler
        // tema değeri değildir.
        .filter((ad) => ad !== undefined && !/^--(?:tw|radix)-/.test(ad)),
    );
    const tanimli = new Set(
      [...temaDegerleriCss(varsayilanTemaDegerleri).matchAll(/(--[a-z0-9-]+):/g)].map((e) => e[1]),
    );
    expect(okunan.size).toBeGreaterThan(renkAdlari.length);
    for (const ad of okunan) expect(tanimli.has(ad), ad).toBe(true);
  });

  // Kart 0124: temanın başlık biçimi "font-baslik" sınıflı her yazıya ve sınıfsız başlıklara temel katmanda
  // uygulanır; bir öğenin kendi sınıfı (normal-case) onu geçer.
  it("başlık biçimi font-baslik'e ve başlıklara temel katmanda bağlıdır", () => {
    const cikti = uygulama([]);
    // Kuralın bulunduğu katman: kuraldan önceki en yakın "@layer" bloğu.
    const katmani = (kalip: RegExp) => {
      const bulunan = kalip.exec(cikti);
      if (bulunan === null) return null;
      const oncesi = [...cikti.slice(0, bulunan.index).matchAll(/@layer ([a-z]+) \{/g)];
      return oncesi.at(-1)?.[1] ?? null;
    };
    expect(
      katmani(
        /\.font-baslik\s*\{[^}]*text-transform:\s*var\(--baslik-donusumu\);[^}]*letter-spacing:\s*var\(--baslik-harf-araligi\)/,
      ),
    ).toBe("base");
    expect(katmani(/h4\s*\{[^}]*text-transform:\s*var\(--baslik-donusumu\)[^}]*\}/)).toBe("base");
    expect(uygulama(["grid-cols-urun"])).toContain("repeat(var(--urun-sutunu), minmax(0, 1fr))");
  });

  // Tailwind 4 ayar dosyasındaki keyframes alanını CSS'e yazmaz (ölçüldü): hareket tanımı olmayan
  // animasyon hiç oynamaz, Radix kapanış animasyonunun bitmesini beklediği için pencere ve menü de
  // kapanmaz. Her animasyonun hareketi CSS'te tanımlıdır.
  it("her animasyonun hareket tanımı derlenmiş CSS'te vardır", () => {
    const adlar = Object.keys(tailwindAyari.theme.animation);
    expect(adlar.length).toBeGreaterThan(10);
    const cikti = uygulama(adlar.map((ad) => `animate-${ad}`));
    for (const ad of adlar) {
      expect(cikti, ad).toMatch(new RegExp(`\\.animate-${ad} \\{\\s*animation: ${ad} `));
      expect(cikti, ad).toContain(`@keyframes ${ad} {`);
    }
  });

  // Parçaların, formun, katalogun ve sayfa düzenlerinin kaynağındaki her sınıf bir kural üretir: yazım hatalı ya da
  // tanımsız bir sınıf sessizce hiçbir şey çizmeden kalamaz. Sınıflar kaynaktaki metinlerden toplanır;
  // içe aktarma satırları ve data-slot adları sınıf değildir, atlanır. Sınıf gibi görünen her sözcük
  // (bilinen bir önekle başlayan) denetlenir.
  it("parçaların, formun ve sayfa düzenlerinin kaynağındaki her sınıf bir kural üretir", () => {
    const dosyalar = [
      ...["bilesenler/parcalar", "bilesenler/form", "bilesenler/ikonlar"].flatMap((klasor) =>
        readdirSync(join(kok, klasor))
          // sinif.ts tailwind-merge'in ayarıdır, sınıf değil grup adları taşır.
          .filter((ad) => /\.tsx?$/.test(ad) && ad !== "sinif.ts")
          .map((ad) => join(kok, klasor, ad)),
      ),
      // Bileşen kataloğu (kart 0104): sayfası ve örnekleri. ornekler.tsx sınıf taşımaz, anahtarları
      // parça kodlarıdır ("secim-kutusu" sınıfa benzer).
      ...["cekirdek/katalog", "cekirdek/katalog/ornekler"].flatMap((klasor) =>
        readdirSync(join(kok, klasor))
          .filter((ad) => ad.endsWith(".tsx") && ad !== "ornekler.tsx")
          .map((ad) => join(kok, klasor, ad)),
      ),
      join(kok, "cekirdek/vitrin/stil.ts"),
      join(kok, "cekirdek/yonetim-paneli/stil.ts"),
      // Panelin çerçevesi, menüsü ve sayfa iskeleti (kart 0141); alt klasörlerdeki ekranlar da (kart 0143:
      // vitrin bölümleri ve menüler ekranı, bağımsız kontrolün bulgusu).
      ...readdirSync(join(kok, "cekirdek/yonetim-paneli"), { recursive: true, encoding: "utf8" })
        .filter((ad) => ad.endsWith(".tsx") && !ad.includes("testler"))
        .map((ad) => join(kok, "cekirdek/yonetim-paneli", ad)),
      // Vitrin bölümlerinin görünüşleri ve ortak parçaları, bölümlerin görseli (kart 0110).
      ...readdirSync(join(kok, "cekirdek/vitrin/bolumler"), { recursive: true, encoding: "utf8" })
        .filter((ad) => /\.tsx?$/.test(ad) && !ad.endsWith("tarif.ts"))
        .map((ad) => join(kok, "cekirdek/vitrin/bolumler", ad)),
      join(kok, "cekirdek/vitrin/bolum-kutuphanesi/gorsel.tsx"),
      // Ortak yıldızlar ve bülten formu (kart 0112).
      join(kok, "cekirdek/vitrin/yildizlar.tsx"),
      join(kok, "cekirdek/vitrin/bulten-formu.tsx"),
      // Kategori, marka, etiket ve ürün sayfasının iskeleti (kart 0135).
      join(kok, "cekirdek/vitrin/kayit-sayfasi.tsx"),
      // Filtreli ürün listesi (kart 0136).
      join(kok, "cekirdek/vitrin/urun-listesi/sayfa.tsx"),
      join(kok, "cekirdek/vitrin/urun-listesi/filtreler.tsx"),
      // "Bulunamadı" ve hata sayfası (kart 0120).
      join(kok, "cekirdek/vitrin/durum-sayfasi.tsx"),
      join(kok, "cekirdek/vitrin/bulunamadi-sayfasi.tsx"),
      join(kok, "cekirdek/vitrin/arama-kutusu.tsx"),
      join(kok, "cekirdek/vitrin/urun-listesi/arama-sayfasi.tsx"),
      join(kok, "cekirdek/vitrin/hata-sayfasi.tsx"),
      // Favori düğmesi ve favoriler sayfası (kart 0140).
      join(kok, "cekirdek/vitrin/favori-dugmesi.tsx"),
      join(kok, "cekirdek/vitrin/favori-listesi.tsx"),
      join(kok, "cekirdek/vitrin/favoriler-sayfasi.tsx"),
      // Ürün sayfası (kart 0138).
      ...readdirSync(join(kok, "cekirdek/vitrin/urun-sayfasi"))
        .filter((ad) => ad.endsWith(".tsx"))
        .map((ad) => join(kok, "cekirdek/vitrin/urun-sayfasi", ad)),
      // Ürün kartı ve fiyat bileşeni (kart 0109).
      ...readdirSync(join(kok, "cekirdek/vitrin/urun-karti"))
        .filter((ad) => ad.endsWith(".tsx"))
        .map((ad) => join(kok, "cekirdek/vitrin/urun-karti", ad)),
      // Sepet, sepet penceresi ve sepete ekle (kart 0212).
      ...readdirSync(join(kok, "cekirdek/vitrin/sepet"))
        .filter((ad) => ad.endsWith(".tsx"))
        .map((ad) => join(kok, "cekirdek/vitrin/sepet", ad)),
      // Ödeme adımı ve sade çerçevesi (kart 0213).
      ...readdirSync(join(kok, "cekirdek/vitrin/odeme"))
        .filter((ad) => ad.endsWith(".tsx"))
        .map((ad) => join(kok, "cekirdek/vitrin/odeme", ad)),
      // Hesabım, giriş ve kayıt düzeni (kart 0237).
      ...readdirSync(join(kok, "cekirdek/vitrin/hesap"))
        .filter((ad) => ad.endsWith(".tsx"))
        .map((ad) => join(kok, "cekirdek/vitrin/hesap", ad)),
      join(kok, "cekirdek/vitrin/giris-formu.tsx"),
      join(kok, "cekirdek/vitrin/kayit-formu.tsx"),
      // Sipariş alındı, havale bildirimi, sipariş ayrıntısı ve takibi (kartlar 0214, 0238).
      ...readdirSync(join(kok, "cekirdek/vitrin/siparis"))
        .filter((ad) => ad.endsWith(".tsx"))
        .map((ad) => join(kok, "cekirdek/vitrin/siparis", ad)),
    ];
    const onek =
      /^(?:[a-z-]+:)*-?(?:flex|grid|inline|block|hidden|items|justify|self|place|gap|p[xytrbl]?|m[xytrbl]?|w|h|size|min|max|inset|top|right|bottom|left|fixed|absolute|relative|sticky|bg|text|border|rounded|shadow|font|z|overflow|outline|cursor|select|pointer|animate|transition|duration|opacity|translate|rotate|scale|sr|underline|no-underline|shrink|grow|basis|whitespace|truncate|list|accent|invisible|visible|last|first|fill|secim|menu|wrap|col|row|order|leading|tracking|aspect|group|line|object)(?:-|$)/;
    const tekSozcukSiniflar = new Set([
      "flex",
      "grid",
      "inline",
      "block",
      "hidden",
      "fixed",
      "absolute",
      "relative",
      "sticky",
      "border",
      "rounded",
      "underline",
      "invisible",
      "visible",
      "truncate",
      "shrink",
      "grow",
    ]);
    const siniflar = new Set<string>();
    for (const dosya of dosyalar) {
      const kaynak = readFileSync(dosya, "utf8")
        .replaceAll(/^import[^;]*;$/gms, "")
        .replaceAll(/(?:data-slot|position|side|taraf)="[^"]*"/g, "");
      for (const [, metin] of kaynak.matchAll(/"([^"\\\n]*)"/g)) {
        for (const sozcuk of (metin ?? "").split(/\s+/)) {
          // Tire ya da durum taşımayan tek sözcük ("top", "select") ancak tek başına bir sınıfsa sayılır.
          // "group" yalnız işarettir, kendisi kural üretmez.
          const tekSozcuk = !/[-:]/.test(sozcuk);
          if (sozcuk === "group" || (tekSozcuk && !tekSozcukSiniflar.has(sozcuk))) continue;
          if (onek.test(sozcuk)) siniflar.add(sozcuk);
        }
      }
    }
    expect(siniflar.size).toBeGreaterThan(150);
    const uretmeyenler = [...siniflar].filter((s) => !uretir(uygulama, s));
    expect(uretmeyenler).toEqual([]);
  });
});

// Temaların kullanabileceği yazı tipleri (kart 0105): kayıttaki her yazı tipinin paketi stil girişinde
// yüklenir ve stil girişinde kayıtta olmayan yazı tipi paketi yoktur.
describe("yüklenen yazı tipleri", () => {
  it("kayıt ile tailwind.css'teki yazı tipi paketleri aynıdır", () => {
    const giris = readFileSync(join(kok, "bilesenler/tasarim-degerleri/tailwind.css"), "utf8");
    const paketler = [...giris.matchAll(/@import\s+"(@fontsource[^"]*)"/g)].map((e) => e[1]).sort();
    expect(paketler).toEqual(Object.values(yuklenenYaziTipleri).sort());
  });
});
