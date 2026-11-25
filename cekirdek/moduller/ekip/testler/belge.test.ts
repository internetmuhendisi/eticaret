// İzinlerin ve rollerin belgesi kayıtla birebir aynı (kart 0026). Veritabanı gerektirmez.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { izinler, modulIzinleri } from "../../../kayitlar/izinler.ts";
import { baslangicRolleri } from "../baslangic-rolleri.ts";

const metinler = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../metinler/tr.json"), "utf8"),
) as Record<string, unknown>;
// Noktalı anahtarın metni (yoksa undefined).
const metinVar = (anahtar: string): boolean => {
  let yer: unknown = metinler;
  for (const parca of anahtar.split(".")) {
    if (typeof yer !== "object" || yer === null) return false;
    yer = (yer as Record<string, unknown>)[parca];
  }
  return typeof yer === "string";
};

const belge = readFileSync(join(import.meta.dirname, "..", "izinler-ve-roller.md"), "utf8");
const satirlar = (baslik: string): string[][] =>
  (belge.split(`## ${baslik}\n`)[1]?.split("\n## ")[0] ?? "")
    .split("\n")
    .filter((satir) => satir.startsWith("| `"))
    .map((satir) =>
      satir
        .split("|")
        .slice(1, -1)
        .map((hucre) => hucre.trim().replaceAll("`", "")),
    );

describe("izin kaydı", () => {
  it("her izin kendi modülünün adıyla başlar, iki modül aynı adı kullanamaz", () => {
    const hepsi = Object.entries(modulIzinleri).flatMap(([modul, liste]) =>
      Object.keys(liste).map((ad) => {
        expect(ad.startsWith(`${modul}.`)).toBe(true);
        return ad;
      }),
    );
    expect(hepsi.toSorted()).toEqual(Object.keys(izinler).toSorted());
  });
});

// Panelin roller tablosu her yönetici iznini ve modülünü adıyla yazar (kart 0274); anahtar çalışma anında kurulduğu
// için tür kontrolü eksik metni yakalamaz (kart 0275'te eksik metin tabloyu düşürdü, tarayıcı testinde bulundu).
describe("izinlerin panel metinleri", () => {
  it("her yönetici izninin ve modülünün adı metin dosyasında var", () => {
    const yoneticiModulleri = Object.entries(modulIzinleri).filter(([, liste]) =>
      Object.values(liste).some((tanim) => tanim.giris === "yonetici"),
    );
    const eksik = [
      ...yoneticiModulleri
        .map(([modul]) => `yonetim.izinGrubu.${modul}`)
        .filter((anahtar) => !metinVar(anahtar)),
      ...Object.entries(izinler)
        .filter(([, tanim]) => tanim.giris === "yonetici")
        .map(([ad]) => `yonetim.izin.${ad}`)
        .filter((anahtar) => !metinVar(anahtar)),
    ];
    expect(eksik).toEqual([]);
  });
});

describe("belge", () => {
  it("izin listesi kayıtla aynı", () => {
    expect(satirlar("İzinler").map(([ad, giris, kapsam]) => [ad, giris, kapsam])).toEqual(
      Object.entries(izinler).map(([ad, { giris, kapsam }]) => [ad, giris, kapsam]),
    );
  });

  it("rol listesi kayıtla aynı", () => {
    expect(satirlar("Roller").map(([kod, , izin]) => [kod, izin])).toEqual(
      Object.entries(baslangicRolleri).map(([kod, { tamYetki, izinler: liste }]) => [
        kod,
        tamYetki ? "bütün yönetici izinleri" : liste.join(", "),
      ]),
    );
  });
});
