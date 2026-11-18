// Tarayıcı testlerinden önceki ısınmanın adresleri (kart 0222, cekirdek/testler/uctan-uca/isinma.ts).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dosyaAdresi, isinmaAdresleri } from "./uctan-uca/isinma";

// Ayar dosyaları yazı olarak okunur: içe aktarılınca ortam değişkenleri ve klasörler kurulur.
const ayar = (dosya: string) => readFileSync(join(import.meta.dirname, "..", "..", dosya), "utf8");

describe("ısınmanın yeri", () => {
  // Hız ölçümü kendinden imzalı sertifikalı vekilin arkasındaki canlı derlemede ölçer: ısınma orada hazırlığı
  // düşürdü (hat 44220561276).
  it("tarayıcı testleri ısınmayı kurulumdan sonra çağırır, hız ölçümü çağırmaz", () => {
    expect(ayar("playwright.config.ts")).toMatch(
      /globalSetup: \[\s*"\.\/cekirdek\/testler\/uctan-uca\/hazirlik\.ts",\s*"\.\/cekirdek\/testler\/uctan-uca\/isinma\.ts",?\s*\]/,
    );
    expect(ayar("playwright.hiz.config.ts")).not.toContain("isinma");
    expect(ayar("cekirdek/testler/uctan-uca/hazirlik.ts")).not.toContain("yollariIsit");
  });
});

describe("ısınma adresleri", () => {
  it("dosya yolundan adres: grup klasörü düşer, değişken parça örnek değer alır, isteğe bağlı parça boş kalır", () => {
    expect(dosyaAdresi(join("(vitrin)", "page.tsx"))).toBe("/");
    expect(dosyaAdresi(join("(vitrin)", "urun", "[adresAdi]", "page.tsx"))).toBe("/urun/isinma");
    expect(dosyaAdresi(join("(vitrin)", "[...adres]", "page.tsx"))).toBe("/isinma");
    expect(dosyaAdresi(join("kapi", "[[...adres]]", "page.tsx"))).toBe("/kapi");
    expect(dosyaAdresi(join("yonetim", "(panel)", "kargo", "page.tsx"))).toBe("/yonetim/kargo");
    expect(dosyaAdresi(join("kapi", "herkese-acik", "odeme", "route.ts"))).toBe(
      "/kapi/herkese-acik/odeme",
    );
  });

  it("uygulamanın klasöründen okunur: hatta ilk istekte bekleyen iki uç ve her türden yol var, hata denemesi yok", () => {
    const adresler = isinmaAdresleri();
    expect(adresler).toEqual(
      expect.arrayContaining([
        "/",
        "/kapi/herkese-acik/odeme",
        "/kapi/herkese-acik/stok-bildirimi",
        "/kapi/musteri/hesabim",
        "/kapi/yonetici/duzen",
        "/odeme",
        "/urun/isinma",
        "/yonetim/giris",
      ]),
    );
    expect(adresler).not.toContain("/gelistirme/hata-denemesi");
    expect(new Set(adresler).size).toBe(adresler.length);
    expect(adresler.every((adres) => !/[[\]()]/.test(adres))).toBe(true);
  });
});
