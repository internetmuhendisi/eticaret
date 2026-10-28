// Çekirdekte ve ortak bileşenlerde hiçbir sitenin kod adı ya da görünen adı geçmez
// (değişmez kural 1, .claude/rules/ayarlar.md). Siteye özel davranış ayarla yapılır.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../ayar-semasi/site-klasoru";

const kok = join(import.meta.dirname, "..", "..");
const atlananlar = new Set(["node_modules", ".next", "test-results"]);

const dosyalar = (klasor: string): string[] =>
  readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
    if (atlananlar.has(girdi.name)) return [];
    const yol = join(klasor, girdi.name);
    return girdi.isDirectory() ? dosyalar(yol) : [yol];
  });

const taranan = ["cekirdek", "bilesenler"].flatMap((klasor) => dosyalar(join(kok, klasor)));

const siteKlasorleri = readdirSync(join(kok, "siteler"), { withFileTypes: true })
  .filter((girdi) => girdi.isDirectory())
  .map((girdi) => join(kok, "siteler", girdi.name));

describe("çekirdekte site adı", () => {
  for (const klasor of siteKlasorleri) {
    const { kimlik } = siteKlasorunuOku(klasor);

    it(`${kimlik.kodAdi} geçmez`, () => {
      const adlar = [kimlik.kodAdi, kimlik.gorunenAd].map((ad) => ad.toLowerCase());
      const gecenler = taranan.filter((dosya) => {
        const icerik = readFileSync(dosya, "utf8").toLowerCase();
        return adlar.some((ad) => icerik.includes(ad));
      });
      expect(gecenler.map((dosya) => relative(kok, dosya))).toEqual([]);
    });
  }
});
