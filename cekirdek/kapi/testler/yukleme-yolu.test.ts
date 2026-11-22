// Dosya yükleyen uçların adresi (kart 0094, karar 0165): ön kapı gövde sınırını yükleme yollarına adres kalıbıyla
// uygular (komutlar/on-kapi.mts). Dosya gövdesi alan her uç kalıba uyar; kalıba uyan her uç dosya gövdesi alır
// (yoksa JSON ucu 10 MB'lık gövdeye açık kalırdı) ve yalnız POST'tur. Uç listesi uygulamanın adres dosyalarından
// okunur. Ön kapının sınırı dosya sınırından küçük değildir.
import { describe, expect, it } from "vitest";
import { yuklemeGovdeSiniri, yuklemeYoluKalibi } from "../../../komutlar/on-kapi.mts";
import { dosyaSinirlari } from "../../kayitlar/dosya.ts";
import { uclariOku, uygulamaAdresleri } from "./erisim-denemesi.ts";

describe("yükleme yolu", () => {
  it("dosya gövdesi alan uç kalıba uyar, kalıba uyan uç dosya gövdesi alır ve POST'tur", async () => {
    const kalip = new RegExp(yuklemeYoluKalibi);
    const uclar = await uclariOku(uygulamaAdresleri);
    const dosyali = uclar.filter((uc) => uc.uc.tanim?.dosyaGovdesi === true);
    expect(dosyali.map((uc) => uc.baslik)).toContain("POST /kapi/yonetici/logo-yukle");
    for (const uc of dosyali) {
      expect(uc.yol, uc.baslik).toMatch(kalip);
      expect(uc.yontem, uc.baslik).toBe("POST");
    }
    for (const uc of uclar.filter((uc) => kalip.test(uc.yol))) {
      expect(uc.uc.tanim?.dosyaGovdesi, uc.baslik).toBe(true);
    }
  });

  it("kalıp yalnız yükleme adresini tutar", () => {
    const kalip = new RegExp(yuklemeYoluKalibi);
    expect(kalip.test("/kapi/yonetici/logo-yukle")).toBe(true);
    for (const yol of [
      "/kapi/yonetici/logo-kaldir",
      "/kapi/yonetici/logo-yukle/",
      "/kapi/yonetici/x/logo-yukle",
      "/kapi/herkese-acik/logo-yukle",
      "/yonetim/logo-yukle",
    ]) {
      expect(kalip.test(yol), yol).toBe(false);
    }
  });

  it("ön kapının sınırı dosya sınırından küçük değildir, payı küçüktür", () => {
    expect(yuklemeGovdeSiniri).toBeGreaterThan(dosyaSinirlari.enCokBayt);
    expect(yuklemeGovdeSiniri - dosyaSinirlari.enCokBayt).toBeLessThanOrEqual(128 * 1024);
  });
});
