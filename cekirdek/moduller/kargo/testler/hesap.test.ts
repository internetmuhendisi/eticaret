// Kargo hesabı (kart 0212, karar 0135): kargo gerektirmeyen sepet, ücretsiz kargo (0 ücret), sınırın eşitte
// geçmesi, sınırın indirimden önceki ve sonraki tutarla karşılaştırılması, sınırsız ücret ve sınıra kalan tutar.
import { describe, expect, it } from "vitest";
import { type KargoAyarlari, type KargoKalemi, kargoHesapla } from "../hesap.ts";

const ayar = (ek: Partial<KargoAyarlari> = {}): KargoAyarlari => ({
  kargoUcreti: 5_990,
  ucretsizKargoTutari: "indirimden-sonra",
  ...ek,
});
const kalem = (tutar: number, ek: Partial<KargoKalemi> = {}): KargoKalemi => ({
  tutar,
  indirimsizTutar: tutar,
  kargoGerekmez: false,
  ...ek,
});

describe("kargo hesabı", () => {
  it("kargo gerektiren ürün yoksa kargo yoktur, ücret ne olursa olsun", () => {
    expect(kargoHesapla(ayar(), [kalem(1_000, { kargoGerekmez: true })])).toEqual({ tur: "yok" });
    expect(kargoHesapla(ayar(), [])).toEqual({ tur: "yok" });
  });

  it("ücret 0 ise kargo ücretsizdir", () => {
    expect(kargoHesapla(ayar({ kargoUcreti: 0 }), [kalem(1_000)])).toEqual({ tur: "ucretsiz" });
  });

  it("sınır yoksa ücret her zaman alınır, sınıra kalan yazılmaz", () => {
    expect(kargoHesapla(ayar(), [kalem(10_000_000)])).toEqual({ tur: "ucretli", tutar: 5_990 });
  });

  it("sınıra eşit ya da büyük sepet ücretsizdir; altında ücret ve sınıra kalan tutar", () => {
    const sinirli = ayar({ ucretsizKargoSiniri: 75_000 });
    expect(kargoHesapla(sinirli, [kalem(50_000), kalem(25_000)])).toEqual({ tur: "ucretsiz" });
    expect(kargoHesapla(sinirli, [kalem(74_999)])).toEqual({
      tur: "ucretli",
      tutar: 5_990,
      siniraKalan: 1,
    });
  });

  it("kargo gerektirmeyen ürün sınırın tutarına girer", () => {
    const sinirli = ayar({ ucretsizKargoSiniri: 10_000 });
    expect(kargoHesapla(sinirli, [kalem(6_000), kalem(4_000, { kargoGerekmez: true })])).toEqual({
      tur: "ucretsiz",
    });
  });

  it("sınır ayara göre indirimden sonraki ya da önceki tutarla karşılaştırılır", () => {
    const indirimli = [kalem(20_000, { indirimsizTutar: 30_000 })];
    expect(kargoHesapla(ayar({ ucretsizKargoSiniri: 25_000 }), indirimli)).toMatchObject({
      tur: "ucretli",
      siniraKalan: 5_000,
    });
    expect(
      kargoHesapla(
        ayar({ ucretsizKargoSiniri: 25_000, ucretsizKargoTutari: "indirimden-once" }),
        indirimli,
      ),
    ).toEqual({ tur: "ucretsiz" });
  });
});
