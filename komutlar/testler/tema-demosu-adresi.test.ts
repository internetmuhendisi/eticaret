// Panelin "Demoyu gez" bağlantısının adresi (kart 0148): tek kaynak demo sitesinin kimliğidir; komutlar onu her
// sitenin kutusuna ortam değişkeniyle verir. Birden çok demo sitesi komutu durdurur.
import { describe, expect, it } from "vitest";
import type { Site } from "../../cekirdek/ayar-semasi/site-klasoru.ts";
import { temaDemosuAdresiDegiskeni } from "../../cekirdek/kayitlar/site.ts";
import {
  demoSitesi,
  projedekiSiteler,
  sunucudakiDemoAdresi,
  temaDemosuOrtami,
  yereldekiDemoAdresi,
} from "../tema-demosu-adresi.mts";
import { yayinKutusuTanimi } from "../yayin.mts";
import { siteKutusu } from "../yerel-ortam.mts";

type Aday = Pick<Site, "kimlik" | "ayarlar">;
const aday = (
  kodAdi: string,
  tur: Site["kimlik"]["tur"],
  temaDemosu: boolean,
  adresler: Site["kimlik"]["adresler"] = {},
): Aday =>
  ({
    kimlik: { kodAdi, tur, adresler },
    ayarlar: { temaDemosu },
  }) as unknown as Aday;

describe("demo sitesi", () => {
  it("türü demo ve tema demosu ayarı açık olan site; öteki siteler sayılmaz", () => {
    const demo = aday("galeri", "demo", true, { deneme: "https://galeri.deneme.ornek.test" });
    expect(
      demoSitesi([aday("magaza", "gercek", false), aday("bos-demo", "demo", false), demo]),
    ).toBe(demo);
    expect(demoSitesi([aday("magaza", "gercek", false)])).toBeUndefined();
    expect(demoSitesi([])).toBeUndefined();
  });

  it("birden çok demo sitesi varsa durur", () => {
    expect(() => demoSitesi([aday("bir", "demo", true), aday("iki", "demo", true)])).toThrow(
      /bir, iki/,
    );
  });

  it("projede tek demo sitesi var ve deneme adresi kimliğinde yazılı", () => {
    const demo = demoSitesi(projedekiSiteler());
    expect(demo?.kimlik.tur).toBe("demo");
    expect(sunucudakiDemoAdresi(demo, "deneme")).toBe(demo?.kimlik.adresler.deneme);
    expect(sunucudakiDemoAdresi(demo, "deneme")).toMatch(/^https:\/\//);
  });
});

describe("ortama göre adres", () => {
  const demo = aday("galeri", "demo", true, {
    deneme: "https://galeri.deneme.ornek.test",
    canli: "https://galeri.ornek.test",
  });
  const yalnizDeneme = aday("galeri", "demo", true, { deneme: "https://galeri.deneme.ornek.test" });

  it("deneme ortamında deneme adresi, canlıda canlı adresi, canlısı yoksa deneme adresi", () => {
    expect(sunucudakiDemoAdresi(demo, "deneme")).toBe("https://galeri.deneme.ornek.test");
    expect(sunucudakiDemoAdresi(demo, "canli")).toBe("https://galeri.ornek.test");
    expect(sunucudakiDemoAdresi(yalnizDeneme, "canli")).toBe("https://galeri.deneme.ornek.test");
    expect(sunucudakiDemoAdresi(undefined, "canli")).toBeUndefined();
  });

  it("yerelde Caddy'nin site adresi", () => {
    expect(yereldekiDemoAdresi(demo, 8080)).toBe("http://galeri.localhost:8080");
    expect(yereldekiDemoAdresi(undefined, 8080)).toBeUndefined();
  });
});

describe("kutunun ortamı", () => {
  const adres = "https://galeri.deneme.ornek.test";

  it("adres yoksa değişken yok", () => {
    expect(temaDemosuOrtami(undefined)).toEqual({});
    expect(temaDemosuOrtami(adres)).toEqual({ [temaDemosuAdresiDegiskeni]: adres });
  });

  it("yayındaki sitenin iki kutusu adresi alır; verilmezse değişken yok", () => {
    const tanim = yayinKutusuTanimi("deneme", "ornek-site", 1, 1, undefined, adres);
    for (const servis of [tanim.services.uygulama, tanim.services["arka-plan"]]) {
      expect(servis.environment).toHaveProperty(temaDemosuAdresiDegiskeni, adres);
    }
    expect(
      yayinKutusuTanimi("deneme", "ornek-site", 1, 1).services.uygulama.environment,
    ).not.toHaveProperty(temaDemosuAdresiDegiskeni);
  });

  it("yerel ortamdaki site kutusu adresi alır; verilmezse değişken yok", () => {
    expect(siteKutusu("ornek-site", "/klasor", "etiket", 1, adres).environment).toHaveProperty(
      temaDemosuAdresiDegiskeni,
      adres,
    );
    expect(siteKutusu("ornek-site", "/klasor", "etiket", 1).environment).not.toHaveProperty(
      temaDemosuAdresiDegiskeni,
    );
  });
});
