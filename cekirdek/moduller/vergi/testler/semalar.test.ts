// Oranın yüzde metninden milyonda bir birimine kayıpsız çevrildiği ve her hata kodunun ekran metni
// olduğu (kart 0074). Veritabanı gerektirmez.
import { describe, expect, it } from "vitest";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import {
  oranSemasi,
  oranYuzdesi,
  tamOran,
  vergiHatalari,
  vergiHataMetinleri,
  yuzdedenOrana,
} from "../semalar.ts";

describe("oran birimi", () => {
  it("yüzde metni küsuratlı sayıya uğramadan milyonda bir birimine çevrilir", () => {
    expect(yuzdedenOrana("0")).toBe(0);
    expect(yuzdedenOrana("0.0001")).toBe(1);
    expect(yuzdedenOrana("7.5")).toBe(75_000);
    expect(yuzdedenOrana("7.50")).toBe(75_000);
    expect(yuzdedenOrana("7,5")).toBe(75_000);
    expect(yuzdedenOrana("18")).toBe(180_000);
    expect(yuzdedenOrana("33.3333")).toBe(333_333);
    expect(yuzdedenOrana("100")).toBe(tamOran);
    // Küsuratlı sayıyla çarpılsaydı 5699.999999999999 çıkardı.
    expect(yuzdedenOrana("0.57")).toBe(5_700);
  });

  it("biçim dışı metin çevrilmez", () => {
    for (const metin of [
      "",
      "18,5,1",
      "18.5,1",
      "-1",
      "1.23456",
      "1e2",
      " 18",
      "18.",
      ".5",
      "1000",
    ]) {
      expect(yuzdedenOrana(metin), metin).toBeUndefined();
    }
  });

  it("milyonda bir biriminden yüzde metnine ve geri aynı değer döner", () => {
    for (let oran = 0; oran <= tamOran; oran += 997) {
      expect(yuzdedenOrana(oranYuzdesi(oran))).toBe(oran);
    }
    expect(oranYuzdesi(75_000)).toBe("7.5");
    expect(oranYuzdesi(1)).toBe("0.0001");
    expect(oranYuzdesi(tamOran)).toBe("100");
  });

  it("şema yüzde yüzden büyük oranı ve sayıyı reddeder, kenar boşluğunu siler", () => {
    expect(oranSemasi.safeParse(" 18 ").data).toBe(180_000);
    expect(oranSemasi.safeParse("100.0001").error?.issues[0]?.message).toBe("oran-siniri");
    expect(oranSemasi.safeParse("18,5").data).toBe(185_000);
    expect(oranSemasi.safeParse("on sekiz").error?.issues[0]?.message).toBe("oran-bicimi");
    expect(oranSemasi.safeParse(18).success).toBe(false);
  });
});

describe("hata metinleri", () => {
  it("her hata kodunun Türkçe metni var", () => {
    const metin = metinOkuyucu("tr");
    for (const kod of vergiHatalari) {
      expect(metin(vergiHataMetinleri[kod]).length).toBeGreaterThan(10);
    }
  });
});
