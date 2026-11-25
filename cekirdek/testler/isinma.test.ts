// Tarayıcı testlerinden önceki ısınmanın adresleri (kart 0222, cekirdek/testler/uctan-uca/isinma.ts).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  dosyaAdresi,
  girisliGirisSayfalari,
  girissizSayfalar,
  isinmaAdresleri,
  panelAdresleri,
  sayfaAdresleri,
} from "./uctan-uca/isinma";

// Ayar dosyaları yazı olarak okunur: içe aktarılınca ortam değişkenleri ve klasörler kurulur.
const ayar = (dosya: string) => readFileSync(join(import.meta.dirname, "..", "..", dosya), "utf8");

describe("ısınmanın yeri", () => {
  // Kart 0251 (karar 0184): asıl aşama ve hız ölçümü canlıdaki gibi derlenmiş sunucuda çalışır, derlenecek yol
  // yoktur. Hız ölçümünde ısınma kendinden imzalı sertifikalı vekilde hazırlığı düşürmüştü (hat 44220561276).
  it("geliştirme aşaması ısınmayı kurulumdan sonra çağırır, asıl aşama ve hız ölçümü çağırmaz", () => {
    expect(ayar("playwright.gelistirme.config.ts")).toMatch(
      /globalSetup: \[\s*"\.\/cekirdek\/testler\/uctan-uca\/hazirlik\.ts",\s*"\.\/cekirdek\/testler\/uctan-uca\/isinma\.ts",?\s*\]/,
    );
    expect(ayar("playwright.config.ts")).toMatch(
      /globalSetup: "\.\/cekirdek\/testler\/uctan-uca\/hazirlik\.ts",/,
    );
    expect(ayar("playwright.config.ts")).not.toContain("isinma");
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

  // Kart 0164: geliştirme taraması (gelistirme-taramasi.test.ts) her sayfayı tam bir yoldan açar.
  it("her sayfa dosyası tam bir gruba düşer: girişsiz, panel, girişli giriş sayfası ya da ısıtılmayan", () => {
    const sayfalar = sayfaAdresleri();
    const girissiz = girissizSayfalar();
    const panel = panelAdresleri();
    const gruplar = [girissiz, panel, [...girisliGirisSayfalari], ["/gelistirme/hata-denemesi"]];
    for (const adres of sayfalar) {
      expect(
        gruplar.filter((grup) => grup.includes(adres)),
        adres,
      ).toHaveLength(1);
    }
    // Girişli giriş sayfaları gerçekten vardır: adı değişirse ısınmadan sessizce düşmez.
    for (const adres of girisliGirisSayfalari) expect(sayfalar, adres).toContain(adres);
    expect(panel).toEqual(
      expect.arrayContaining(["/yonetim", "/yonetim/kargo", "/yonetim/menuler"]),
    );
    expect(girissiz).toEqual(expect.arrayContaining(["/", "/yonetim/giris", "/odeme"]));
    expect(
      girissiz.some(
        (adres) => adres.startsWith("/yonetim/") && !adres.startsWith("/yonetim/giris"),
      ),
    ).toBe(false);
  });
});
