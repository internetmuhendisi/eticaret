// Komutların deneme sitesi ayarları şemadan geçer ve ayar dosyası yazan her komut onları kullanır
// (kart 0081 kontrolü: para biriminin varsayılanı kalkınca yayın denemesinin "{}" yazan deneme sitesi
// doğrulamadan geçmiyordu).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ayarSemasi } from "../../cekirdek/ayar-semasi/ayarlar.ts";
import { denemeSitesiAyarDosyasi } from "../deneme-sitesi-ayarlari.mts";

const komutlar = join(import.meta.dirname, "..");

describe("deneme sitesi ayarları", () => {
  it("şemadan geçer, gönderen adresiyle de", () => {
    expect(ayarSemasi.safeParse(JSON.parse(denemeSitesiAyarDosyasi())).success).toBe(true);
    const gonderenli = JSON.parse(
      denemeSitesiAyarDosyasi({ epostaGonderenAdresi: "deneme-abc123@posta.ornek.test" }),
    );
    expect(ayarSemasi.safeParse(gonderenli).success).toBe(true);
    expect(gonderenli.epostaGonderenAdresi).toBe("deneme-abc123@posta.ornek.test");
    expect(JSON.parse(denemeSitesiAyarDosyasi())).not.toHaveProperty("epostaGonderenAdresi");
  });

  it("ayarlar.json yazan her komut ortak ayarı kullanır", () => {
    const yazanlar = readdirSync(komutlar)
      .filter((ad) => ad.endsWith(".mts"))
      .map((ad) => ({ ad, icerik: readFileSync(join(komutlar, ad), "utf8") }))
      .filter(({ icerik }) => /writeFileSync\([^;]*"ayarlar\.json"/s.test(icerik));
    expect(yazanlar.map((y) => y.ad).toSorted()).toEqual(["yayin-denemesi.mts", "yerel-ortam.mts"]);
    for (const { ad, icerik } of yazanlar) {
      expect([ad, /"ayarlar\.json"\),\s*denemeSitesiAyarDosyasi\(/.test(icerik)]).toEqual([
        ad,
        true,
      ]);
    }
  });
});
