// Katalogun iki kapısı (kart 0104, karar 0078). Ara katman katalog kapalıyken isteği sayfaya hiç ulaştırmaz:
// gövdesiz 404, RSC isteği ve her yöntem için de. Düzen, sayfalar ve sayfa bilgisi (generateMetadata) ara
// katman atlanırsa diye ikinci kapıyı ayrıca çağırır: Next.js'te düzenin notFound() vermesi sayfanın
// çizilmesini durdurmaz (bağımsız kontrol, gerçek görüntüde ölçüldü).
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { siteOrtamiDegiskeni } from "../../kayitlar/site.ts";
import ParcaSayfasi, {
  generateMetadata as parcaBilgisi,
} from "../../uygulama/app/gelistirme/bilesenler/[parca]/page.tsx";
import BolumKutuphanesiSayfasi, {
  generateMetadata as bolumKutuphanesiBilgisi,
} from "../../uygulama/app/gelistirme/bilesenler/bolum-kutuphanesi/page.tsx";
import KatalogDuzeni from "../../uygulama/app/gelistirme/bilesenler/layout.tsx";
import AnaSayfa, {
  generateMetadata as anaSayfaBilgisi,
} from "../../uygulama/app/gelistirme/bilesenler/page.tsx";
import { config, proxy } from "../../uygulama/proxy.ts";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("bulunamadi");
  },
}));

// Testlerin ortak geçerli site klasörü; gerçek bir sitenin adı çekirdekte geçmez.
const ornekSite = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli");

afterEach(() => vi.unstubAllEnvs());

const kapali = () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv(siteOrtamiDegiskeni, "canli");
};

const istek = (yol: string, yontem = "GET", basliklar: Record<string, string> = {}) =>
  new NextRequest(new URL(yol, "http://site.localhost"), { method: yontem, headers: basliklar });

describe("ara katman", () => {
  it("geliştirme adreslerinin tamamı ara katmandan geçer", () => {
    expect(config.matcher).toEqual(expect.arrayContaining(["/gelistirme", "/gelistirme/:path*"]));
  });

  it.each<[string, string, Record<string, string>]>([
    ["/gelistirme/bilesenler", "GET", {}],
    ["/gelistirme/bilesenler/dugme", "GET", {}],
    ["/gelistirme/bilesenler/dugme?_rsc=abc", "GET", {}],
    ["/gelistirme/bilesenler", "GET", { RSC: "1" }],
    ["/gelistirme/bilesenler", "GET", { "Next-Router-Prefetch": "1", RSC: "1" }],
    ["/gelistirme/bilesenler", "HEAD", {}],
    ["/gelistirme/bilesenler", "POST", {}],
    ["/gelistirme", "GET", {}],
    ["/gelistirme/baska", "GET", {}],
    ["/%67elistirme/bilesenler", "GET", {}],
    ["/gelistirme%2Fbilesenler", "GET", { RSC: "1" }],
    ["/%67elistirme%2Fbilesenler%2Fdugme", "POST", {}],
  ])("katalog kapalıyken %s (%s) gövdesiz 404", async (yol, yontem, basliklar) => {
    kapali();
    const yanit = await proxy(istek(yol, yontem, basliklar));
    expect(yanit.status).toBe(404);
    expect(await yanit.text()).toBe("");
  });

  it("deneme ortamında istek sayfaya geçer", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(siteOrtamiDegiskeni, "deneme");
    const yanit = await proxy(istek("/gelistirme/bilesenler/dugme", "GET", { RSC: "1" }));
    expect(yanit.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("sayfa içindeki ikinci kapı", () => {
  const parametreler = {
    params: Promise.resolve({ parca: "dugme" }),
    searchParams: Promise.resolve({}),
  };

  it("katalog kapalıyken düzen, iki sayfa ve iki sayfa bilgisi bulunamadı verir", async () => {
    kapali();
    expect(() => KatalogDuzeni({ children: null })).toThrow("bulunamadi");
    expect(() => anaSayfaBilgisi()).toThrow("bulunamadi");
    await expect(AnaSayfa({ searchParams: Promise.resolve({}) })).rejects.toThrow("bulunamadi");
    await expect(parcaBilgisi(parametreler)).rejects.toThrow("bulunamadi");
    await expect(ParcaSayfasi(parametreler)).rejects.toThrow("bulunamadi");
    // Bölüm kütüphanesinin sayfası (kart 0106).
    expect(() => bolumKutuphanesiBilgisi()).toThrow("bulunamadi");
    await expect(BolumKutuphanesiSayfasi({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "bulunamadi",
    );
  });

  // Yeni bir geliştirme sayfası ikinci kapıyı unutmasın (kart 0106): her sayfa dosyası kapıyı hem sayfada
  // hem sayfa bilgisinde, her düzen dosyası düzende çağırır.
  it("geliştirme klasöründeki her sayfa ve düzen ikinci kapıyı çağırır", () => {
    const klasor = resolve(import.meta.dirname, "../../uygulama/app/gelistirme");
    const dosyalar = readdirSync(klasor, { recursive: true, encoding: "utf8" }).filter((ad) =>
      /(?:^|\/)(?:page|layout)\.tsx$/.test(ad),
    );
    expect(dosyalar.length).toBeGreaterThanOrEqual(4);
    for (const dosya of dosyalar) {
      const icerik = readFileSync(join(klasor, dosya), "utf8");
      const cagri = icerik.match(/katalogKapisi\(\)/g)?.length ?? 0;
      expect(cagri, dosya).toBeGreaterThanOrEqual(dosya.endsWith("page.tsx") ? 2 : 1);
    }
  });

  it("geliştirmede sayfa çizilir", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SITE_KLASORU", ornekSite);
    await expect(parcaBilgisi(parametreler)).resolves.toHaveProperty("title");
    await expect(ParcaSayfasi(parametreler)).resolves.toBeTruthy();
  });
});
