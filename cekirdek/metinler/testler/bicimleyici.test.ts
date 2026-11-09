import { describe, expect, it } from "vitest";
import { type BicimAyarlari, bicimleyiciOlustur, yerelZamandan } from "../bicimleyici";

// Türkiye'nin biçimi (planlar/site-ayarlari.md): binlikte nokta, ondalıkta virgül, simge sonda,
// Europe/Istanbul. Çekirdekte bir sitenin para simgesi yazmaz (cekirdek/testler/para-simgesi-yok.test.ts):
// simge yerine "¤" kullanılır.
const turkiye: BicimAyarlari = {
  dil: "tr",
  saatDilimi: "Europe/Istanbul",
  sayi: { binlikAyirici: ".", ondalikAyirici: "," },
  para: { paraBirimi: "XTS", simge: "¤", simgeYeri: "sonda", simgeBoslugu: true, ondalikSayisi: 2 },
};

const bicim = bicimleyiciOlustur(turkiye);

describe("para", () => {
  it("tutarı binlikte nokta, ondalıkta virgül ve simge sonda yazar", () => {
    expect(bicim.para(124700)).toBe("1.247,00 ¤");
    expect(bicim.para(123456)).toBe("1.234,56 ¤");
  });

  it("büyük, küçük ve sıfır tutarları doğru yazar", () => {
    expect(bicim.para(123456789)).toBe("1.234.567,89 ¤");
    expect(bicim.para(5)).toBe("0,05 ¤");
    expect(bicim.para(0)).toBe("0,00 ¤");
  });

  it("eksi tutarı eksi işaretiyle yazar", () => {
    expect(bicim.para(-124700)).toBe("-1.247,00 ¤");
  });

  it("simgenin yerini ve ayırıcıları ayardan alır", () => {
    const basta = bicimleyiciOlustur({
      ...turkiye,
      dil: "en",
      sayi: { binlikAyirici: ",", ondalikAyirici: "." },
      para: {
        paraBirimi: "XTS",
        simge: "$",
        simgeYeri: "basta",
        simgeBoslugu: false,
        ondalikSayisi: 2,
      },
    });
    expect(basta.para(124700)).toBe("$1,247.00");
  });

  it("simge yazılmazsa para biriminin sitenin dilindeki simgesi kullanılır", () => {
    const simgesiz = (dil: string, paraBirimi: string) =>
      bicimleyiciOlustur({
        ...turkiye,
        dil,
        para: { ...turkiye.para, paraBirimi, simge: undefined },
      });
    expect(simgesiz("en", "USD").para(100)).toBe("1,00 $");
    expect(simgesiz("de", "EUR").para(100)).toBe("1,00 €");
    // Dil verisinde simgesi olmayan kod kendisi olarak yazılır.
    expect(simgesiz("tr", "XTS").para(100)).toBe("1,00 XTS");
  });

  it("en küçük birimde tam sayı olmayan tutarı reddeder", () => {
    expect(() => bicim.para(12.5)).toThrow();
  });
});

describe("para aralığı", () => {
  it("simge bir kez, simgenin yerindeki uçta", () => {
    expect(bicim.paraAraligi(29_990, 32_990, " – ")).toBe("299,90 – 329,90 ¤");
    const basta = bicimleyiciOlustur({
      ...turkiye,
      para: { ...turkiye.para, simgeYeri: "basta", simgeBoslugu: false },
    });
    expect(basta.paraAraligi(29_990, 123_456, " – ")).toBe("¤299,90 – 1.234,56");
  });
});

describe("sayı", () => {
  it("binlik ve ondalık ayırıcıyı ayardan alır", () => {
    expect(bicim.sayi(1247)).toBe("1.247");
    expect(bicim.sayi(1234.567, 2)).toBe("1.234,57");
  });
});

