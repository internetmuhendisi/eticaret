// Posta adresi ve telefon şeması (kart 0071): il listesi olan ülkede il ve ilçe zorunlu ve tutarlı,
// posta kodu ülkenin biçiminde, eksik zorunlu alan reddedilir; hata iletisi koddur.
import { describe, expect, it } from "vitest";
import { adresHatalari, postaAdresiSemasi, telefonGecerliMi } from "../adres.ts";
import { bolgeHatalari, ilListesiVarMi, ulkeKodlari, ulkeninIlleri } from "../bolgeler.ts";
import trVerisi from "../tr.json" with { type: "json" };

const ulke = trVerisi.ulke;
const [birinciIl, ikinciIl] = ulkeninIlleri(ulke);
const ilce = birinciIl?.ilceler[0];
if (birinciIl === undefined || ikinciIl === undefined || ilce === undefined) {
  throw new Error("İl listesi boş.");
}
const listesiz = ulkeKodlari().find((kod) => !ilListesiVarMi(kod)) ?? "";

const gecerli = {
  ulke,
  il: birinciIl.kod,
  ilce: ilce.kod,
  adres: "Deneme Sokak No: 1",
  postaKodu: "01000",
};

// Şemanın verdiği hata kodları ve alanları.
const hatalar = (deger: unknown) => {
  const sonuc = postaAdresiSemasi.safeParse(deger);
  return sonuc.success
    ? []
    : sonuc.error.issues.map((sorun) => `${sorun.path.join(".")}:${sorun.message}`);
};

describe("posta adresi", () => {
  it("tutarlı adres geçer, il listesi olmayan ülkede il ve ilçe istenmez", () => {
    expect(hatalar(gecerli)).toEqual([]);
    expect(hatalar({ ulke: listesiz, adres: "1 Deneme Road", postaKodu: "SW1A 1AA" })).toEqual([]);
  });

  it("posta kodu biçimi bilinmeyen ülkede posta kodu boş kalabilir, bilinende zorunludur", () => {
    expect(hatalar({ ulke: listesiz, adres: "1 Deneme Road" })).toEqual([]);
    const { postaKodu: _, ...postaKodsuz } = gecerli;
    expect(hatalar(postaKodsuz)).toEqual(["postaKodu:posta-kodu-gerekli"]);
  });

  it("kodların başındaki ve sonundaki boşluk silinir", () => {
    const sonuc = postaAdresiSemasi.parse({
      ...gecerli,
      il: ` ${gecerli.il} `,
      ilce: `${gecerli.ilce} `,
    });
    expect([sonuc.il, sonuc.ilce]).toEqual([gecerli.il, gecerli.ilce]);
  });

  const bozuklar: [string, unknown, string[]][] = [
    [
      "ilsiz",
      { ...gecerli, il: undefined, ilce: undefined },
      ["il:il-gerekli", "ilce:ilce-gerekli"],
    ],
    ["ilçesiz", { ...gecerli, ilce: undefined }, ["ilce:ilce-gerekli"]],
    ["başka ilin ilçesi", { ...gecerli, il: ikinciIl.kod }, ["ilce:ilce-baska-ilin"]],
    ["olmayan il", { ...gecerli, il: `${ulke}-99` }, ["il:il-yok"]],
    ["olmayan ülke", { ...gecerli, ulke: "QQ" }, ["ulke:ulke-yok"]],
    ["dört haneli posta kodu", { ...gecerli, postaKodu: "0100" }, ["postaKodu:posta-kodu-bicimi"]],
  ];
  for (const [ad, deger, beklenen] of bozuklar) {
    it(`${ad} adres reddedilir`, () => {
      expect(hatalar(deger)).toEqual(beklenen);
    });
  }

  it("eksik zorunlu alan reddedilir", () => {
    for (const alan of ["ulke", "adres", "postaKodu"] as const) {
      const { [alan]: _, ...eksik } = gecerli;
      expect(
        hatalar(eksik).some((hata) => hata.startsWith(`${alan}:`)),
        alan,
      ).toBe(true);
    }
    expect(hatalar({ ...gecerli, adres: "   " }).some((h) => h.startsWith("adres:"))).toBe(true);
  });

  it("tanınmayan alan reddedilir", () => {
    expect(hatalar({ ...gecerli, mahalle: "Deneme" })).not.toEqual([]);
  });

  it("bölge ve adres hataları kayıtlı kodlardır", () => {
    const kodlar = new Set<string>([...bolgeHatalari, ...adresHatalari]);
    for (const [, deger] of bozuklar) {
      for (const hata of hatalar(deger)) expect(kodlar.has(hata.split(":")[1] ?? "")).toBe(true);
    }
  });
});

describe("telefon", () => {
  it("ülke koduyla yazılan numara geçer", () => {
    for (const telefon of [
      "+90 312 000 00 00",
      "+903120000000",
      "+90 (312) 000-00-00",
      "+49 30 1234567",
    ]) {
      expect(telefonGecerliMi(telefon), telefon).toBe(true);
    }
  });

  it("ülke kodu olmayan, harfli, çok kısa ya da çok uzun numara geçmez", () => {
    for (const telefon of [
      "0312 000 00 00",
      "+90 312 ABC",
      "+90 312",
      "+1234567890123456",
      "+0 312 000 00 00",
      "",
    ]) {
      expect(telefonGecerliMi(telefon), telefon).toBe(false);
    }
  });
});
