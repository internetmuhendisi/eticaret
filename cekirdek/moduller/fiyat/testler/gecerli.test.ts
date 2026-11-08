// Geçerli fiyat işlevi (kart 0080, karar 0066): indirimden önce, sürerken ve sonra; başlangıç dahil,
// bitiş hariç; boş başlangıç ve bitiş; fiyatsız birim ve para birimi uyuşmazlığı.
import { describe, expect, it } from "vitest";
import { type Fiyat, gecerliFiyat } from "../gecerli.ts";

const baslangic = new Date("2026-11-09T21:00:00.000Z");
const bitis = new Date("2026-11-15T21:00:00.000Z");
const fiyat = (ek: Partial<Fiyat> = {}): Fiyat => ({
  birim: "birim",
  satisFiyati: 10_000,
  indirimliFiyat: 7_500,
  indirimBaslangici: baslangic,
  indirimBitisi: bitis,
  paraBirimi: "XTS",
  ...ek,
});
const once = (an: Date) => new Date(an.getTime() - 1);

describe("geçerli fiyat", () => {
  it.each([
    ["başlamadan bir milisaniye önce", once(baslangic), 10_000, false],
    ["başladığı anda", baslangic, 7_500, true],
    ["sürerken", new Date("2026-11-12T12:00:00.000Z"), 7_500, true],
    ["bitmeden bir milisaniye önce", once(bitis), 7_500, true],
    ["bittiği anda", bitis, 10_000, false],
    ["bittikten sonra", new Date("2027-01-01T00:00:00.000Z"), 10_000, false],
  ])("%s", (_ad, an, tutar, indirimde) => {
    expect(gecerliFiyat(fiyat(), an, "XTS")).toEqual({
      tutar,
      indirimde,
      paraBirimi: "XTS",
      satisFiyati: 10_000,
    });
  });

  it("boş başlangıç hemen, boş bitiş süresiz", () => {
    const acik = fiyat({ indirimBaslangici: null, indirimBitisi: null });
    expect(gecerliFiyat(acik, new Date(0), "XTS")?.tutar).toBe(7_500);
    expect(gecerliFiyat(acik, new Date("2100-01-01T00:00:00Z"), "XTS")?.tutar).toBe(7_500);
    expect(gecerliFiyat(fiyat({ indirimBaslangici: null }), once(bitis), "XTS")?.tutar).toBe(7_500);
    expect(gecerliFiyat(fiyat({ indirimBitisi: null }), once(baslangic), "XTS")?.tutar).toBe(
      10_000,
    );
  });

  it("indirimsiz fiyat ve sıfır satış fiyatı", () => {
    const indirimsiz = fiyat({
      indirimliFiyat: null,
      indirimBaslangici: null,
      indirimBitisi: null,
    });
    expect(gecerliFiyat(indirimsiz, baslangic, "XTS")).toMatchObject({
      tutar: 10_000,
      indirimde: false,
    });
    const ucretsiz = { ...indirimsiz, satisFiyati: 0 };
    expect(gecerliFiyat(ucretsiz, baslangic, "XTS")?.tutar).toBe(0);
  });

  it("fiyatı olmayan ya da başka para biriminde yazılmış birimin fiyatı yok", () => {
    expect(gecerliFiyat(undefined, baslangic, "XTS")).toBeUndefined();
    expect(gecerliFiyat(fiyat(), baslangic, "EUR")).toBeUndefined();
  });
});
