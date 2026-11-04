// Site metni dosya yüklenirken siteyi okumaz; böylece uygulama site olmadan derlenir ve aynı
// derleme her siteyle açılır (kart 0035, karar 0026).
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const gecerliSite = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli");

describe("site metni", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("SITE_KLASORU yokken de yüklenir, site ancak ilk kullanımda okunur", async () => {
    vi.stubEnv("SITE_KLASORU", undefined);
    const siteMetni = await import("../site-metni.ts");
    expect(() => siteMetni.siteDili()).toThrow("SITE_KLASORU");
  });

  it("dili ve metni çalışan sitenin ayarından okur", async () => {
    vi.stubEnv("SITE_KLASORU", gecerliSite);
    const { siteDili, metin, bicim } = await import("../site-metni.ts");
    expect(siteDili()).toBe("tr");
    expect(metin("yonetim.anasayfa.baslik")).toBeTypeOf("string");
    expect(bicim()).toBe(bicim());
  });
});
