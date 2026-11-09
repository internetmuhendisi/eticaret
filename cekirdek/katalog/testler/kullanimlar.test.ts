// Katalogun "kullanıldığı yerler" listesi (kart 0104): kullanimlar.json kodla aynıdır. Kırmızıysa
// `pnpm katalog-kullanimlari` çalıştırılır.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { kullanimlariBul } from "../tarama.ts";

const kok = join(import.meta.dirname, "..", "..", "..");

describe("kullanıldığı yerler", () => {
  it("kullanimlar.json kodla aynı (pnpm katalog-kullanimlari)", () => {
    const kayitli = JSON.parse(
      readFileSync(join(kok, "cekirdek", "katalog", "kullanimlar.json"), "utf8"),
    ) as unknown;
    expect(kayitli).toEqual(kullanimlariBul(kok));
  });

  it("parçayı içe aktaran ve yeniden aktaran dosyalar bulunur; testler, katalog ve parçanın kendisi sayılmaz", () => {
    const gecici = mkdtempSync(join(tmpdir(), "katalog-kullanim-"));
    const yaz = (yol: string, icerik: string) => {
      mkdirSync(dirname(join(gecici, yol)), { recursive: true });
      writeFileSync(join(gecici, yol), icerik);
    };
    try {
      yaz("bilesenler/parcalar/dugme.tsx", 'import { x } from "./dugme";\n');
      yaz("bilesenler/parcalar/kart.tsx", "export function Kart() {}\n");
      yaz(
        "cekirdek/vitrin/sayfa.tsx",
        'import { Dugme } from "../../bilesenler/parcalar/dugme";\n',
      );
      yaz("cekirdek/vitrin/stil.ts", 'import "../../bilesenler/parcalar/dugme.tsx";\n');
      yaz(
        "cekirdek/yonetim-paneli/liste.ts",
        'export { Dugme } from "../../bilesenler/parcalar/dugme.tsx";\n',
      );
      yaz("sahip-paneli/sayfa.tsx", 'const D = await import("../bilesenler/parcalar/dugme");\n');
      yaz(
        "cekirdek/vitrin/testler/sayfa.test.tsx",
        'import "../../../bilesenler/parcalar/dugme";\n',
      );
      yaz("cekirdek/vitrin/testler/yardimci.tsx", 'import "../../../bilesenler/parcalar/dugme";\n');
      yaz(
        "cekirdek/katalog/ornekler/dugme.tsx",
        'import { Dugme } from "../../../bilesenler/parcalar/dugme";\n',
      );
      expect(kullanimlariBul(gecici)).toEqual({
        "bilesenler/parcalar/dugme.tsx": [
          "cekirdek/vitrin/sayfa.tsx",
          "cekirdek/vitrin/stil.ts",
          "cekirdek/yonetim-paneli/liste.ts",
          "sahip-paneli/sayfa.tsx",
        ],
        "bilesenler/parcalar/kart.tsx": [],
      });
    } finally {
      rmSync(gecici, { recursive: true, force: true });
    }
  });
});
