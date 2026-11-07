// Ülke, il ve ilçe listesi (kart 0070, karar 0056): sayılar kaynakla aynı, kodlar tekil ve biçimli,
// bölge doğrulaması tutarsız kodu reddeder, her ülke kodunun sitenin dilinde adı var.
import { describe, expect, it } from "vitest";
import { bicimleyiciOlustur } from "../../metinler/bicimleyici.ts";
import {
  bolgeyiDogrula,
  ilAdi,
  ilceAdi,
  ilinIlceleri,
  ilListesiVarMi,
  postaKoduGecerliMi,
  ulkeGecerliMi,
  ulkeKodlari,
  ulkeninIlleri,
} from "../bolgeler.ts";
import trVerisi from "../tr.json" with { type: "json" };
import ulkeVerisi from "../ulkeler.json" with { type: "json" };

const ulke = trVerisi.ulke;
const iller = ulkeninIlleri(ulke);
const ilceler = iller.flatMap((il) => il.ilceler);
const [birinciIl, ikinciIl] = iller;
if (birinciIl === undefined || ikinciIl === undefined) throw new Error("İl listesi boş.");
const [birinciIlce] = birinciIl.ilceler;
if (birinciIlce === undefined) throw new Error("İlçe listesi boş.");

describe("veri", () => {
  it("dosyalar kaynağını ve resmî olmadığını söyler", () => {
    expect(trVerisi.kaynak.resmi).toBe(false);
    expect(ulkeVerisi.kaynak.resmi).toBe(false);
    expect(trVerisi.kaynak.not).toContain("Resmî değil");
  });

  // Sayılar kaynakla karşılaştırıldı: derleme ve Vikipedi 81 il, 973 ilçe (922 ilçe ve büyükşehir
  // olmayan 51 ilin merkez ilçesi) veriyor (README.md).
  it("81 il ve 973 ilçe var", () => {
    expect(iller).toHaveLength(81);
    expect(ilceler).toHaveLength(973);
  });

  it("il kodları ISO 3166-2 biçiminde ve plaka sırasıyla 01'den 81'e", () => {
    expect(iller.map((il) => il.kod)).toEqual(
      Array.from({ length: 81 }, (_, i) => `${ulke}-${String(i + 1).padStart(2, "0")}`),
    );
  });

  it("her ilçenin kodu ilinin koduyla başlar, sıra numarası boşluksuz ve tekildir", () => {
    for (const il of iller) {
      expect(il.ilceler.map((ilce) => ilce.kod)).toEqual(
        il.ilceler.map((_, i) => `${il.kod}-${String(i + 1).padStart(3, "0")}`),
      );
    }
    expect(new Set(ilceler.map((ilce) => ilce.kod)).size).toBe(ilceler.length);
  });

  it("bir ilde aynı adda iki ilçe yok, her ad dolu", () => {
    for (const il of iller) {
      expect(il.ad.trim()).not.toBe("");
      const adlar = il.ilceler.map((ilce) => ilce.ad);
      expect(new Set(adlar).size, il.ad).toBe(adlar.length);
      for (const ad of adlar) expect(ad.trim()).toBe(ad);
    }
  });

  it("ülke kodları iki büyük harf, tekil ve harf sırasıyla; il listesi olan ülke listede", () => {
    const kodlar = ulkeKodlari();
    for (const kod of kodlar) expect(kod).toMatch(/^[A-Z]{2}$/);
    expect(new Set(kodlar).size).toBe(kodlar.length);
    expect(kodlar).toEqual(kodlar.toSorted());
    expect(ulkeGecerliMi(ulke)).toBe(true);
  });

  it("her ülke kodunun sitenin dilinde adı var", () => {
    const tr = bicimleyiciOlustur({
      dil: "tr",
      saatDilimi: "UTC",
      sayi: { binlikAyirici: ".", ondalikAyirici: "," },
      para: { simge: "x", simgeYeri: "sonda", simgeBoslugu: true, ondalikSayisi: 2 },
    });
    expect(ulkeKodlari().filter((kod) => tr.ulkeAdi(kod) === kod)).toEqual([]);
  });
});

