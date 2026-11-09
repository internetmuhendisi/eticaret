// Bileşen kataloğunun kaynak taraması (kart 0104, karar 0078). Yalnız Node'da çalışır: komut
// (pnpm katalog-kullanimlari) ve testler kullanır, sayfa kullanmaz; canlı görüntüde kaynak yoktur.
// - Kütüphanedeki her parça dosyasının katalogda olup olmadığını ve dışa açtığı her parçanın örneklerde
//   kullanılıp kullanılmadığını bulur.
// - Her parça dosyasını içe aktaran dosyaları bulur (kullanildigi yerler, kullanimlar.json).
// TypeScript 7'nin JavaScript arayüzü yoktur; dosyalar Biome'dan geçtiği için içe ve dışa aktarma satırları
// tek biçimdedir ve düzenli ifadeyle okunur. Yorum içinde yazılmış bir aktarma satırı da sayılır.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { katalogParcalari } from "./kayit.ts";

// Katalogda gösterilmesi gereken kütüphane: bilesenler/ altındaki her .tsx dosyası, alt klasörlerde ve yeni
// açılan klasörlerde de (testler ve shadcn kaynağı dışında). .ts dosyaları (sinif.ts, sozluk.ts,
// tasarım değerleri) yardımcıdır, bileşen .tsx dosyasında yazılır.
const kutuphaneKoku = "bilesenler";

// Kullanım aranan klasörler ve atlananlar. Testler ve katalogun kendisi kullanım sayılmaz.
const kullanimKlasorleri = ["cekirdek", "bilesenler", "sahip-paneli"];
const atlananAdlar = new Set(["node_modules", ".next", "testler", "shadcn-kaynagi"]);
const atlananKlasorler = ["cekirdek/katalog"];

const ornekKlasoru = "cekirdek/katalog/ornekler";

const bolu = (yol: string) => yol.split(sep).join("/");

export const kutuphaneDosyalari = (kok: string): string[] =>
  kaynakDosyalari(kok, kutuphaneKoku)
    .filter((dosya) => dosya.endsWith(".tsx"))
    .sort();

// Dosyanın dışa açtığı parçalar: büyük harfle başlayan değer (işlev, sabit, sınıf, yeniden aktarılan ad).
// Türler ve küçük harfle başlayan yardımcılar (dugmeSiniflari, bildirimGoster) parça değildir. Varsayılan
// aktarma "default" adıyla, toplu yeniden aktarma (export *) "*" adıyla döner: "*" hiçbir örnekte
// karşılanamaz, parçalar adlarıyla aktarılmalıdır; "export * as Ad" Ad adıyla döner. Tek satırda birden çok
// ad (export const A = 1, B = 2) ve parçalanarak aktarma (export const { Root: A } = X) tanınmaz: kütüphane
// her parçayı kendi satırında yazar (kabul edilen sınır, karar 0078).
export const disaAcilanParcalar = (kaynak: string): string[] => {
  const adlar = new Set<string>();
  for (const [, varsayilan, ad] of kaynak.matchAll(
    /^export\s+(default\s+)?(?:async\s+|abstract\s+)?(?:function\*?|const|let|var|class)\s+(\w+)/gm,
  )) {
    if (varsayilan !== undefined) adlar.add("default");
    else if (ad !== undefined && /^[A-Z]/.test(ad)) adlar.add(ad);
  }
  if (/^export\s+default\s+(?!(?:async\s+)?(?:function|const|let|var|class)\b)/m.test(kaynak)) {
    adlar.add("default");
  }
  for (const [, ad] of kaynak.matchAll(/^export\s+\*(?:\s+as\s+(\w+))?/gm)) adlar.add(ad ?? "*");
  for (const [, liste] of kaynak.matchAll(/^export\s+\{([^}]*)\}/gm)) {
    for (const oge of (liste ?? "").split(",")) {
      const parca = oge.trim();
      if (parca === "" || parca.startsWith("type ")) continue;
      const ad =
        parca
          .split(/\s+as\s+/)
          .at(-1)
          ?.trim() ?? "";
      if (/^[A-Z]/.test(ad) || ad === "default") adlar.add(ad);
    }
  }
  return [...adlar].sort();
};

// Kaynaktaki içe aktarmalar: [adlar, adres]. Yalnız türü alan aktarma kullanım sayılmaz.
const iceAktarmalar = (kaynak: string): { adlar: string[]; adres: string }[] =>
  [...kaynak.matchAll(/^import\s+(type\s+)?([^;]*?)\s+from\s+"([^"]+)"/gms)].flatMap(
    ([, tur, bolum = "", adres = ""]) => {
      if (tur !== undefined) return [];
      const suslu = bolum.match(/\{([^}]*)\}/)?.[1] ?? "";
      // Süslü parantezden önceki ad varsayılan aktarmadır: import Ad from, import Ad, { ... } from.
      const varsayilan = /^\s*[A-Za-z_$][\w$]*\s*(?:,|$)/.test(bolum) ? ["default"] : [];
      const adlar = suslu
        .split(",")
        .map((oge) => oge.trim())
        .filter((oge) => oge !== "" && !oge.startsWith("type "))
        .map((oge) => oge.split(/\s+as\s+/)[0]?.trim() ?? "");
      return [{ adlar: [...varsayilan, ...adlar], adres }];
    },
  );

