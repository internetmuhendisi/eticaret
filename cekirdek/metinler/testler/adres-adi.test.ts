// Addan üretilen adres adı (kart 0076). Deneme adları bilerek genel sözcüklerdir.
import { describe, expect, it } from "vitest";
import { adresAdiKalibi, adresAdiUret, adresAdiUzunlugu } from "../adres-adi.ts";

describe("adres adı üretimi", () => {
  it.each([
    ["Çiçekli Şal", "cicekli-sal"],
    ["İĞNE ÖRGÜSÜ Işık", "igne-orgusu-isik"],
    ["Crème brûlée", "creme-brulee"],
    ["Straße Øl Łódź", "strasse-ol-lodz"],
    ["  --Kahve & Çay %100--  ", "kahve-cay-100"],
    ["Ürün (2. el)", "urun-2-el"],
  ])("%s → %s", (ad, beklenen) => {
    expect(adresAdiUret(ad)).toBe(beklenen);
    expect(adresAdiKalibi.test(beklenen)).toBe(true);
  });

  it("Latin dışı yazıdan bir şey kalmazsa boş döner", () => {
    expect(adresAdiUret("茶")).toBe("");
    expect(adresAdiUret("!!!")).toBe("");
  });

  it("uzun ad sınırda kesilir, sonunda tire kalmaz", () => {
    const uretilen = adresAdiUret(`${"a".repeat(adresAdiUzunlugu - 1)} b`);
    expect(uretilen.length).toBeLessThanOrEqual(adresAdiUzunlugu);
    expect(adresAdiKalibi.test(uretilen)).toBe(true);
  });
});
