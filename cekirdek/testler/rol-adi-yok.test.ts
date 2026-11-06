// Kodda rol adına göre kontrol yazılmaz, izne bakılır (.claude/rules/yetki.md, karar 0040).
// Rol kodları yalnız başlangıç rollerinin tanımında durur. Metin dosyaları, belgeler ve değişiklik
// dosyaları taranmaz; testler rolleri adıyla değil tanımdan alır ama taranmaz.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { baslangicRolleri } from "../moduller/ekip/baslangic-rolleri.ts";

const kok = join(import.meta.dirname, "..", "..");
const atlananlar = new Set(["node_modules", ".next", "test-results", "testler"]);
// Rol tanımı ve aynı sözcüğü taşıyan ayrı kavram: ayarı kimin değiştirdiği (ayarSahipleri, karar 0010).
const muaflar = new Set([
  join("cekirdek", "moduller", "ekip", "baslangic-rolleri.ts"),
  join("cekirdek", "kayitlar", "site.ts"),
]);

const dosyalar = (klasor: string): string[] =>
  existsSync(klasor)
    ? readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
        if (atlananlar.has(girdi.name)) return [];
        const yol = join(klasor, girdi.name);
        if (girdi.isDirectory()) return dosyalar(yol);
        return /\.(ts|tsx|mts)$/.test(girdi.name) ? [yol] : [];
      })
    : [];

const rolAdiGecenler = (metinler: { ad: string; icerik: string }[], kodlar: string[]): string[] =>
  metinler
    .filter(({ icerik }) => kodlar.some((kod) => new RegExp(`["'\`]${kod}["'\`]`).test(icerik)))
    .map(({ ad }) => ad);

describe("rol adına göre kontrol", () => {
  const kodlar = Object.keys(baslangicRolleri);

  it("tanım dışındaki kodda rol kodu geçmez", () => {
    const taranan = ["cekirdek", "bilesenler", "sahip-paneli", "komutlar", "siteler"]
      .flatMap((klasor) => dosyalar(join(kok, klasor)))
      .map((yol) => ({ ad: relative(kok, yol), icerik: readFileSync(yol, "utf8") }))
      .filter(({ ad }) => !muaflar.has(ad));
    expect(rolAdiGecenler(taranan, kodlar)).toEqual([]);
  });

  it("kontrol bozuk örneği yakalar", () => {
    const [kod] = kodlar;
    expect(
      rolAdiGecenler(
        [
          { ad: "bozuk.ts", icerik: `if (rol.kod === "${kod}") izinVer();` },
          { ad: "temiz.ts", icerik: `if (await izniVarMi("ekip.gor")) izinVer();` },
        ],
        kodlar,
      ),
    ).toEqual(["bozuk.ts"]);
  });
});
