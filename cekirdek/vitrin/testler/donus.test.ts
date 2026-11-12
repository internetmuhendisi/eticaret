// Müşteri girişinden sonra dönülecek adres (kart 0139): yalnız vitrinin kendi sayfasına dönülür.
import { describe, expect, it } from "vitest";
import { girisAdresiDonuslu, vitrinAdresleri, vitrinDonusu } from "../adresler.ts";

describe("vitrin dönüşü", () => {
  it("vitrinin sayfası, sorgu kısmı ve yer işaretiyle döner", () => {
    expect(vitrinDonusu("/urun/deneme?secenek-renk=siyah#yorumlar")).toBe(
      "/urun/deneme?secenek-renk=siyah#yorumlar",
    );
    expect(vitrinDonusu("/")).toBe("/");
  });

  it("başka site, panel, kapı, geliştirme ve giriş sayfası ana sayfaya düşer", () => {
    for (const adres of [
      undefined,
      null,
      "",
      "https://kotu.test/",
      "//kotu.test/",
      "/\\kotu.test",
      "javascript:alert(1)",
      "urun/deneme",
      "/yonetim",
      "/yonetim/ayarlar",
      "/kapi/musteri/hesabim",
      "/gelistirme/bilesenler",
      "/giris",
      "/giris?donus=/giris",
      // Kodlanmış ve büyük harfli yazılışlar (bağımsız kontrolün bulgusu); bozuk kodlama.
      "/y%6Fnetim",
      "/%67iris",
      "/YONETIM/ayarlar",
      "/urun/%E0%A4%A",
    ]) {
      expect(vitrinDonusu(adres), String(adres)).toBe(vitrinAdresleri.anasayfa);
    }
    // Panel adı başka bir sayfanın başı olabilir: yalnız tam yol ya da alt yol düşer.
    expect(vitrinDonusu("/yonetimsel")).toBe("/yonetimsel");
  });

  it("giriş adresi dönüş adresini kodlayarak taşır, yeniden okununca aynıdır", () => {
    const adres = girisAdresiDonuslu("/urun/deneme?a=1&b=2#yorumlar");
    const okunan = new URL(adres, "http://yerel").searchParams.get("donus");
    expect(vitrinDonusu(okunan)).toBe("/urun/deneme?a=1&b=2#yorumlar");
  });
});
