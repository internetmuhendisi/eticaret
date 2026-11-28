// Çekirdekte bir sitenin para birimi ve simgesi geçmez (kart 0081, karar 0067,
// .claude/rules/e-ticaret-is-kurallari.md: "Çekirdekte TL ya da ₺ sabit yazılmaz"). Para birimi sitenin
// ayarlar.json dosyasındadır, simge ayardan ya da dil verisinden gelir (cekirdek/metinler/bicimleyici.ts).
//
// - Aranan değerler bütün sitelerin dosyalarından okunur: her sitenin para birimi kodu, ayardaki simgesi
//   ve yoksa dil verisindeki simgesi. Yeni bir sitenin para birimi de kendiliğinden aranır. Yaygın
//   yazılışlar (ekYazilislar) ayrıca aranır. Harf olmayan simgenin kaçışlı yazılışları da aranır.
// - Çekirdekte ve bileşenlerde kod, metin dosyaları, veritabanı değişiklikleri, stil dosyaları ve
//   testler taranır; belgeler (.md) taranmaz. Testler para birimi olarak ISO 4217'nin deneme kodunu
//   (XTS) kullanır.
// - Harfle yazılan değer (kod, "TL") büyük-küçük harf ayrımıyla ve tek sözcük olarak aranır: "try" gibi
//   sözcükler takılmaz. Harf olmayan simge her yerde aranır.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { ayarSemasi } from "../ayar-semasi/ayarlar.ts";
import { paraSimgesi } from "../metinler/bicimleyici.ts";

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

// Dil verisinde olmayan ya da başka yazılan yaygın adlar.
const ekYazilislar = ["TL", "lira", "Lira", "LİRA"];

// Bütün sitelerin para birimi kodları ve simgeleri.
const siteler = join(kok, "siteler");
const siteDegerleri = readdirSync(siteler, { withFileTypes: true })
  .filter((girdi) => girdi.isDirectory())
  .flatMap((girdi) => {
    const ayarlar = ayarSemasi.parse(
      JSON.parse(readFileSync(join(siteler, girdi.name, "ayarlar.json"), "utf8")),
    );
    return [
      ayarlar.paraBirimi,
      ayarlar.paraBicimi.simge ?? paraSimgesi(ayarlar.dil, ayarlar.paraBirimi),
    ];
  });
const aranacaklar = [...new Set([...siteDegerleri, ...ekYazilislar])];

const kacir = (metin: string) => metin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Harf olmayan simgenin kaçışlı yazılışları da aranır: "\\u20BA", "\\u{20BA}", "&#x20BA;", "&#8378;".
const kacisli = (deger: string): string[] =>
  [...deger].flatMap((karakter) => {
    const kod = karakter.codePointAt(0) ?? 0;
    // Onaltılık rakamlar büyük ve küçük harfle; kalıbın geri kalanı harf büyüklüğüne bakar ("try" geçmez).
    const onaltilik = kod
      .toString(16)
      .replace(/[a-f]/g, (harf) => `[${harf}${harf.toUpperCase()}]`);
    return [
      `\\\\u0*${onaltilik}(?![0-9a-fA-F])`,
      `\\\\u\\{0*${onaltilik}\\}`,
      `&#x0*${onaltilik};`,
      `&#0*${kod};`,
    ];
  });
const kalip = (degerler: string[]) =>
  new RegExp(
    degerler
      .flatMap((deger) =>
        /\p{L}/u.test(deger)
          ? [`(?<![\\p{L}\\p{N}_])${kacir(deger)}(?![\\p{L}\\p{N}_])`]
          : [kacir(deger), ...kacisli(deger)],
      )
      .join("|"),
    "u",
  );

// Bilinen ve gerekçesi yazılı geçişler: dosya ve satırın içindeki parça.
const bilinenler = [
  // Ülke listesindeki Doğu Timor'un kodu, para birimi değil.
  { dosya: "cekirdek/bolgeler/ulkeler.json", parca: '"TL",' },
  // Bu testin kendisi aranan yazılışları listeler.
  { dosya: "cekirdek/testler/para-simgesi-yok.test.ts", parca: "" },
];
const biliniyor = (dosya: string, satir: string) =>
  bilinenler.some((bilinen) => bilinen.dosya === dosya && satir.includes(bilinen.parca));

type Metin = { ad: string; icerik: string };
const gecenler = (metinler: Metin[], degerler: string[]): string[] => {
  const k = kalip(degerler);
  return metinler.flatMap(({ ad, icerik }) =>
    icerik
      .split("\n")
      .filter((satir) => k.test(satir) && !biliniyor(ad, satir))
      .map((satir) => `${ad}: ${satir.trim()}`),
  );
};

describe("çekirdekte para simgesi yok", () => {
  it("aranacak değerler sitelerden okunur", () => {
    expect(siteDegerleri.length).toBeGreaterThanOrEqual(2);
    expect(aranacaklar).toEqual(expect.arrayContaining(ekYazilislar));
  });

  it("çekirdekte ve bileşenlerde sitelerin para birimi ve simgesi geçmez", () => {
    const yollar = ["cekirdek", "bilesenler"]
      .flatMap((klasor) =>
        dosyalar(join(kok, klasor), /\.(ts|tsx|mts|js|mjs|cjs|json|sql|css|html|svg)$/),
      )
      .filter((yol) => !yol.startsWith(join(kok, "cekirdek", "demolar", "/"))); // Demo paketi veridir, para birimini tanımında yazar (karar 0203).
    expect(yollar.length).toBeGreaterThan(100);
    const metinler = yollar.map((yol) => ({
      ad: relative(kok, yol),
      icerik: readFileSync(yol, "utf8"),
    }));
    expect(gecenler(metinler, aranacaklar)).toEqual([]);
  });

  it("bozuk örnekleri yakalar, sözcüğün parçasını yakalamaz", () => {
    const degerler = ["ABC", "¤", "TL"];
    const ornek = (icerik: string) => gecenler([{ ad: "ornek.ts", icerik }], degerler);
    expect(ornek('const birim = "ABC";')).toHaveLength(1);
    expect(ornek('fiyat: "100 ¤"')).toHaveLength(1);
    expect(ornek("// 12 TL")).toHaveLength(1);
    expect(ornek('kod("ABC")')).toHaveLength(1);
    expect(ornek("ABCD ve abc ve HTML ve TLS ve tl")).toEqual([]);
    // Kaçışlı yazılışlar (¤ = U+00A4).
    expect(ornek('const s = "\\u00a4";')).toHaveLength(1);
    expect(ornek('const s = "\\u00A4";')).toHaveLength(1);
    expect(ornek('const s = "\\u{A4}";')).toHaveLength(1);
    expect(ornek("<b>&#xa4;</b>")).toHaveLength(1);
    // Ondalık yazılış. Parçalarla kurulur: "#" ve rakamlar yan yana yazılınca denetim ham renk sanar.
    expect(ornek(["<b>&", "#", "164;</b>"].join(""))).toHaveLength(1);
    expect(ornek('const s = "\\u00a45";')).toEqual([]);
    // Bilinen geçiş yalnız kendi dosyasında ve satırında geçer.
    expect(gecenler([{ ad: "cekirdek/bolgeler/ulkeler.json", icerik: '"TL",' }], ["TL"])).toEqual(
      [],
    );
    expect(
      gecenler([{ ad: "cekirdek/bolgeler/baska.json", icerik: '"TL",' }], ["TL"]),
    ).toHaveLength(1);
  });
});
