// Çekirdekte bir sitenin vergi değeri geçmez (kart 0074, karar 0060, .claude/rules/e-ticaret-is-kurallari.md:
// "çekirdekte KDV, bir oran ya da bir ülke sabit yazılmaz"). Vergi adı, sınıf ve oran adları ile oranlar
// sitenin başlangıç verisindedir (baslangic/ayarlar.json, baslangic/vergi.json). Aranacak değerler
// bütün sitelerin dosyalarından okunur: yeni bir sitenin vergi adı da kendiliğinden aranır.
//
// - Adlar (örneğin vergi adı ya da "%..." sınıf adı) çekirdekte ve bileşenlerde, kodda, metin
//   dosyalarında, veritabanı değişikliklerinde ve testlerde, büyük-küçük harf ayırmadan ve tek sözcük
//   olarak aranır. Bitişik yazılmış ad da sözcüktür: "vergiOrani" içinde "vergi" ve "Orani" aranır.
// - Aranan adlar sitelerden geldiği için bir site sınıfına sıradan bir sözcük ("Genel" gibi) ad verirse
//   bu test çekirdekteki o sözcüğe kırmızı verir. Öyleyse sınıfın adı değiştirilir ya da bu test,
//   gerekçesi yazılarak, yalnız vergi adını ve "%" ile başlayan adları arayacak biçimde daraltılır.
// - Sıfır olmayan her oran yüzde yazılışıyla ("%N" ve "N%", arada boşluksuz) aynı yerlerde aranır.
//   Boşluklu yazılış ("% N") kalan bölme işlemiyle karışacağı için aranmaz: yalnız disiplindir.
// - Vergi modülünde ayrıca oranın milyonda bir ve kesir yazılışı sayı olarak aranır. Tam yüzde sayı
//   (yalnız rakam) genel sayılarla karıştığı için aranmaz: yalnız disiplindir.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { oranYuzdesi, tamOran, vergiBaslangicSemasi } from "../moduller/vergi/semalar.ts";

const kok = join(import.meta.dirname, "..", "..");
const atlananlar = new Set(["node_modules", ".next", "test-results"]);

const dosyalar = (klasor: string, uzantilar: RegExp): string[] =>
  existsSync(klasor)
    ? readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
        if (atlananlar.has(girdi.name)) return [];
        const yol = join(klasor, girdi.name);
        if (girdi.isDirectory()) return dosyalar(yol, uzantilar);
        return uzantilar.test(girdi.name) ? [yol] : [];
      })
    : [];

const jsonVarsa = (yol: string): unknown =>
  existsSync(yol) ? JSON.parse(readFileSync(yol, "utf8")) : undefined;

// Bütün sitelerin vergi değerleri.
const siteler = join(kok, "siteler");
const siteVerileri = readdirSync(siteler, { withFileTypes: true })
  .filter((girdi) => girdi.isDirectory())
  .map((girdi) => {
    const ayarlar = jsonVarsa(join(siteler, girdi.name, "baslangic", "ayarlar.json")) as
      | { vergiAdi?: string }
      | undefined;
    const vergi = vergiBaslangicSemasi.parse(
      jsonVarsa(join(siteler, girdi.name, "baslangic", "vergi.json")) ?? { siniflar: [] },
    );
    return { vergiAdi: ayarlar?.vergiAdi, vergi };
  });

const adlar = [
  ...new Set(
    siteVerileri.flatMap(({ vergiAdi, vergi }) => [
      ...(vergiAdi === undefined ? [] : [vergiAdi]),
      ...vergi.siniflar.flatMap((sinif) => [
        sinif.ad,
        ...sinif.oranlar.flatMap((oran) => (oran.ad === undefined ? [] : [oran.ad])),
      ]),
    ]),
  ),
];
const oranlar = [
  ...new Set(
    siteVerileri.flatMap(({ vergi }) =>
      vergi.siniflar.flatMap((sinif) => sinif.oranlar.map((oran) => oran.oran)),
    ),
  ),
].filter((oran) => oran > 0);

