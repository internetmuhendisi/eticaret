// Bileşen kataloğunun kapsamı (kart 0104): kütüphanedeki her parça dosyası katalogda, dışa açtığı her parça
// katalogun örneklerinde kullanılıyor. Kütüphaneye eklenip kataloğa eklenmeyen parça burada kırmızıdır.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { disaAcilanParcalar, katalogEksikleri } from "../tarama.ts";

const kok = join(import.meta.dirname, "..", "..", "..");

describe("katalogun kapsamı", () => {
  it("kütüphanedeki her parça katalogda ve örneklerinde", () => {
    expect(katalogEksikleri(kok)).toEqual([]);
  });

  it("dışa açılan parçalar: büyük harfle başlayan değerler, türler ve yardımcılar değil", () => {
    expect(
      disaAcilanParcalar(
        [
          "export const Pencere = Dialog.Root;",
          "export const ortuSiniflari = 'x';",
          "export function PencereIcerigi() {}",
          "export async function Yukle() {}",
          "export class Sinifli {}",
          "export let Degisken = 1;",
          "export function bildirimGoster() {}",
          "export type UyariTuru = string;",
          "export {",
          "  PencereAciklamasi as YanPencereAciklamasi,",
          "  type PencereTuru,",
          "  ortak,",
          "} from './pencere';",
        ].join("\n"),
      ),
    ).toEqual([
      "Degisken",
      "Pencere",
      "PencereIcerigi",
      "Sinifli",
      "YanPencereAciklamasi",
      "Yukle",
    ]);
    expect(disaAcilanParcalar("export default function Afis() {}")).toEqual(["default"]);
    expect(disaAcilanParcalar("const A = 1;\nexport default A;")).toEqual(["default"]);
    expect(disaAcilanParcalar("export { A as default };")).toEqual(["default"]);
    expect(disaAcilanParcalar('export * from "./a";')).toEqual(["*"]);
    expect(disaAcilanParcalar('export * as Ortak from "./a";')).toEqual(["Ortak"]);
    expect(disaAcilanParcalar("export abstract class Soyut {}")).toEqual(["Soyut"]);
  });
});