// Kart 0109: indirim rozetinin oranı ve "%30'a varan" eki.
describe("yüzde ve yönelme eki", () => {
  it("yüzde işareti dilin yerinde, tam sayı", () => {
    expect(bicim.yuzde(23)).toBe("%23");
    expect(bicimleyiciOlustur({ ...turkiye, dil: "en" }).yuzde(23)).toBe("23%");
  });

  it.each([
    [1, "'e"],
    [2, "'ye"],
    [6, "'ya"],
    [9, "'a"],
    [10, "'a"],
    [20, "'ye"],
    [23, "'e"],
    [25, "'e"],
    [30, "'a"],
    [40, "'a"],
    [46, "'ya"],
    [50, "'ye"],
    [60, "'a"],
    [70, "'e"],
    [80, "'e"],
    [90, "'a"],
    [99, "'a"],
    [100, "'e"],
    [300, "'e"],
    [1000, "'e"],
    [5000, "'e"],
    [1_000_000, "'a"],
    [2_000_000, "'a"],
    [1_001_000, "'e"],
    [1_000_000_000, "'a"],
  ])("Türkçede %i sayısının yönelme eki %s", (sayi, ek) => {
    expect(bicim.yonelmeEki(sayi)).toBe(ek);
  });

  it("eki olmayan dilde ek boştur", () => {
    expect(bicimleyiciOlustur({ ...turkiye, dil: "en" }).yonelmeEki(30)).toBe("");
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

describe("ülke adı", () => {
  it("ülke kodunu sitenin dilinde adlandırır", () => {
    expect(bicim.ulkeAdi("TR")).toBe("Türkiye");
    expect(bicim.ulkeAdi("DE")).toBe("Almanya");
    expect(bicimleyiciOlustur({ ...turkiye, dil: "en" }).ulkeAdi("DE")).toBe("Germany");
  });

  it("tanınmayan ya da biçimi bozuk kodu olduğu gibi döndürür, hata vermez", () => {
    for (const kod of ["QQ", "", "T", "TUR", "X1"]) expect(bicim.ulkeAdi(kod)).toBe(kod);
  });
});

// Kart 0076: zamanlanmış ürünün yayın zamanı sitenin saat diliminde yazılır.
describe("yerel zamandan an", () => {
  it.each([
    ["Europe/Istanbul", "2026-11-08T09:30", "2026-11-08T06:30:00.000Z"],
    ["UTC", "2026-11-08T09:30", "2026-11-08T09:30:00.000Z"],
    ["America/New_York", "2026-07-01T00:00", "2026-07-01T04:00:00.000Z"],
    ["America/New_York", "2026-01-01T00:00", "2026-01-01T05:00:00.000Z"],
    ["Asia/Kolkata", "2026-03-01T12:00", "2026-03-01T06:30:00.000Z"],
    ["Europe/Berlin", "2026-12-31T23:59", "2026-12-31T22:59:00.000Z"],
  ])("%s %s → %s", (saatDilimi, yerel, an) => {
    expect(yerelZamandan(yerel, saatDilimi)?.toISOString()).toBe(an);
  });

  it("yaz saatine geçişte atlanan saat yok sayılır", () => {
    // Berlin 2026-03-29: 02:00'den 03:00'e atlanır.
    expect(yerelZamandan("2026-03-29T02:30", "Europe/Berlin")).toBeUndefined();
    expect(yerelZamandan("2026-03-29T03:00", "Europe/Berlin")?.toISOString()).toBe(
      "2026-03-29T01:00:00.000Z",
    );
  });

  it("saat geri alınırken iki kez yaşanan saatte önceki an seçilir", () => {
    // Berlin 2026-10-25: 03:00'te 02:00'ye dönülür, 02:30 iki kez yaşanır.
    expect(yerelZamandan("2026-10-25T02:30", "Europe/Berlin")?.toISOString()).toBe(
      "2026-10-25T00:30:00.000Z",
    );
  });

  it.each([
    ["takvimde olmayan gün", "2026-02-30T10:00"],
    ["saniyeli", "2026-11-08T09:30:00"],
    ["saat dilimli", "2026-11-08T09:30Z"],
    ["boş", ""],
    ["25. saat", "2026-11-08T25:00"],
  ])("%s reddedilir", (_ad, yerel) => {
    expect(yerelZamandan(yerel, "Europe/Istanbul")).toBeUndefined();
  });
});
