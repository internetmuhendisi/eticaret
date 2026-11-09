// Tailwind yalnız tasarım değerlerindeki adları tanır (kart 0102, karar 0076). Gerçek stil girişleri
// Tailwind'in kendi derleyicisiyle derlenir: hazır palet, hazır ölçü ve tanımsız ad hiçbir şey üretmez,
// her tasarım değerinin sınıfı vardır, tema değerlerinin değişkenleri sayfaya yazılan CSS'te tanımlıdır.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { compile } from "@tailwindcss/node";
import { describe, expect, it } from "vitest";
import { stil as vitrinStili } from "../../../cekirdek/vitrin/stil.ts";
import { stil as panelStili } from "../../../cekirdek/yonetim-paneli/stil.ts";
import { stil as formStili } from "../../form/stil.ts";
import { temaDegerleriCss } from "../css.ts";
import {
  golgeAdlari,
  kalinlikAdlari,
  koseAdlari,
  renkAdlari,
  sabitDegerler,
  varsayilanTemaDegerleri,
  yaziBoyuAdlari,
  yaziTipiAdlari,
} from "../degerler.ts";

const kok = join(import.meta.dirname, "../../..");

const derleyici = async (giris: string) => {
  const yol = join(kok, giris);
  const sonuc = await compile(readFileSync(yol, "utf8"), {
    base: dirname(yol),
    from: yol,
    onDependency: () => {},
  });
  // Derleyici verilen sınıfları biriktirir: çıktı önceki çağrıların kurallarını da taşır. Bu yüzden
  // bir sınıfın kural üretip üretmediğine çıktıda kendi seçicisinin olup olmadığıyla bakılır.
  return (siniflar: string[]) => sonuc.build(siniflar);
};

const uygulama = await derleyici("cekirdek/uygulama/stil.css");
const sahipPaneli = await derleyici("sahip-paneli/stil.css");

