// Tasarım değerlerinin kontrastı (kart 0102, .claude/rules/erisilebilirlik.md). Her yazı-zemin çifti
// açık ve koyu temada en az 4,5:1, alan kenarı ve odak gibi işaretler en az 3:1'dir (WCAG 2.2 AA).
import { describe, expect, it } from "vitest";
import { isaretCiftleri, varsayilanTemaDegerleri, yaziCiftleri } from "../degerler.ts";
import { kontrastOrani } from "../kontrast.ts";

describe("kontrast oranı", () => {
  it("bilinen örneklerle aynıdır", () => {
    expect(kontrastOrani("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(kontrastOrani("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // WCAG'in sınır örneği: #767676 beyaz zeminde 4,54:1.
    expect(kontrastOrani("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
    expect(kontrastOrani("#FFFFFF", "#767676")).toBeCloseTo(4.54, 2);
  });

  it("biçimi bozuk rengi reddeder", () => {
    expect(() => kontrastOrani("#FFF", "#FFFFFF")).toThrow();
    expect(() => kontrastOrani("red", "#FFFFFF")).toThrow();
  });
});

describe("başlangıç tema değerlerinin kontrastı", () => {
  for (const tema of ["acik", "koyu"] as const) {
    const renkler = varsayilanTemaDegerleri.renkler[tema];
    it.each(yaziCiftleri)(`${tema}: %s yazısı %s zemininde en az 4,5:1`, (yazi, zemin) => {
      expect(kontrastOrani(renkler[yazi], renkler[zemin])).toBeGreaterThanOrEqual(4.5);
    });
    it.each(isaretCiftleri)(`${tema}: %s işareti %s zemininde en az 3:1`, (isaret, zemin) => {
      expect(kontrastOrani(renkler[isaret], renkler[zemin])).toBeGreaterThanOrEqual(3);
    });
  }
});
