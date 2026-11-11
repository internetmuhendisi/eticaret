// Ürün listesinin adresteki durumu (kart 0136): okuma ve yazma birbirinin tersidir; sıra sabittir; tanınmayan
// parametre, tanınmayan sıralama ve geçersiz sayfa yok sayılır; varsayılan sıralama yazılmaz; filtre ya da
// sıralama değişince sayfa başa döner; "temizle" sıralamayı korur; filtre ya da sıralama varsa dizine girmez.
import { describe, expect, it } from "vitest";
import { adrestenDurum, durumdanSorgu, durumuDegistir, filtreliMi } from "../urun-listesi/adres.ts";

describe("adresteki durum", () => {
  it("okunan durum aynı adresi verir; sıra sabittir", () => {
    const durum = adrestenDurum({
      sayfa: "3",
      "secenek-renk": ["siyah", "beyaz"],
      marka: ["b", "a", "a"],
      "en-cok": " 1.000,50 ",
      stok: "var",
      "ozellik-kumas": "pamuk",
      "secenek-beden": "m",
      sirala: "fiyat-artan",
    });
    expect(durum).toEqual({
      fiyatYazisi: { enCok: "1.000,50" },
      markalar: ["b", "a"],
      secenekler: { beden: ["m"], renk: ["siyah", "beyaz"] },
      ozellikler: { kumas: ["pamuk"] },
      stoktakiler: true,
      siralama: "fiyat-artan",
      sayfa: 3,
    });
    const sorgu = durumdanSorgu(durum, "onerilen");
    expect(sorgu).toBe(
      "?en-cok=1.000%2C50&marka=b&marka=a&secenek-beden=m&secenek-renk=siyah&secenek-renk=beyaz&ozellik-kumas=pamuk&stok=var&sirala=fiyat-artan&sayfa=3",
    );
    expect(adrestenDurum(Object.fromEntries(new URLSearchParams(sorgu)))).toMatchObject({
      sayfa: 3,
      siralama: "fiyat-artan",
    });
  });

  it("tanınmayan parametre, sıralama, boş değer ve geçersiz sayfa yok sayılır", () => {
    const durum = adrestenDurum({
      baska: "x",
      sirala: "ucuz",
      sayfa: "-2",
      "en-az": "",
      "secenek-": "m",
      stok: "evet",
    });
    expect(durum).toEqual({
      fiyatYazisi: {},
      markalar: [],
      secenekler: {},
      ozellikler: {},
      stoktakiler: false,
      sayfa: 1,
    });
    expect(filtreliMi(durum)).toBe(false);
    expect(durumdanSorgu(durum, "onerilen")).toBe("");
    for (const sayfa of ["1.5", "abc", "1e3", "0x10", "0", "+2", " 2"])
      expect(adrestenDurum({ sayfa }).sayfa).toBe(1);
  });

  it("varsayılan sıralama adrese yazılmaz; sıralama ya da filtre varsa dizine girmez", () => {
    expect(durumdanSorgu(adrestenDurum({ sirala: "onerilen" }), "onerilen")).toBe("");
    expect(durumdanSorgu(adrestenDurum({ sirala: "onerilen" }), "en-yeni")).toBe(
      "?sirala=onerilen",
    );
    expect(filtreliMi(adrestenDurum({ sirala: "en-yeni" }))).toBe(true);
    expect(filtreliMi(adrestenDurum({ sayfa: "2" }))).toBe(false);
    expect(filtreliMi(adrestenDurum({ marka: "a" }))).toBe(true);
  });
});

describe("nesnenin kalıtılmış alanları", () => {
  it('"constructor" ve "__proto__" grubu çökertmez, kendi alanı olarak okunur ve yazılır', () => {
    for (const anahtar of ["constructor", "__proto__"]) {
      const okunan = adrestenDurum({ [`ozellik-${anahtar}`]: "x" });
      expect(Object.hasOwn(okunan.ozellikler, anahtar)).toBe(true);
      const bos = adrestenDurum({});
      const eklenen = durumuDegistir(bos, { tur: "ozellik", anahtar, deger: "x", secili: true });
      expect(Object.hasOwn(eklenen.ozellikler, anahtar)).toBe(true);
      expect(
        durumuDegistir(eklenen, { tur: "ozellik", anahtar, deger: "x", secili: false }).ozellikler,
      ).toEqual({});
      expect(durumdanSorgu(eklenen, "onerilen")).toBe(`?ozellik-${anahtar}=x`);
    }
  });
});

describe("değişiklikler", () => {
  const durum = adrestenDurum({ marka: "a", "secenek-beden": "m", sirala: "en-yeni", sayfa: "4" });

  it("seçim eklenir ve kaldırılır, sayfa başa döner; boş kalan grup düşer", () => {
    expect(durumuDegistir(durum, { tur: "marka", deger: "b", secili: true })).toMatchObject({
      markalar: ["a", "b"],
      sayfa: 1,
    });
    expect(
      durumuDegistir(durum, { tur: "secenek", anahtar: "beden", deger: "m", secili: false })
        .secenekler,
    ).toEqual({});
    expect(
      durumuDegistir(durum, { tur: "ozellik", anahtar: "kumas", deger: "keten", secili: true })
        .ozellikler,
    ).toEqual({ kumas: ["keten"] });
    expect(durumuDegistir(durum, { tur: "stok", secili: true }).stoktakiler).toBe(true);
    expect(durumuDegistir(durum, { tur: "sirala", siralama: "fiyat-azalan" })).toMatchObject({
      siralama: "fiyat-azalan",
      sayfa: 1,
    });
  });

  it("fiyat yazıldığı gibi girer, boş yazılış kaldırır; temizle sıralamayı korur", () => {
    expect(durumuDegistir(durum, { tur: "fiyat", enAz: " 100 ", enCok: "" }).fiyatYazisi).toEqual({
      enAz: "100",
    });
    expect(
      durumuDegistir(adrestenDurum({ "en-az": "5" }), { tur: "fiyat-kaldir" }).fiyatYazisi,
    ).toEqual({});
    expect(durumdanSorgu(durumuDegistir(durum, { tur: "temizle" }), "onerilen")).toBe(
      "?sirala=en-yeni",
    );
  });
});
