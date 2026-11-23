// Vitrinin tarayıcı koduna yalnız vitrin metinleri gider (kart 0253, karar 0152):
// - vitrin-metinleri.json tr.json'dan üretilenle aynıdır (tr.json değişip `pnpm vitrin-metinleri` çalıştırılmadıysa
//   kırmızı).
// - Panel ve katalog dışındaki her tarayıcı dosyasından ("use client") içe aktarma zinciri izlenir: zincir bütün metin
//   dosyasına (metinler/metin.ts ya da metinler/tr.json) ya da panelin okuyucusuna (panel-metni.tsx) varırsa kırmızı.
//   Yalnız türü alan içe aktarma (`import type`) kod taşımaz, izlenmez. Bozuk örnekler zincirin yakaladığını gösterir.
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  istemciDosyalari,
  kok,
  panelVeKatalogMu,
  yasakZincir as zincir,
} from "../../testler/ice-aktarma-zinciri.ts";
import vitrinMetinleri from "../vitrin-metinleri.json" with { type: "json" };
import { vitrinMetinleriniUret } from "../vitrin-metinleri-uret.ts";

const yasaklar = [
  "cekirdek/metinler/metin.ts",
  "cekirdek/metinler/tr.json",
  "cekirdek/metinler/panel-metni.tsx",
];
// Bütün dosyayı okuyabilen taraflar: panel, eklentilerin panel ekranları (cekirdek/eklentiler/<kod>/panel/, kart 0258)
// ve bileşen kataloğu (yalnız geliştirmede ve deneme ortamında açılır). Zincir izleme ortak yardımcıdadır (kart 0295).
const yasakZincir = (baslangic: string, oku?: (yol: string) => string): string[] =>
  zincir(baslangic, yasaklar, oku);

describe("vitrin metinleri", () => {
  it("vitrin-metinleri.json tr.json'dan üretilenle aynı", () => {
    expect(vitrinMetinleri).toEqual(vitrinMetinleriniUret());
  });

  it("panel ve katalog dışındaki tarayıcı dosyaları bütün metin dosyasına ve panelin okuyucusuna varmaz", () => {
    const vitrinIstemcileri = istemciDosyalari().filter((yol) => {
      const goreli = relative(kok, yol);
      return !panelVeKatalogMu(goreli) && !yasaklar.includes(goreli);
    });
    expect(vitrinIstemcileri.length).toBeGreaterThan(50);
    const sorunlar = vitrinIstemcileri
      .map((yol) => yasakZincir(yol))
      .filter((zincir) => zincir.length > 0)
      .map((zincir) => zincir.join(" → "));
    expect(sorunlar).toEqual([]);
  });

  it("bozuk örnekler: doğrudan, dolaylı ve yeniden aktarmayla varan zincir yakalanır; yalnız tür alan yakalanmaz", () => {
    const sahte = (dosyalar: Record<string, string>) => (yol: string) =>
      dosyalar[relative(kok, yol)] ?? readFileSync(yol, "utf8");
    const bas = join(kok, "cekirdek/vitrin/ornek-istemci.tsx");
    // Sahte dosyalar diskte yoktur: zincir yalnız var olan dosyalara uzanır; başlangıcı gerçek yasak dosyalara bağlarız.
    const dogrudan = sahte({
      "cekirdek/vitrin/ornek-istemci.tsx": `"use client";\nimport { metinOkuyucu } from "../metinler/metin";\n`,
    });
    expect(yasakZincir(bas, dogrudan)).toEqual([
      "cekirdek/vitrin/ornek-istemci.tsx",
      "cekirdek/metinler/metin.ts",
    ]);
    const panel = sahte({
      "cekirdek/vitrin/ornek-istemci.tsx": `"use client";\nimport { usePanelMetni } from "../metinler/panel-metni";\n`,
    });
    expect(yasakZincir(bas, panel).at(-1)).toBe("cekirdek/metinler/panel-metni.tsx");
    // Dolaylı: e-posta şablonu bütün metin dosyasını içe aktarır.
    const dolayli = sahte({
      "cekirdek/vitrin/ornek-istemci.tsx": `"use client";\nimport { epostaOlustur } from "../moduller/eposta/sablon";\n`,
    });
    expect(yasakZincir(bas, dolayli)).toEqual([
      "cekirdek/vitrin/ornek-istemci.tsx",
      "cekirdek/moduller/eposta/sablon.ts",
      "cekirdek/metinler/metin.ts",
    ]);
    const yeniden = sahte({
      "cekirdek/vitrin/ornek-istemci.tsx": `"use client";\nexport { metinOkuyucu } from "../metinler/metin";\n`,
    });
    expect(yasakZincir(bas, yeniden).at(-1)).toBe("cekirdek/metinler/metin.ts");
    const yalnizTur = sahte({
      "cekirdek/vitrin/ornek-istemci.tsx": `"use client";\nimport type { MetinAnahtari } from "../metinler/metin";\n`,
    });
    expect(yasakZincir(bas, yalnizTur)).toEqual([]);
  });
});