describe("okuma", () => {
  it("il ve ilçe adları koddan bulunur", () => {
    expect(ilAdi(birinciIl.kod)).toBe(birinciIl.ad);
    expect(ilceAdi(birinciIlce.kod)).toBe(birinciIlce.ad);
    expect(ilinIlceleri(birinciIl.kod)).toEqual(birinciIl.ilceler);
    expect(ilAdi(`${ulke}-99`)).toBeUndefined();
    expect(ilceAdi(`${birinciIl.kod}-999`)).toBeUndefined();
  });

  it("il listesi olmayan ülke boş liste verir", () => {
    const listesiz = ulkeKodlari().find((kod) => !ilListesiVarMi(kod));
    if (listesiz === undefined) throw new Error("Her ülkenin il listesi var.");
    expect(ulkeninIlleri(listesiz)).toEqual([]);
    expect(ilListesiVarMi(ulke)).toBe(true);
  });
});

describe("bölge doğrulaması", () => {
  const listesiz = ulkeKodlari().find((kod) => !ilListesiVarMi(kod)) ?? "";

  it("tutarlı bölgeyi kabul eder", () => {
    expect(bolgeyiDogrula({ ulke })).toEqual({ gecerli: true });
    expect(bolgeyiDogrula({ ulke, il: birinciIl.kod })).toEqual({ gecerli: true });
    expect(bolgeyiDogrula({ ulke, il: birinciIl.kod, ilce: birinciIlce.kod })).toEqual({
      gecerli: true,
    });
    expect(bolgeyiDogrula({ ulke: listesiz })).toEqual({ gecerli: true });
  });

  const bozuklar: [string, Parameters<typeof bolgeyiDogrula>[0], string][] = [
    ["olmayan ülke", { ulke: "QQ" }, "ulke-yok"],
    ["küçük harfli ülke", { ulke: ulke.toLowerCase() }, "ulke-yok"],
    ["olmayan il", { ulke, il: `${ulke}-82` }, "il-yok"],
    ["il adı kod yerine", { ulke, il: birinciIl.ad }, "il-yok"],
    ["başka ülkenin ili", { ulke: listesiz, il: birinciIl.kod }, "il-baska-ulkenin"],
    ["olmayan ilçe", { ulke, il: birinciIl.kod, ilce: `${birinciIl.kod}-999` }, "ilce-yok"],
    ["başka ilin ilçesi", { ulke, il: ikinciIl.kod, ilce: birinciIlce.kod }, "ilce-baska-ilin"],
    ["ilsiz ilçe", { ulke, ilce: birinciIlce.kod }, "ilce-ilsiz"],
  ];
  for (const [ad, bolge, hata] of bozuklar) {
    it(`${ad} reddedilir`, () => {
      expect(bolgeyiDogrula(bolge)).toEqual({ gecerli: false, hata });
    });
  }

  it("bütün ilçeler kendi iliyle geçer, bir sonraki ille geçmez", () => {
    iller.forEach((il, sira) => {
      const sonraki = iller[(sira + 1) % iller.length];
      for (const ilce of il.ilceler) {
        expect(bolgeyiDogrula({ ulke, il: il.kod, ilce: ilce.kod }).gecerli).toBe(true);
        expect(bolgeyiDogrula({ ulke, il: sonraki?.kod, ilce: ilce.kod }).gecerli).toBe(false);
      }
    });
  });
});

describe("posta kodu", () => {
  it("biçimi bilinen ülkede biçime bakar", () => {
    expect(postaKoduGecerliMi(ulke, "34710")).toBe(true);
    for (const bozuk of ["3471", "347100", "3471A", " 34710", ""]) {
      expect(postaKoduGecerliMi(ulke, bozuk), bozuk).toBe(false);
    }
  });

  it("biçimi bilinmeyen ülkede boş olmayan her değer geçer", () => {
    const listesiz = ulkeKodlari().find((kod) => !ilListesiVarMi(kod)) ?? "";
    expect(postaKoduGecerliMi(listesiz, "SW1A 1AA")).toBe(true);
    expect(postaKoduGecerliMi(listesiz, "  ")).toBe(false);
  });
});
