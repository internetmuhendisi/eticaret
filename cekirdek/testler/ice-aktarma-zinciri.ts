// Tarayıcı dosyalarının içe aktarma zinciri (kart 0253'ten taşındı, kart 0295): hangi kaynak dosyanın tarayıcı koduna
// gittiğini derlemeden, kaynaktan izler. Yalnız göreli içe aktarmalar izlenir (paket adıyla içe aktarma izlenmez);
// yalnız türü alan içe aktarma (`import type`, `export type`) kod taşımaz, izlenmez.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export const kok = resolve(import.meta.dirname, "../..");

export type Okuyucu = (yol: string) => string;
export const diskten: Okuyucu = (yol) => readFileSync(yol, "utf8");

// Klasördeki .ts ve .tsx dosyaları (testler, node_modules ve derleme çıktısı dışında).
export const kaynakDosyalari = (klasor: string): string[] =>
  readdirSync(klasor).flatMap((ad) => {
    const yol = join(klasor, ad);
    if (ad === "node_modules" || ad === ".next" || ad === "testler") return [];
    if (statSync(yol).isDirectory()) return kaynakDosyalari(yol);
    return /\.(ts|tsx)$/.test(ad) ? [yol] : [];
  });

// Panel ve katalog: vitrine gitmeyen tarayıcı kodu (eklentilerin panel ekranları da, kart 0258).
export const panelVeKatalogMu = (goreli: string): boolean =>
  goreli.startsWith("cekirdek/yonetim-paneli/") ||
  goreli.startsWith("cekirdek/katalog/") ||
  /^cekirdek\/eklentiler\/[^/]+\/panel\//.test(goreli);

// Çekirdeğin ve kütüphanenin "use client" dosyaları.
export const istemciDosyalari = (): string[] =>
  [...kaynakDosyalari(join(kok, "cekirdek")), ...kaynakDosyalari(join(kok, "bilesenler"))].filter(
    (yol) => /^\s*["']use client["']/.test(diskten(yol)),
  );

// Göreli içe aktarmanın dosyası (uzantısız yazılmışsa .ts, .tsx ya da klasörün index'i).
export const coz = (kaynak: string, adres: string): string | undefined => {
  const temel = resolve(dirname(kaynak), adres);
  for (const aday of [temel, `${temel}.ts`, `${temel}.tsx`, join(temel, "index.ts")]) {
    if (existsSync(aday) && statSync(aday).isFile()) return aday;
  }
  return undefined;
};

// Kod taşıyan içe aktarmalar ve yeniden aktarmalar: adres ve (varsa) süslü parantezdeki adlar. `import type` ve
// `export type` sayılmaz; süslü parantezde tek tek `type` ile yazılan adlar da sayılmaz.
export const iceAktarmalar = (icerik: string): { adres: string; adlar: string[] | "hepsi" }[] =>
  [
    ...icerik.matchAll(
      /(?:^|\n)\s*(?:import|export)\s+(?!type\s)([^"';]*?\sfrom\s+)?["'](\.{1,2}\/[^"']+)["']/g,
    ),
  ].map((eslesme) => {
    const bas = eslesme[1] ?? "";
    const suslu = bas.match(/\{([^}]*)\}/);
    const adlar =
      suslu === null || /\*/.test(bas)
        ? ("hepsi" as const)
        : (suslu[1] ?? "")
            .split(",")
            .map((ad) => ad.trim())
            .filter((ad) => ad !== "" && !ad.startsWith("type "))
            .map((ad) => (ad.split(/\s+as\s+/)[0] ?? "").trim());
    return { adres: eslesme[2] ?? "", adlar };
  });

// Başlangıçtan izlenen zincir: her ulaşılan dosya ve ona hangi dosyadan gelindiği.
export const zincirler = (
  baslangic: string,
  oku: Okuyucu = diskten,
): Map<string, string | null> => {
  const onceki = new Map<string, string | null>([[baslangic, null]]);
  const sira = [baslangic];
  while (sira.length > 0) {
    const yol = sira.shift() as string;
    if (!/\.(ts|tsx)$/.test(yol)) continue;
    for (const { adres } of iceAktarmalar(oku(yol))) {
      const hedef = coz(yol, adres);
      if (hedef === undefined || onceki.has(hedef)) continue;
      onceki.set(hedef, yol);
      sira.push(hedef);
    }
  }
  return onceki;
};

// Ulaşılan dosyadan başlangıca geri giden zincir, kökten göreli.
export const zinciriYaz = (onceki: Map<string, string | null>, son: string): string[] => {
  const zincir: string[] = [];
  for (let adim: string | null = son; adim !== null; adim = onceki.get(adim) ?? null) {
    zincir.unshift(relative(kok, adim));
  }
  return zincir;
};

// Kaynak koddan başlayıp yasak dosyalardan birine varan ilk zincir (yoksa boş).
export const yasakZincir = (
  baslangic: string,
  yasaklar: readonly string[],
  oku: Okuyucu = diskten,
): string[] => {
  const onceki = zincirler(baslangic, oku);
  const varilan = [...onceki.keys()].find((yol) => yasaklar.includes(relative(kok, yol)));
  return varilan === undefined ? [] : zinciriYaz(onceki, varilan);
};