// Sınıfın seçicisi Tailwind'in kaçışıyla yazılır (tablet:p-4 → .tablet\:p-4) ve tam adla biter:
// .text-tehlike-yaz, .text-tehlike-yazi'nin başı olduğu için bulunmuş sayılmaz.
const sinifKurali = (cikti: string, sinif: string) => {
  const secici = `.${sinif.replaceAll(/[:.[\]()/]/g, (k) => `\\${k}`)}`;
  const kalip = secici.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${kalip}(?![a-z0-9_\\\\-])`).test(cikti);
};
const uretir = (derle: (siniflar: string[]) => string, sinif: string) =>
  sinifKurali(derle([sinif]), sinif);

describe("Tailwind yalnız tasarım değerlerini tanır", () => {
  it.each([
    ["hazır palet", ["bg-red-500", "text-white", "bg-black", "border-gray-200", "text-blue-600"]],
    ["ölçekte olmayan boşluk", ["p-37", "m-7", "gap-9", "w-13"]],
    ["hazır yazı boyu", ["text-sm", "text-lg", "text-2xl"]],
    ["hazır köşe ve gölge", ["rounded-lg", "rounded-md", "shadow-md", "shadow-lg"]],
    ["hazır yazı tipi ve kalınlık", ["font-sans", "font-mono", "font-bold", "font-semibold"]],
    ["hazır kırılma noktası", ["sm:p-4", "md:p-4", "lg:p-4"]],
    ["hazır genişlik", ["max-w-md", "max-w-7xl"]],
    ["tanımsız ad", ["bg-kirmizi", "text-baslik-9", "rounded-buyuk"]],
  ])("%s hiçbir şey üretmez", (_ad, siniflar) => {
    for (const derle of [uygulama, sahipPaneli]) {
      for (const sinif of siniflar) expect(uretir(derle, sinif), sinif).toBe(false);
    }
  });

  it("Tailwind'in kendi teması yüklenmez: hazır değişken yoktur", () => {
    const tamami = uygulama(["p-4", "bg-zemin"]);
    expect(tamami).not.toMatch(/--color-|--spacing:|--text-|--font-sans|--breakpoint-/);
  });

  it("her tasarım değerinin sınıfı vardır", () => {
    const beklenen = [
      ...renkAdlari.flatMap((ad) => [`bg-${ad}`, `text-${ad}`, `border-${ad}`]),
      ...golgeAdlari.map((ad) => `shadow-${ad}`),
      ...yaziTipiAdlari.map((ad) => `font-${ad}`),
      ...kalinlikAdlari.map((ad) => `font-${ad}`),
      ...yaziBoyuAdlari.map((ad) => `text-${ad}`),
      ...koseAdlari.map((ad) => `rounded-${ad}`),
      ...Object.keys(sabitDegerler.bosluklar).map((ad) => `p-${ad}`),
      ...Object.keys(sabitDegerler.genislikler).map((ad) => `max-w-${ad}`),
      ...Object.keys(sabitDegerler.katmanlar).map((ad) => `z-${ad}`),
      ...Object.keys(sabitDegerler.kirilmaNoktalari).map((ad) => `${ad}:p-4`),
    ];
    for (const derle of [uygulama, sahipPaneli]) {
      for (const sinif of beklenen) expect(uretir(derle, sinif), sinif).toBe(true);
    }
  });

  // Aynı önekle yazılan iki türün adı çakışırsa sınıf yalnız birini yazar: text-afis renk mi yazı boyu mu?
  it("aynı önekli değer türlerinin adları çakışmaz", () => {
    const ortak = (a: readonly string[], b: readonly string[]) => a.filter((ad) => b.includes(ad));
    expect(ortak(renkAdlari, yaziBoyuAdlari)).toEqual([]);
    expect(ortak(yaziTipiAdlari, kalinlikAdlari)).toEqual([]);
    expect(ortak(renkAdlari, golgeAdlari)).toEqual([]);
  });

  it.each<[string, (ad: string) => string, readonly string[], RegExp]>([
    ["renk", (ad) => `text-${ad}`, renkAdlari, /^color: var\(--renk-/],
    ["yazı boyu", (ad) => `text-${ad}`, yaziBoyuAdlari, /^font-size: var\(--yazi-boyu-/],
    ["yazı tipi", (ad) => `font-${ad}`, yaziTipiAdlari, /^font-family: var\(--yazi-tipi-/],
    ["kalınlık", (ad) => `font-${ad}`, kalinlikAdlari, /font-weight: var\(--kalinlik-/],
    ["gölge", (ad) => `shadow-${ad}`, golgeAdlari, /--tw-shadow: var\(--golge-/],
    ["köşe", (ad) => `rounded-${ad}`, koseAdlari, /^border-radius: var\(--kose-/],
  ])("her %s sınıfı kendi değişkenini yazar", (_tur, sinif, adlar, kalip) => {
    for (const ad of adlar) {
      const secici = sinif(ad);
      const kural = uygulama([secici]).match(new RegExp(`\\.${secici}\\s*\\{\\s*([^}]*)\\}`))?.[1];
      expect(kural, secici).toMatch(kalip);
    }
  });

  it("seçici denetimi yanılmaz: tanımlı sınıf bulunur, tanımsızı bulunmaz", () => {
    expect(uretir(uygulama, "tablet:p-4")).toBe(true);
    expect(uretir(uygulama, "text-tehlike-yazi")).toBe(true);
    expect(uretir(uygulama, "text-tehlike-yaz")).toBe(false);
  });

  it("kırılma noktaları tasarım değerlerindeki genişlikten başlar", () => {
    for (const [ad, genislik] of Object.entries(sabitDegerler.kirilmaNoktalari)) {
      expect(uygulama([`${ad}:p-4`])).toContain(`(width >= ${genislik})`);
    }
  });

  it("sınıfların okuduğu her değişken sayfaya yazılan CSS'te tanımlıdır", () => {
    const siniflar = [
      ...renkAdlari.map((ad) => `bg-${ad}`),
      ...golgeAdlari.map((ad) => `shadow-${ad}`),
      ...yaziTipiAdlari.map((ad) => `font-${ad}`),
      ...kalinlikAdlari.map((ad) => `font-${ad}`),
      ...yaziBoyuAdlari.map((ad) => `text-${ad}`),
      ...koseAdlari.map((ad) => `rounded-${ad}`),
    ];
    const okunan = new Set(
      [...uygulama(siniflar).matchAll(/var\((--[a-z0-9-]+)\)/g)]
        .map((e) => e[1])
        .filter((ad) => ad !== undefined && !ad.startsWith("--tw-")),
    );
    const tanimli = new Set(
      [...temaDegerleriCss(varsayilanTemaDegerleri).matchAll(/(--[a-z0-9-]+):/g)].map((e) => e[1]),
    );
    expect(okunan.size).toBeGreaterThan(renkAdlari.length);
    for (const ad of okunan) expect(tanimli.has(ad), ad).toBe(true);
  });

  it("form, vitrin ve panel stillerindeki her sınıf bir kural üretir", () => {
    const siniflar = [formStili, vitrinStili, panelStili].flatMap((stil) =>
      Object.values(stil).flatMap((deger) => deger.split(/\s+/)),
    );
    expect(siniflar.length).toBeGreaterThan(40);
    for (const sinif of siniflar) expect(uretir(uygulama, sinif), sinif).toBe(true);
  });
});
