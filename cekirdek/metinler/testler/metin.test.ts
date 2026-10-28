import { describe, expect, it } from "vitest";
import { metinOkuyucu } from "../metin";

const metin = metinOkuyucu("tr");

describe("metin", () => {
  it("metni anahtarıyla okur", () => {
    expect(metin("ortak.islem.kaydet")).toBe("Kaydet");
  });

  it("olmayan anahtar tür kontrolünden geçmez", () => {
    // Anahtar var olsaydı aşağıdaki satır hata vermez, tür kontrolü bu yüzden kırmızıya düşerdi.
    // @ts-expect-error olmayan anahtar
    expect(() => metin("ortak.islem.olmayan")).toThrow();
    // Bölüm adı da tek başına anahtar değildir.
    // @ts-expect-error yaprak olmayan anahtar
    expect(() => metin("ortak.islem")).toThrow();
  });
});
