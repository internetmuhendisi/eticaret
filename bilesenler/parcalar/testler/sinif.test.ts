// Sınıf birleştirme tasarım değerlerinin adlarını tanır (kart 0103): aynı türden iki sınıftan sonra
// yazılan kalır, farklı türden iki sınıf (yazı boyu ile renk) birlikte kalır.
import { describe, expect, it } from "vitest";
import { sinif } from "../sinif.ts";

describe("sınıf birleştirme", () => {
  it.each([
    [["p-2", "p-4"], "p-4"],
    [["bg-zemin", "bg-yuzey"], "bg-yuzey"],
    [["text-yazi", "text-tehlike-yazi"], "text-tehlike-yazi"],
    [["text-kucuk", "text-govde"], "text-govde"],
    [["rounded-orta", "rounded-dugme"], "rounded-dugme"],
    [["shadow-kart", "shadow-pencere"], "shadow-pencere"],
    [["font-govde", "font-baslik"], "font-baslik"],
    [["font-normal", "font-kalin"], "font-kalin"],
    [["z-acilir", "z-pencere"], "z-pencere"],
    [["max-w-form", "max-w-metin"], "max-w-metin"],
    [["tablet:p-2", "tablet:p-4"], "tablet:p-4"],
    [["acik:bg-zemin", "acik:bg-yuzey"], "acik:bg-yuzey"],
  ])("%j → %s", (girdi, sonuc) => {
    expect(sinif(...girdi)).toBe(sonuc);
  });

  it.each([
    ["text-govde", "text-yazi"],
    ["text-baslik-2", "text-afis-ustu"],
    ["font-baslik", "font-baslik-kalinligi"],
    ["p-4", "tablet:p-6"],
    ["bg-zemin", "acik:bg-yuzey"],
  ])("%s ile %s birlikte kalır", (a, b) => {
    expect(sinif(a, b)).toBe(`${a} ${b}`);
  });

  it("boş ve koşullu değerleri atlar", () => {
    expect(sinif("p-4", false, undefined, null, { "bg-zemin": true, "bg-yuzey": false })).toBe(
      "p-4 bg-zemin",
    );
  });
});
