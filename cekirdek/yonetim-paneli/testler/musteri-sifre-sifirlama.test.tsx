// Şifre sıfırlama bağlantısının hata metni (kart 0271, karar 0173): müşterinin bağlantı sınırı ile panelin kendi istek
// sınırı ayrı söylenir (ikisi de "istek-siniri" kodu; müşterininki ayrıntıda müşteri alanını taşır).
import { describe, expect, it } from "vitest";
import { sifreSifirlamaHataMetni } from "../musteriler/sifre-sifirlama";

describe("şifre sıfırlama bağlantısının hata metni", () => {
  it("müşterinin sınırı ile panelin sınırı ayrı metin alır", () => {
    expect(
      sifreSifirlamaHataMetni({
        kod: "istek-siniri",
        ayrinti: [{ alan: "musteri", kod: "sifre-sifirlama-siniri" }],
      }),
    ).toBe("yonetim.musteri.sifre.sinir");
    expect(sifreSifirlamaHataMetni({ kod: "istek-siniri", ayrinti: [] })).toBe(
      "yonetim.musteri.sifre.panelSiniri",
    );
    expect(sifreSifirlamaHataMetni({ kod: "yetki", ayrinti: [] })).toBe(
      "yonetim.musteri.sifre.yetki",
    );
  });
});