const kacir = (metin: string) => metin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Tek sözcük: önünde ve arkasında harf ya da rakam olmaz.
// "$" de sözcüğün parçası sayılır: "%1$s" gibi yer tutucu ad değildir.
const sozcuk = (metin: string) => `(?<![\\p{L}\\p{N}])${kacir(metin)}(?![\\p{L}\\p{N}$])`;
// Yüzde yazılışı, ondalık ayırıcı nokta ya da virgül: "%7.5", "%7,5", "7.5%".
const yuzdeler = (oran: number) => {
  const yuzde = oranYuzdesi(oran);
  return [yuzde, yuzde.replace(".", ",")].flatMap((yazilis) => [
    // "%1$s" gibi yer tutucu oran değildir.
    `%${kacir(yazilis)}(?![\\p{L}\\p{N}.,$])`,
    `(?<![\\p{L}\\p{N}.,:])${kacir(yazilis)}%`,
  ]);
};
const adKalibi = new RegExp([...adlar.map(sozcuk), ...oranlar.flatMap(yuzdeler)].join("|"), "iu");
// Bitişik yazılmış adı sözcüklerine ayırır: "kdvOrani" → "kdv Orani".
const ayrilmis = (satir: string) => satir.replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2");
const adGeciyor = (satir: string) => adKalibi.test(satir) || adKalibi.test(ayrilmis(satir));

// Vergi modülündeki sayılar: alt çizgisiz değeri milyonda bir ya da kesir yazılışıyla bir oran olan.
const sayiKalibi = /(?<![\w.])\d[\d_]*(?:\.\d+)?(?![\w.])/g;
const oranSayilari = new Set(oranlar.flatMap((oran) => [oran, oran / tamOran]));

// Bilinen ve gerekçesi yazılı geçişler: dosya ve satırın içindeki parça. Yeni geçiş buraya ancak
// gerekçesiyle girer.
const bilinenler = [
  // Adres içinde boşluğun kodlanışı (otpauth adresi), oran değil.
  { dosya: "cekirdek/moduller/oturum/iki-asama.ts", parca: 'replaceAll("+", "%20")' },
];
const biliniyor = (dosya: string, satir: string) =>
  bilinenler.some((bilinen) => bilinen.dosya === dosya && satir.includes(bilinen.parca));

type Metin = { ad: string; icerik: string };

const adGecenler = (metinler: Metin[]): string[] =>
  metinler.flatMap(({ ad, icerik }) =>
    icerik
      .split("\n")
      .filter((satir) => adGeciyor(satir) && !biliniyor(ad, satir))
      .map((satir) => `${ad}: ${satir.trim()}`),
  );

const sayiGecenler = (metinler: Metin[]): string[] =>
  metinler.flatMap(({ ad, icerik }) =>
    [...icerik.matchAll(sayiKalibi)]
      .filter(([sayi]) => oranSayilari.has(Number(sayi.replaceAll("_", ""))))
      .map(([sayi]) => `${ad}: ${sayi}`),
  );

const oku = (yollar: string[]): Metin[] =>
  yollar.map((yol) => ({ ad: relative(kok, yol), icerik: readFileSync(yol, "utf8") }));