// Bozuk örnekler: geçici bir proje kökünde kütüphane ve örnekler kurulur.
describe("katalog eksik olunca kırmızı", () => {
  let gecici = "";
  const yaz = (yol: string, icerik: string) => {
    mkdirSync(dirname(join(gecici, yol)), { recursive: true });
    writeFileSync(join(gecici, yol), icerik);
  };
  afterEach(() => rmSync(gecici, { recursive: true, force: true }));

  const kur = () => {
    gecici = mkdtempSync(join(tmpdir(), "katalog-kapsam-"));
    yaz(
      "bilesenler/parcalar/dugme.tsx",
      "export function Dugme() {}\nexport function IkonDugmesi() {}\n",
    );
    yaz("bilesenler/parcalar/sinif.ts", "export function Sinif() {}\n");
    yaz(
      "cekirdek/katalog/ornekler/dugme.tsx",
      'import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";\n',
    );
  };

  it("tam katalog yeşildir; .ts yardımcıları parça değildir", () => {
    kur();
    expect(katalogEksikleri(gecici, ["bilesenler/parcalar/dugme.tsx"])).toEqual([]);
  });

  it("kütüphaneye eklenen yeni parça dosyası katalogda yoksa kırmızıdır", () => {
    kur();
    yaz("bilesenler/parcalar/yildiz.tsx", "export function Yildiz() {}\n");
    expect(katalogEksikleri(gecici, ["bilesenler/parcalar/dugme.tsx"])).toEqual([
      "bilesenler/parcalar/yildiz.tsx katalogda yok (cekirdek/katalog/kayit.ts)",
      "bilesenler/parcalar/yildiz.tsx içindeki Yildiz katalogun örneklerinde yok (cekirdek/katalog/ornekler)",
    ]);
  });

  it("var olan dosyaya eklenen parça örneklerde yoksa kırmızıdır", () => {
    kur();
    yaz(
      "bilesenler/parcalar/dugme.tsx",
      "export function Dugme() {}\nexport function IkonDugmesi() {}\nexport const DugmeGrubu = 1;\n",
    );
    expect(katalogEksikleri(gecici, ["bilesenler/parcalar/dugme.tsx"])).toEqual([
      "bilesenler/parcalar/dugme.tsx içindeki DugmeGrubu katalogun örneklerinde yok (cekirdek/katalog/ornekler)",
    ]);
  });

  it("yalnız türü alan ya da başka dosyadan alan örnek kullanım sayılmaz", () => {
    kur();
    yaz(
      "cekirdek/katalog/ornekler/dugme.tsx",
      [
        'import type { Dugme } from "../../../bilesenler/parcalar/dugme";',
        'import { IkonDugmesi } from "../../../bilesenler/parcalar/baska";',
      ].join("\n"),
    );
    expect(katalogEksikleri(gecici, ["bilesenler/parcalar/dugme.tsx"])).toEqual([
      "bilesenler/parcalar/dugme.tsx içindeki Dugme katalogun örneklerinde yok (cekirdek/katalog/ornekler)",
      "bilesenler/parcalar/dugme.tsx içindeki IkonDugmesi katalogun örneklerinde yok (cekirdek/katalog/ornekler)",
    ]);
  });

  it("alt klasördeki ve yeni bir kütüphane klasöründeki parça da aranır", () => {
    kur();
    yaz("bilesenler/parcalar/alt/yildiz.tsx", "export function Yildiz() {}\n");
    yaz("bilesenler/vitrin/afis.tsx", "export function Afis() {}\n");
    yaz("bilesenler/parcalar/testler/deneme.tsx", "export function Deneme() {}\n");
    yaz("bilesenler/shadcn-kaynagi/button.tsx", "export function Button() {}\n");
    expect(katalogEksikleri(gecici, ["bilesenler/parcalar/dugme.tsx"])).toEqual([
      "bilesenler/parcalar/alt/yildiz.tsx katalogda yok (cekirdek/katalog/kayit.ts)",
      "bilesenler/vitrin/afis.tsx katalogda yok (cekirdek/katalog/kayit.ts)",
      "bilesenler/parcalar/alt/yildiz.tsx içindeki Yildiz katalogun örneklerinde yok (cekirdek/katalog/ornekler)",
      "bilesenler/vitrin/afis.tsx içindeki Afis katalogun örneklerinde yok (cekirdek/katalog/ornekler)",
    ]);
  });

  it("varsayılan aktarma varsayılan içe aktarmayla karşılanır, toplu aktarma hiç karşılanmaz", () => {
    kur();
    yaz("bilesenler/parcalar/afis.tsx", "export default function Afis() {}\n");
    yaz("bilesenler/parcalar/hepsi.tsx", 'export * from "./dugme.tsx";\n');
    yaz(
      "cekirdek/katalog/ornekler/afis.tsx",
      'import Afis from "../../../bilesenler/parcalar/afis";\nimport { Hepsi } from "../../../bilesenler/parcalar/hepsi";\n',
    );
    const kayit = [
      "bilesenler/parcalar/dugme.tsx",
      "bilesenler/parcalar/afis.tsx",
      "bilesenler/parcalar/hepsi.tsx",
    ];
    expect(katalogEksikleri(gecici, kayit)).toEqual([
      "bilesenler/parcalar/hepsi.tsx parçalarını export * ile aktarıyor; katalog yalnız adıyla aktarılan parçayı izler",
    ]);
    yaz("cekirdek/katalog/ornekler/afis.tsx", "");
    expect(katalogEksikleri(gecici, kayit)).toContain(
      "bilesenler/parcalar/afis.tsx içindeki default katalogun örneklerinde yok (cekirdek/katalog/ornekler)",
    );
  });

  it("katalogda olup kütüphanede olmayan dosya kırmızıdır", () => {
    kur();
    expect(
      katalogEksikleri(gecici, ["bilesenler/parcalar/dugme.tsx", "bilesenler/parcalar/eski.tsx"]),
    ).toEqual(["bilesenler/parcalar/eski.tsx katalogda var ama kütüphanede yok"]);
  });
});
