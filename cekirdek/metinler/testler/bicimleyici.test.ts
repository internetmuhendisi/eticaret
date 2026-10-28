import { describe, expect, it } from "vitest";
import { type BicimAyarlari, bicimleyiciOlustur } from "../bicimleyici";

// Türkiye'nin varsayılan biçimi (planlar/site-ayarlari.md): 1.234,56 ₺, Europe/Istanbul.
const turkiye: BicimAyarlari = {
  dil: "tr",
  saatDilimi: "Europe/Istanbul",
  sayi: { binlikAyirici: ".", ondalikAyirici: "," },
  para: { simge: "₺", simgeYeri: "sonda", simgeBoslugu: true, ondalikSayisi: 2 },
};

const bicim = bicimleyiciOlustur(turkiye);

describe("para", () => {
  it("Türk lirasını binlikte nokta, ondalıkta virgül ve simge sonda yazar", () => {
    expect(bicim.para(124700)).toBe("1.247,00 ₺");
    expect(bicim.para(123456)).toBe("1.234,56 ₺");
  });

  it("büyük, küçük ve sıfır tutarları doğru yazar", () => {
    expect(bicim.para(123456789)).toBe("1.234.567,89 ₺");
    expect(bicim.para(5)).toBe("0,05 ₺");
    expect(bicim.para(0)).toBe("0,00 ₺");
  });

  it("eksi tutarı eksi işaretiyle yazar", () => {
    expect(bicim.para(-124700)).toBe("-1.247,00 ₺");
  });

  it("simgenin yerini ve ayırıcıları ayardan alır", () => {
    const basta = bicimleyiciOlustur({
      ...turkiye,
      dil: "en",
      sayi: { binlikAyirici: ",", ondalikAyirici: "." },
      para: { simge: "$", simgeYeri: "basta", simgeBoslugu: false, ondalikSayisi: 2 },
    });
    expect(basta.para(124700)).toBe("$1,247.00");
  });

  it("en küçük birimde tam sayı olmayan tutarı reddeder", () => {
    expect(() => bicim.para(12.5)).toThrow();
  });
});

describe("sayı", () => {
  it("binlik ve ondalık ayırıcıyı ayardan alır", () => {
    expect(bicim.sayi(1247)).toBe("1.247");
    expect(bicim.sayi(1234.567, 2)).toBe("1.234,57");
  });
});

describe("tarih", () => {
  it("tarihi mağazanın saat dilimine göre yazar", () => {
    // UTC'de 28 Ekim 21:30, İstanbul'da 29 Ekim 00:30.
    const an = new Date("2026-10-28T21:30:00Z");
    expect(bicim.tarih(an)).toBe("29.10.2026");
    expect(bicim.tarihSaat(an)).toBe("29.10.2026 00:30");
  });
});