describe("çekirdekte sitenin vergi değeri", () => {
  it("aranacak değerler dolu: en az bir sitenin vergi adı, sınıfları ve oranları var", () => {
    expect(adlar.length).toBeGreaterThan(1);
    expect(oranlar.length).toBeGreaterThan(0);
  });

  it("çekirdekte ve bileşenlerde vergi adı, sınıf adı ya da yüzde yazılışıyla oran geçmez", () => {
    const taranan = oku(
      ["cekirdek", "bilesenler"].flatMap((klasor) =>
        dosyalar(join(kok, klasor), /\.(ts|tsx|mts|cts|js|mjs|cjs|json|sql|css)$/),
      ),
    );
    expect(taranan.length).toBeGreaterThan(50);
    // Veritabanı değişiklikleri de taranır: bütün sitelerin oranını değiştiren veri değişikliği oranı
    // yazamaz.
    expect(taranan.some(({ ad }) => ad.endsWith(".sql"))).toBe(true);
    // Bu dosya kuralı ve bilinen geçişi alıntılar, aranan değerleri yalnız sitelerden okur.
    const buDosya = relative(kok, import.meta.filename);
    expect(adGecenler(taranan.filter(({ ad }) => ad !== buDosya))).toEqual([]);
  });

  it("vergi modülünde oran sayı olarak geçmez", () => {
    const taranan = oku(dosyalar(join(kok, "cekirdek", "moduller", "vergi"), /\.(ts|tsx)$/));
    expect(taranan.length).toBeGreaterThan(3);
    expect(sayiGecenler(taranan)).toEqual([]);
  });

  it("kontrol bozuk örnekleri yakalar, başka sözcüğün içindeki adı ve kalan işlemini yakalamaz", () => {
    const [ad = ""] = adlar;
    const [oran = 0] = oranlar;
    const yuzde = oranYuzdesi(oran);
    const ornekler = [
      { ad: "ad.ts", icerik: `const vergiAdi = "${ad}";` },
      { ad: "kucuk.ts", icerik: `const vergiAdi = '${ad.toLowerCase()}';` },
      { ad: "yorum.ts", icerik: `// ${ad} dahil fiyat` },
      { ad: "metin.json", icerik: `{ "fiyat": "${ad} dahil" }` },
      { ad: "bitisik.ts", icerik: `const ${ad.toLowerCase()}Orani = 1;` },
      { ad: "alt-cizgi.ts", icerik: `const ${ad.toUpperCase()}_ORANI = 1;` },
      { ad: "degisiklik.sql", icerik: `UPDATE vergi_oranlari SET ad = '${ad}';` },
      { ad: "yuzde.ts", icerik: `const sinif = "%${yuzde}";` },
      { ad: "sonda.ts", icerik: `const metin = "${yuzde}% indirim";` },
      { ad: "sozcuk-icinde.ts", icerik: `const x = "on${ad}son";` },
      { ad: "kalan.ts", icerik: `const x = toplam % ${yuzde} === 0;` },
      { ad: "yer-tutucu.ts", icerik: `const x = "%${yuzde}$s";` },
      { ad: "uzun-sayi.ts", icerik: `const x = "%${yuzde}5";` },
      { ad: "kodlama.ts", icerik: `const x = "%${yuzde}F";` },
      { ad: "ipv6.ts", icerik: `const x = "fe80::${yuzde}%eth0";` },
    ];
    expect(adGecenler(ornekler).map((satir) => satir.split(":")[0])).toEqual([
      "ad.ts",
      "kucuk.ts",
      "yorum.ts",
      "metin.json",
      "bitisik.ts",
      "alt-cizgi.ts",
      "degisiklik.sql",
      "yuzde.ts",
      "sonda.ts",
    ]);

    const sayilar = [
      { ad: "milyonda.ts", icerik: `const oran = ${oran};` },
      {
        ad: "alt-cizgili.ts",
        icerik: `const oran = ${String(oran).replace(/\B(?=(\d{3})+$)/g, "_")};`,
      },
      { ad: "kesir.ts", icerik: `const oran = ${oran / tamOran};` },
      { ad: "baska.ts", icerik: `const oran = ${oran + 1}; const ad = "x${oran}";` },
    ];
    expect(sayiGecenler(sayilar).map((satir) => satir.split(":")[0])).toEqual([
      "milyonda.ts",
      "alt-cizgili.ts",
      "kesir.ts",
    ]);
  });
});
