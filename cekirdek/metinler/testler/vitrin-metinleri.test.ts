// Vitrinin tarayıcı koduna yalnız vitrin metinleri gider (kart 0253, karar 0152):
// - vitrin-metinleri.json tr.json'dan üretilenle aynıdır (tr.json değişip `pnpm vitrin-metinleri` çalıştırılmadıysa
//   kırmızı).
// - Panel ve katalog dışındaki her tarayıcı dosyasından ("use client") içe aktarma zinciri izlenir: zincir bütün metin
//   dosyasına (metinler/metin.ts ya da metinler/tr.json) ya da panelin okuyucusuna (panel-metni.tsx) varırsa kırmızı.
//   Yalnız türü alan içe aktarma (`import type`) kod taşımaz, izlenmez. Bozuk örnekler zincirin yakaladığını gösterir.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import vitrinMetinleri from "../vitrin-metinleri.json" with { type: "json" };
import { vitrinMetinleriniUret } from "../vitrin-metinleri-uret.ts";

const kok = resolve(import.meta.dirname, "../../..");
const yasaklar = [
  "cekirdek/metinler/metin.ts",
  "cekirdek/metinler/tr.json",
  "cekirdek/metinler/panel-metni.tsx",
];
// Bütün dosyayı okuyabilen taraflar: panel, eklentilerin panel ekranları (cekirdek/eklentiler/<kod>/panel/, kart 0258)
// ve bileşen kataloğu (yalnız geliştirmede ve deneme ortamında açılır).
const serbestKlasorler = ["cekirdek/yonetim-paneli/", "cekirdek/katalog/"];
const serbestMi = (goreli: string): boolean =>
  serbestKlasorler.some((klasor) => goreli.startsWith(klasor)) ||
  /^cekirdek\/eklentiler\/[^/]+\/panel\//.test(goreli);

const dosyalar = (klasor: string): string[] =>
  readdirSync(klasor).flatMap((ad) => {
    const yol = join(klasor, ad);
    if (ad === "node_modules" || ad === ".next" || ad === "testler") return [];
    if (statSync(yol).isDirectory()) return dosyalar(yol);
    return /\.(ts|tsx)$/.test(ad) ? [yol] : [];
  });

// Göreli içe aktarmanın dosyası (uzantısız yazılmışsa .ts, .tsx ya da klasörün index'i).
const coz = (kaynak: string, adres: string): string | undefined => {
  const temel = resolve(dirname(kaynak), adres);
  for (const aday of [temel, `${temel}.ts`, `${temel}.tsx`, join(temel, "index.ts")]) {
    if (existsSync(aday) && statSync(aday).isFile()) return aday;
  }
  return undefined;
};

// Kod taşıyan içe aktarmalar ve yeniden aktarmalar: `import type` ve `export type` sayılmaz.
const iceAktarmalar = (icerik: string): string[] =>
  [
    ...icerik.matchAll(
      /(?:^|\n)\s*(?:import|export)\s+(?!type\s)(?:[^"';]*?\sfrom\s+)?["'](\.{1,2}\/[^"']+)["']/g,
    ),
  ].map((eslesme) => eslesme[1] ?? "");

// Kaynak koddan başlayıp yasak dosyaya varan ilk zincir (yoksa boş).
const yasakZincir = (
  baslangic: string,
  oku: (yol: string) => string = (yol) => readFileSync(yol, "utf8"),
): string[] => {
  const onceki = new Map<string, string | null>([[baslangic, null]]);
  const sira = [baslangic];
  while (sira.length > 0) {
    const yol = sira.shift() as string;
    const goreli = relative(kok, yol);
    if (yasaklar.includes(goreli)) {
      const zincir: string[] = [];
      for (let adim: string | null = yol; adim !== null; adim = onceki.get(adim) ?? null) {
        zincir.unshift(relative(kok, adim));
      }
      return zincir;
    }
    if (!/\.(ts|tsx)$/.test(yol)) continue;
    for (const adres of iceAktarmalar(oku(yol))) {
      const hedef = coz(yol, adres);
      if (hedef === undefined || onceki.has(hedef)) continue;
      onceki.set(hedef, yol);
      sira.push(hedef);
    }
  }
  return [];
};

describe("vitrin metinleri", () => {
  it("vitrin-metinleri.json tr.json'dan üretilenle aynı", () => {
    expect(vitrinMetinleri).toEqual(vitrinMetinleriniUret());
  });

  it("panel ve katalog dışındaki tarayıcı dosyaları bütün metin dosyasına ve panelin okuyucusuna varmaz", () => {
    const istemciDosyalari = [
      ...dosyalar(join(kok, "cekirdek")),
      ...dosyalar(join(kok, "bilesenler")),
    ].filter((yol) => {
      const goreli = relative(kok, yol);
      return (
        !serbestMi(goreli) &&
        !yasaklar.includes(goreli) &&
        /^\s*["']use client["']/.test(readFileSync(yol, "utf8"))
      );
    });
    expect(istemciDosyalari.length).toBeGreaterThan(50);
    const sorunlar = istemciDosyalari
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
