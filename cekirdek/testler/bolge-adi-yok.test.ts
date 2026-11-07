// Kodda ülke ya da il adı yazı olarak geçmez (kart 0070, karar 0056, .claude/rules/e-ticaret-is-kurallari.md:
// "çekirdekte bir ülke sabit yazılmaz"). Adlar bölge verisinden ve biçimleyiciden gelir. Ülke adları
// Türkçe ve İngilizce aranır. Veri dosyaları, metin dosyaları, belgeler ve testler taranmaz.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { ulkeKodlari, ulkeninIlleri } from "../bolgeler/bolgeler.ts";
import { bicimleyiciOlustur } from "../metinler/bicimleyici.ts";

const kok = join(import.meta.dirname, "..", "..");
const atlananlar = new Set(["node_modules", ".next", "test-results", "testler"]);

const dosyalar = (klasor: string): string[] =>
  existsSync(klasor)
    ? readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
        if (atlananlar.has(girdi.name)) return [];
        const yol = join(klasor, girdi.name);
        if (girdi.isDirectory()) return dosyalar(yol);
        return /\.(ts|tsx|mts)$/.test(girdi.name) ? [yol] : [];
      })
    : [];

const bicim = (dil: string) =>
  bicimleyiciOlustur({
    dil,
    saatDilimi: "UTC",
    sayi: { binlikAyirici: ".", ondalikAyirici: "," },
    para: { simge: "x", simgeYeri: "sonda", simgeBoslugu: true, ondalikSayisi: 2 },
  });

const adlar = [
  ...ulkeKodlari().flatMap((kod) => [bicim("tr").ulkeAdi(kod), bicim("en").ulkeAdi(kod)]),
  ...ulkeKodlari().flatMap((kod) => ulkeninIlleri(kod).map((il) => il.ad)),
];

const kacir = (metin: string) => metin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const kalip = new RegExp(`["'\`](?:${adlar.map(kacir).join("|")})["'\`]`, "u");

// Ad, tırnak içinde tek başına yazılmış bir metin olarak geçiyorsa yakalanır; yorumlar ve
// cümle içindeki geçişler (örneğin "Europe/Istanbul") yakalanmaz.
const adGecenler = (metinler: { ad: string; icerik: string }[]): string[] =>
  metinler.filter(({ icerik }) => kalip.test(icerik)).map(({ ad }) => ad);

describe("kodda bölge adı", () => {
  it("aranacak adlar dolu: bütün ülkeler iki dilde ve bütün iller", () => {
    expect(adlar.length).toBeGreaterThan(ulkeKodlari().length * 2);
  });

  it("çekirdekte, bileşenlerde, sahip panelinde ve komutlarda ülke ya da il adı geçmez", () => {
    const taranan = ["cekirdek", "bilesenler", "sahip-paneli", "komutlar"]
      .flatMap((klasor) => dosyalar(join(kok, klasor)))
      .map((yol) => ({ ad: relative(kok, yol), icerik: readFileSync(yol, "utf8") }));
    expect(taranan.length).toBeGreaterThan(50);
    expect(adGecenler(taranan)).toEqual([]);
  });

  it("kontrol bozuk örnekleri yakalar, cümle içindeki adı yakalamaz", () => {
    const [il] = ulkeninIlleri("TR");
    if (il === undefined) throw new Error("İl listesi boş.");
    const ornekler = [
      { ad: "il.ts", icerik: `const il = "${il.ad}";` },
      { ad: "ulke.ts", icerik: `if (ulke === '${bicim("tr").ulkeAdi("DE")}') {}` },
      { ad: "ingilizce.ts", icerik: `const ad = \`${bicim("en").ulkeAdi("DE")}\`;` },
      { ad: "cumle.ts", icerik: `const saat = "Europe/Istanbul"; // ${il.ad}` },
    ];
    expect(adGecenler(ornekler)).toEqual(["il.ts", "ulke.ts", "ingilizce.ts"]);
  });
});
