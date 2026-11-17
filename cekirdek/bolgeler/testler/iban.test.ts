// IBAN doğrulaması (kart 0214, karar 0141): ISO 13616'nın genel biçimi, 97'ye göre kontrol hanesi ve ülkenin veri
// dosyasındaki uzunluk. Bağımsız örnekler: ISO 13616 ve python-stdnum'un belgelerindeki geçerli numaralar.
import { describe, expect, it } from "vitest";
import { ibanDuzelt, ibanHatasi, ibanSemasi } from "../iban.ts";

describe("IBAN", () => {
  it("bağımsız kaynakların geçerli numaraları geçer, boşluklu ve küçük harfli yazılış boşluksuz döner", () => {
    for (const iban of [
      "TR33 0006 1005 1978 6457 8413 26",
      "GB82 WEST 1234 5698 7654 32",
      "DE89 3704 0044 0532 0130 00",
      "tr330006100519786457841326",
    ]) {
      expect(ibanHatasi(iban)).toBeUndefined();
    }
    expect(ibanSemasi.parse(" tr33 0006 1005 1978 6457 8413 26 ")).toBe(
      "TR330006100519786457841326",
    );
    expect(ibanDuzelt("tr33 0006")).toBe("TR330006");
  });

  it("biçim, ülke, uzunluk ve kontrol hanesi ayrı kodla reddedilir", () => {
    expect(ibanHatasi("")).toBe("iban-bicimi");
    expect(ibanHatasi("TR3X0006100519786457841326")).toBe("iban-bicimi");
    expect(ibanHatasi("123456")).toBe("iban-bicimi");
    expect(ibanHatasi("XX330006100519786457841326")).toBe("iban-ulke");
    // Türkiye'nin dosyasında uzunluk 26: bir hane eksik ve fazla.
    expect(ibanHatasi("TR33000610051978645784132")).toBe("iban-uzunluk");
    expect(ibanHatasi("TR3300061005197864578413261")).toBe("iban-uzunluk");
    // Son hane bir artırılınca kontrol tutmaz.
    expect(ibanHatasi("TR330006100519786457841327")).toBe("iban-kontrol");
    expect(ibanHatasi("GB82WEST12345698765433")).toBe("iban-kontrol");
    // Uzunluğu veri dosyasında olmayan ülkede yalnız genel kural.
    expect(ibanHatasi("DE89370400440532013001")).toBe("iban-kontrol");
    const sonuc = ibanSemasi.safeParse("TR330006100519786457841327");
    expect(sonuc.success).toBe(false);
    expect(sonuc.error?.issues[0]?.message).toBe("iban-kontrol");
  });
});
