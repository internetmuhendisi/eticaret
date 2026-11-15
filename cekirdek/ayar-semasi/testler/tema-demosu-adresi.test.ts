// Panelin "Demoyu gez" bağlantısı (kart 0148): demo adresi ortamdan okunur, yalnız http ya da https kök adres
// kabul edilir; temanın kodu demonun adres parametresiyle eklenir.
import { describe, expect, it } from "vitest";
import { temaDemosuAdresiDegiskeni } from "../../kayitlar/site.ts";
import { temaDemosu } from "../../kayitlar/tema.ts";
import { temaDemosuAdresi, temaDemosuBaglantisi } from "../tema-demosu-adresi.ts";

const ortam = (deger: string | undefined) => ({ [temaDemosuAdresiDegiskeni]: deger });

describe("demo adresi", () => {
  it("kök adres kabul edilir, sondaki eğik çizgi ve boşluk düşer", () => {
    expect(temaDemosuAdresi(ortam("https://demo.ornek.test"))).toBe("https://demo.ornek.test");
    expect(temaDemosuAdresi(ortam(" https://demo.ornek.test/ "))).toBe("https://demo.ornek.test");
    expect(temaDemosuAdresi(ortam("http://demo.localhost:8080"))).toBe(
      "http://demo.localhost:8080",
    );
  });

  it("yoksa, boşsa ya da kök adres değilse bağlantı yoktur", () => {
    for (const deger of [
      undefined,
      "",
      "  ",
      "demo.ornek.test",
      "javascript:alert(1)",
      "ftp://demo.ornek.test",
      "https://kullanici:sifre@demo.ornek.test",
      "https://demo.ornek.test/yol",
      "https://demo.ornek.test/?tema=x",
      "https://demo.ornek.test/#parca",
    ]) {
      expect(temaDemosuAdresi(ortam(deger)), String(deger)).toBeUndefined();
      expect(temaDemosuBaglantisi("canli-carsi", ortam(deger)), String(deger)).toBeUndefined();
    }
  });

  it("bağlantı demonun ana sayfasına temanın koduyla gider, kod kaçışlıdır", () => {
    const baglanti = temaDemosuBaglantisi("keskin-cizgi", ortam("https://demo.ornek.test"));
    expect(baglanti).toBe(`https://demo.ornek.test/?${temaDemosu.parametre}=keskin-cizgi`);
    const kacisli = new URL(temaDemosuBaglantisi("a&b=c", ortam("https://demo.ornek.test")) ?? "");
    expect(kacisli.searchParams.get(temaDemosu.parametre)).toBe("a&b=c");
    expect([...kacisli.searchParams.keys()]).toEqual([temaDemosu.parametre]);
  });
});
