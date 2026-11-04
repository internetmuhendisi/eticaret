// Site süreç başına bir kez okunur: Next.js'in ayrı paketleri (açılış kontrolü ve sayfalar)
// dosyanın ayrı kopyalarını yükler, hepsi aynı okunmuş siteyi görür (kart 0035, karar 0026).
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const ornekler = resolve(import.meta.dirname, "ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;

describe("çalışan site", () => {
  afterEach(() => {
    delete ortak[Symbol.for("cekirdek.calisanSite")];
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("dosyanın ikinci kopyası siteyi yeniden okumaz, ilk okunanı verir", async () => {
    vi.stubEnv("SITE_KLASORU", resolve(ornekler, "gecerli"));
    const ilkKopya = await import("../calisan-site.ts");
    const ilk = ilkKopya.calisanSite();

    vi.resetModules();
    vi.stubEnv("SITE_KLASORU", resolve(ornekler, "yanlis-tur"));
    const ikinciKopya = await import("../calisan-site.ts");

    expect(ikinciKopya.calisanSite).not.toBe(ilkKopya.calisanSite);
    expect(ikinciKopya.calisanSite()).toBe(ilk);
  });
});
