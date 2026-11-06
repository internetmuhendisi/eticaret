// İzinlerin ve rollerin belgesi kayıtla birebir aynı (kart 0026). Veritabanı gerektirmez.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { izinler, modulIzinleri } from "../../../kayitlar/izinler.ts";
import { baslangicRolleri } from "../baslangic-rolleri.ts";

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
