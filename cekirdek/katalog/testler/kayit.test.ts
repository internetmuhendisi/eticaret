// Katalogun adresteki seçimi (kart 0104): tanınmayan değer yok sayılır, adres yalnız seçileni taşır.
import { describe, expect, it } from "vitest";
import { katalogParcalari, katalogSecimi, secimAdresi } from "../kayit.ts";

describe("katalog seçimi", () => {
  it("varsayılan: cihazın rengi, tam genişlik, çerçevesiz", () => {
    expect(katalogSecimi({})).toEqual({ renk: "cihaz", genislik: "tam", cerceve: false });
  });

  it("tanınmayan ve kalıtılmış adlar yok sayılır", () => {
    expect(katalogSecimi({ renk: "kirmizi", genislik: "toString", cerceve: "evet" })).toEqual({
      renk: "cihaz",
      genislik: "tam",
      cerceve: false,
    });
    expect(katalogSecimi({ renk: "constructor", genislik: "hasOwnProperty" })).toEqual({
      renk: "cihaz",
      genislik: "tam",
      cerceve: false,
    });
  });

  it("seçim adrese yazılır ve geri okunur", () => {
    const secim = { renk: "koyu", genislik: "telefon", cerceve: true } as const;
    const adres = secimAdresi("/gelistirme/bilesenler/dugme", secim);
    expect(adres).toBe("/gelistirme/bilesenler/dugme?renk=koyu&genislik=telefon&cerceve=1");
    const parametreler = Object.fromEntries(new URL(adres, "http://x").searchParams);
    expect(katalogSecimi(parametreler)).toEqual(secim);
    expect(secimAdresi("/a", { renk: "cihaz", genislik: "tam", cerceve: false })).toBe("/a");
  });

  it("parça kodları tekil ve dosya adıyla aynı", () => {
    const kodlar = katalogParcalari.map((p) => p.kod);
    expect(new Set(kodlar).size).toBe(kodlar.length);
    for (const { kod, dosya } of katalogParcalari) expect(dosya.endsWith(`/${kod}.tsx`)).toBe(true);
  });
});
