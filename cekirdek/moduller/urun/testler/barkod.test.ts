// Barkodun biçimi ve kontrol hanesi (kart 0076). Geçerli örneklerin kontrol hanesi elle hesaplandı;
// her geçerli örneğin son hanesi değişince reddedildiği ayrıca denenir.
import { describe, expect, it } from "vitest";
import { barkoduDogrula } from "../barkod.ts";

const gecerliler = [
  ["GTIN-8", "96385074", "96385074"],
  ["GTIN-12 (UPC-A)", "036000291452", "036000291452"],
  ["GTIN-13 (EAN-13)", "4006381333931", "4006381333931"],
  ["ISBN-13", "978-0-306-40615-7", "9780306406157"],
  ["GTIN-14", "10012345678902", "10012345678902"],
  ["ISBN-10", "0-306-40615-2", "0306406152"],
  ["X ile biten ISBN-10", "0-8044-2957-x", "080442957X"],
  ["boşluklu", "4006381 333931", "4006381333931"],
] as const;

describe("barkod", () => {
  it.each(gecerliler)("%s geçer, saklanan biçim boşluksuz ve tiresiz", (_ad, barkod, saklanan) => {
    expect(barkoduDogrula(barkod)).toBe(saklanan);
  });

  it.each(gecerliler)("%s son hanesi değişince reddedilir", (_ad, _barkod, saklanan) => {
    const son = saklanan.at(-1);
    const baska = son === "1" ? "2" : "1";
    expect(barkoduDogrula(`${saklanan.slice(0, -1)}${baska}`)).toBeUndefined();
  });

  it.each([
    ["boş", ""],
    ["harf", "40063813339A1"],
    ["yedi hane", "1234565"],
    ["on bir hane", "12345678905"],
    ["on beş hane", "100123456789023"],
    ["X ile biten GTIN-13", "400638133393X"],
    ["ortada X", "03064X6152"],
  ])("%s reddedilir", (_ad, barkod) => {
    expect(barkoduDogrula(barkod)).toBeUndefined();
  });
});
