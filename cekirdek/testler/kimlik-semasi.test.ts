// Kimlik şeması tek yerdedir (kart 0119, karar 0112): girdideki kimlik yalnız `kimlikSemasi` ile doğrulanır ve küçük
// harfe çevrilir (cekirdek/veritabani/kimlik.ts). Zod'un kimlik doğrulayıcısını başka bir dosyada çağırmak büyük harfli
// kimliği olduğu gibi geçirir ve metin karşılaştırmalarını yanıltır: tarama bunu yakalar. Testler, ortak dosyanın
// kendisi ve veritabanı sütun tanımları (`uuid()`, zod değil) sayılmaz.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { kimligiDuzelt, kimlikMi, kimlikSemasi } from "../veritabani/kimlik";

const kok = join(import.meta.dirname, "..", "..");
const atlananlar = new Set(["node_modules", ".next", "test-results", "testler"]);
const ortakDosya = join(kok, "cekirdek", "veritabani", "kimlik.ts");

const dosyalar = (klasor: string): string[] =>
  readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
    if (atlananlar.has(girdi.name)) return [];
    const yol = join(klasor, girdi.name);
    if (girdi.isDirectory()) return dosyalar(yol);
    return /\.(?:ts|tsx|mts)$/.test(girdi.name) ? [yol] : [];
  });

// Kimlik şemasının elle yazılışları: zod'un kimlik doğrulayıcısı (z.uuid(), z.guid(), z.string().trim().uuid() gibi araya
// başka çağrı ya da satır giren zincirler dahil, noktayla çağrılan her uuid/guid), zod'dan doğrudan alınan uuid ve
// kimlikMi ile süzülen metin (küçük harfe çevirmez). Veritabanı sütunu `uuid()` noktasız çağrılır, sayılmaz. Takma
// adla alınmış zod (import { z as s }) ve zod'un ad alanıyla (import * as) alınması yalnız disiplindir.
const kimlikYazilislari = [
  /\.\s*(?:uuid|guid|uuidv4|uuidv6|uuidv7)\s*\(/,
  /import\s*\{[^}]*\b(?:uuid|guid|uuidv4|uuidv6|uuidv7)\b[^}]*\}\s*from\s*["']zod["']/,
  /\.\s*refine\s*\(\s*kimlikMi\b/,
];

const kimlikSemasiYazilmis = (kaynak: string): boolean =>
  kimlikYazilislari.some((kalip) => kalip.test(kaynak));

describe("kimlik şeması", () => {
  it("ortak dosya dışında zod'un kimlik doğrulayıcısı çağrılmaz", () => {
    const taranan = ["cekirdek", "bilesenler", "komutlar", "siteler", "sahip-paneli"].flatMap(
      (klasor) => dosyalar(join(kok, klasor)),
    );
    expect(taranan.length).toBeGreaterThan(100);
    expect(taranan).toContain(ortakDosya);
    const yazanlar = taranan
      .filter((dosya) => dosya !== ortakDosya && kimlikSemasiYazilmis(readFileSync(dosya, "utf8")))
      .map((dosya) => relative(kok, dosya));
    expect(yazanlar).toEqual([]);
  });

  it.each([
    "z.uuid()",
    "z.uuid().nullable()",
    "z\n    .uuid()\n    .optional()",
    "z . uuid ( )",
    "z.guid()",
    "z.uuidv4()",
    "z.string().uuid()",
    "z.string()\n  .uuid()",
    "z.string().trim().uuid()",
    "z.string().min(36).uuid().optional()",
    "z.string().refine(kimlikMi)",
    'z.string().refine( kimlikMi, "bozuk")',
  ])("bozuk örnek yakalanır: %s", (ornek) => {
    expect(kimlikSemasiYazilmis(`const alan = ${ornek};`)).toBe(true);
  });

  it.each([
    "kimlikSemasi.nullable()",
    'uuid().references(() => dosyalar.kimlik, { onDelete: "restrict" })',
    "uuid().primaryKey().defaultRandom()",
    "z.string().min(1)",
  ])("kimlik şeması sayılmayan yazılış geçer: %s", (ornek) => {
    expect(kimlikSemasiYazilmis(`const alan = ${ornek};`)).toBe(false);
  });

  it.each([
    'import { uuid } from "zod";',
    "import { z, guid } from 'zod';",
    'import {\n  uuidv4,\n} from "zod";',
  ])("zod'dan doğrudan alınan kimlik doğrulayıcısı yakalanır: %s", (ornek) => {
    expect(kimlikSemasiYazilmis(ornek)).toBe(true);
  });

  it("veritabanı sütununun uuid'i zod'dan değil drizzle'dan gelir, sayılmaz", () => {
    expect(
      kimlikSemasiYazilmis('import { uuid } from "drizzle-orm/pg-core";\nconst a = uuid();'),
    ).toBe(false);
  });

  it("ortak şema kimliği küçük harfe çevirir, kimlik olmayanı reddeder", () => {
    const kimlik = "0E598BAD-2C93-4B15-BF6E-8FB3BCA5BC0B";
    expect(kimlikSemasi.parse(kimlik)).toBe(kimlik.toLowerCase());
    expect(kimlikSemasi.safeParse("0e598bad").success).toBe(false);
    expect(kimligiDuzelt(kimlik)).toBe(kimlik.toLowerCase());
    expect(kimlikMi(kimlik)).toBe(true);
    expect(kimlikMi("0e598bad-2c93-4b15-bf6e")).toBe(false);
  });
});
