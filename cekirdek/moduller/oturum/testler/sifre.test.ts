// Şifre özetleme (kart 0025, karar 0039).
import { describe, expect, it } from "vitest";
import { sifreOzetiAyari, sifreSiniri } from "../../../kayitlar/oturum.ts";
import { epostaSemasi, sifreSemasi } from "../semalar.ts";
import { sifreDogrula, sifreOzetle, yenidenOzetlenmeli } from "../sifre.ts";

describe("şifre özeti", () => {
  it("doğru şifreyi kabul eder, yanlışı reddeder", async () => {
    const ozet = await sifreOzetle("uzun-bir-deneme-sifresi");
    expect(await sifreDogrula("uzun-bir-deneme-sifresi", ozet)).toBe(true);
    expect(await sifreDogrula("uzun-bir-deneme-sifresI", ozet)).toBe(false);
  });

  it("güncel Argon2id ayarını yazar, şifreyi yazmaz, aynı şifrede farklı özet üretir", async () => {
    const birinci = await sifreOzetle("uzun-bir-deneme-sifresi");
    const ikinci = await sifreOzetle("uzun-bir-deneme-sifresi");
    const { bellekKb, tekrar, paralellik } = sifreOzetiAyari;
    expect(birinci.startsWith(`$argon2id$v=19$m=${bellekKb},t=${tekrar},p=${paralellik}$`)).toBe(
      true,
    );
    expect(birinci).not.toContain("uzun-bir-deneme-sifresi");
    expect(birinci).not.toBe(ikinci);
  });

  it("özet standart biçimdedir: tuzu ve değeri beklenen uzunlukta, dolgusuz", async () => {
    const parcalar = (await sifreOzetle("uzun-bir-deneme-sifresi")).split("$");
    expect(parcalar).toHaveLength(6);
    expect(Buffer.from(parcalar[4] as string, "base64")).toHaveLength(sifreOzetiAyari.tuzUzunlugu);
    expect(Buffer.from(parcalar[5] as string, "base64")).toHaveLength(sifreOzetiAyari.uzunluk);
    expect(parcalar[4]?.endsWith("=")).toBe(false);
    expect(parcalar[5]?.endsWith("=")).toBe(false);
  });

  it("bozuk özeti ve sınırı aşan şifreyi hata fırlatmadan reddeder", async () => {
    expect(await sifreDogrula("uzun-bir-deneme-sifresi", "bozuk")).toBe(false);
    const uzun = "a".repeat(sifreSiniri.enUzun + 1);
    expect(await sifreDogrula(uzun, await sifreOzetle("uzun-bir-deneme-sifresi"))).toBe(false);
    // Sınırı aşan metin boş şifre gibi hesaplanır; boş şifreli bir özet varsa bile geçmez.
    expect(await sifreDogrula(uzun, await sifreOzetle(""))).toBe(false);
  });

  it("eski ayarla üretilmiş özeti yenilenecek sayar", async () => {
    expect(yenidenOzetlenmeli(await sifreOzetle("uzun-bir-deneme-sifresi"))).toBe(false);
    expect(yenidenOzetlenmeli("$argon2id$v=19$m=1024,t=1,p=1$YWJjZGVmZ2g$YWJjZGVmZ2g")).toBe(true);
    expect(yenidenOzetlenmeli("$2b$10$eskiyontem")).toBe(true);
  });
});

describe("şemalar", () => {
  it("şifre en az 10 karakter ister, karmaşıklık istemez", () => {
    expect(sifreSemasi.safeParse("a".repeat(sifreSiniri.enKisa - 1)).success).toBe(false);
    expect(sifreSemasi.safeParse("a".repeat(sifreSiniri.enKisa)).success).toBe(true);
    expect(sifreSemasi.safeParse("a".repeat(sifreSiniri.enUzun + 1)).success).toBe(false);
  });

  it("e-postayı küçük harfe çevirir ve boşluklarını atar", () => {
    expect(epostaSemasi.parse("  Deneme@Ornek.COM ")).toBe("deneme@ornek.com");
    expect(epostaSemasi.safeParse("eposta-degil").success).toBe(false);
  });
});
