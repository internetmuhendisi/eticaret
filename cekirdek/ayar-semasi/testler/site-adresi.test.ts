// E-postadaki bağlantıların adresi (kart 0034).
import { afterEach, describe, expect, it, vi } from "vitest";
import { siteAdresi } from "../site-adresi.ts";

afterEach(() => vi.unstubAllEnvs());

describe("sitenin adresi", () => {
  const adresler = { canli: "https://magaza.ornek/", deneme: "https://deneme.ornek" };

  it("kutunun söylediği adres önce gelir, sonda çizgi kalmaz", () => {
    vi.stubEnv("SITE_ADRESI", "http://yerel.localhost:8080/");
    expect(siteAdresi({ adresler })).toBe("http://yerel.localhost:8080");
  });

  it("yoksa canlı, o da yoksa deneme adresi", () => {
    vi.stubEnv("SITE_ADRESI", "");
    expect(siteAdresi({ adresler })).toBe("https://magaza.ornek");
    expect(siteAdresi({ adresler: { deneme: adresler.deneme } })).toBe("https://deneme.ornek");
  });

  it("hiçbiri yoksa adres yoktur", () => {
    vi.stubEnv("SITE_ADRESI", "");
    expect(siteAdresi({ adresler: {} })).toBeUndefined();
  });
});