// Kaynaktaki bütün modül adresleri (içe aktarma, yalnız yükleyen aktarma, yeniden aktarma, dinamik yükleme).
const modulAdresleri = (kaynak: string): string[] => [
  ...[...kaynak.matchAll(/\bfrom\s+"([^"]+)"/g)].map(([, adres]) => adres ?? ""),
  ...[...kaynak.matchAll(/^import\s+"([^"]+)"/gm)].map(([, adres]) => adres ?? ""),
  ...[...kaynak.matchAll(/\bimport\(\s*"([^"]+)"\s*\)/g)].map(([, adres]) => adres ?? ""),
];

// Göreli adresi projenin köküne göre dosya yoluna çevirir; uzantısız adres .tsx, .ts ya da index ile denenir.
const coz = (kok: string, dosya: string, adres: string): string | undefined => {
  if (!adres.startsWith(".")) return undefined;
  const taban = resolve(dirname(join(kok, dosya)), adres);
  for (const aday of [taban, `${taban}.tsx`, `${taban}.ts`, join(taban, "index.tsx")]) {
    if (existsSync(aday) && statSync(aday).isFile()) return bolu(relative(kok, aday));
  }
  return undefined;
};

const kaynakDosyalari = (kok: string, klasor: string): string[] => {
  const tam = join(kok, klasor);
  if (!existsSync(tam)) return [];
  return readdirSync(tam, { withFileTypes: true }).flatMap((oge) => {
    const yol = `${klasor}/${oge.name}`;
    if (oge.isDirectory()) {
      return atlananAdlar.has(oge.name) || atlananKlasorler.includes(yol)
        ? []
        : kaynakDosyalari(kok, yol);
    }
    return /\.(?:tsx?|mts)$/.test(oge.name) && !/\.test\.tsx?$/.test(oge.name) ? [yol] : [];
  });
};

// Katalogun eksikleri: her biri bir cümle. Boş liste katalogun tam olduğunu söyler.
export const katalogEksikleri = (
  kok: string,
  kayitDosyalari: readonly string[] = katalogParcalari.map((p) => p.dosya),
): string[] => {
  const eksikler: string[] = [];
  const kutuphane = kutuphaneDosyalari(kok);
  for (const dosya of kutuphane) {
    if (!kayitDosyalari.includes(dosya))
      eksikler.push(`${dosya} katalogda yok (cekirdek/katalog/kayit.ts)`);
  }
  for (const dosya of kayitDosyalari) {
    if (!kutuphane.includes(dosya)) eksikler.push(`${dosya} katalogda var ama kütüphanede yok`);
  }
  const kullanilanlar = new Set<string>();
  for (const ornek of kaynakDosyalari(kok, ornekKlasoru)) {
    for (const { adlar, adres } of iceAktarmalar(readFileSync(join(kok, ornek), "utf8"))) {
      const hedef = coz(kok, ornek, adres);
      if (hedef !== undefined) for (const ad of adlar) kullanilanlar.add(`${hedef}#${ad}`);
    }
  }
  for (const dosya of kutuphane) {
    for (const ad of disaAcilanParcalar(readFileSync(join(kok, dosya), "utf8"))) {
      if (!kullanilanlar.has(`${dosya}#${ad}`)) {
        eksikler.push(
          ad === "*"
            ? `${dosya} parçalarını export * ile aktarıyor; katalog yalnız adıyla aktarılan parçayı izler`
            : `${dosya} içindeki ${ad} katalogun örneklerinde yok (${ornekKlasoru})`,
        );
      }
    }
  }
  return eksikler;
};

// Her kütüphane parçasını içe aktaran dosyalar, sıralı. Parça dosyası kendini saymaz.
export const kullanimlariBul = (kok: string): Record<string, string[]> => {
  const kutuphane = kutuphaneDosyalari(kok);
  const sonuc: Record<string, Set<string>> = Object.fromEntries(
    kutuphane.map((dosya) => [dosya, new Set<string>()]),
  );
  for (const klasor of kullanimKlasorleri) {
    for (const dosya of kaynakDosyalari(kok, klasor)) {
      for (const adres of modulAdresleri(readFileSync(join(kok, dosya), "utf8"))) {
        const hedef = coz(kok, dosya, adres);
        if (hedef !== undefined && hedef !== dosya) sonuc[hedef]?.add(dosya);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(sonuc)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([dosya, kullananlar]) => [dosya, [...kullananlar].sort()]),
  );
};
