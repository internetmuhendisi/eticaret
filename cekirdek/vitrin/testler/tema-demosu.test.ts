// Tema demosu (kart 0116, karar 0127): vitrinin teması, ara katmanın seçimi çereze yazması, arama motorlarına
// kapalılık, müşteri sayfalarının kapısı ve site doğrulamasının kuralları. Demo olmayan site hiçbirinden etkilenmez.
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Site,
  siteKlasorunuOku,
  temaDemosuSorunlari,
} from "../../ayar-semasi/site-klasoru.ts";
import { temaDemosu } from "../../kayitlar/tema.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";

const cerezler = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (ad: string) => (cerezler.has(ad) ? { name: ad, value: cerezler.get(ad) } : undefined),
  }),
}));

const { demodaSecilenTema, vitrinTemasi } = await import("../tema-secimi.ts");
const { proxy } = await import("../../uygulama/proxy.ts");
const { musteriSayfasiBilgisi, musteriSayfasiniAc } = await import("../yalniz-gezinti.ts");

const siteler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const siteyiKur = (ad: "tema-demosu" | "gecerli"): Site => {
  const site = siteKlasorunuOku(resolve(siteler, ad));
  (globalThis as Record<symbol, unknown>)[siteAnahtari] = site;
  return site;
};

beforeEach(() => cerezler.clear());
afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[siteAnahtari];
});

// Bu testlerde veritabanına gidilmez: seçim varken kayıtlı tema okunmaz.
const vt = {} as Veritabani;

describe("vitrinin teması", () => {
  it("demoda çerezdeki tema seçilir, temanın kendi değerleriyle; koyu tema sitenin başlangıç ayarındandır", async () => {
    const site = siteyiKur("tema-demosu");
    cerezler.set(temaDemosu.cerez, "keskin-cizgi");
    expect((await demodaSecilenTema(site))?.kod).toBe("keskin-cizgi");
    const { tema, ayarlar } = await vitrinTemasi(vt, site);
    expect(tema.kod).toBe("keskin-cizgi");
    expect(ayarlar.renkler).toEqual({});
    expect(ayarlar.koyuTema).toBe(site.temaBaslangici.ayarlar.koyuTema);
  });

  it("sitenin kullanamayacağı ya da olmayan tema seçilmez", async () => {
    const site = siteyiKur("tema-demosu");
    for (const kod of ["olmayan-tema", "", "../canli-carsi"]) {
      cerezler.set(temaDemosu.cerez, kod);
      expect(await demodaSecilenTema(site), kod).toBeUndefined();
    }
    const yalnizIki = { ...site, temalar: site.temalar.filter((t) => t.kod !== "keskin-cizgi") };
    cerezler.set(temaDemosu.cerez, "keskin-cizgi");
    expect(await demodaSecilenTema(yalnizIki)).toBeUndefined();
  });

  it("demo olmayan sitede çerez yok sayılır", async () => {
    const site = siteyiKur("gecerli");
    cerezler.set(temaDemosu.cerez, "keskin-cizgi");
    expect(await demodaSecilenTema(site)).toBeUndefined();
  });
});

const istek = (adres: string, yontem = "GET") =>
  new NextRequest(new URL(adres, "http://site.localhost"), { method: yontem });

describe("ara katman", () => {
  it("demoda geçerli ?tema= çereze yazılır, aynı sayfaya parametresiz yönlenir; öteki parametreler kalır", async () => {
    siteyiKur("tema-demosu");
    const yanit = await proxy(istek("/kategori/giyim?sirala=fiyat&tema=yumusak-mevsim"));
    expect(yanit.status).toBe(303);
    const yeni = new URL(yanit.headers.get("location") ?? "");
    expect(yeni.pathname).toBe("/kategori/giyim");
    expect(yeni.searchParams.get("sirala")).toBe("fiyat");
    expect(yeni.searchParams.has(temaDemosu.parametre)).toBe(false);
    const cerez = yanit.headers.get("set-cookie") ?? "";
    expect(cerez).toContain(`${temaDemosu.cerez}=yumusak-mevsim`);
    expect(cerez).toMatch(/HttpOnly/i);
    expect(cerez).toMatch(/SameSite=lax/i);
    expect(cerez).toMatch(/Path=\//i);
  });

  it("arama sayfasında da seçim yönlenir", async () => {
    siteyiKur("tema-demosu");
    const yanit = await proxy(istek("/arama?ara=kupa&tema=keskin-cizgi"));
    expect(yanit.status).toBe(303);
    expect(new URL(yanit.headers.get("location") ?? "").search).toBe("?ara=kupa");
  });

  it("geçersiz tema yönlenmez, çerez yazılmaz", async () => {
    siteyiKur("tema-demosu");
    for (const kod of ["olmayan-tema", "", "Canli-Carsi"]) {
      const yanit = await proxy(istek(`/?tema=${encodeURIComponent(kod)}`));
      expect(yanit.status, kod).toBe(200);
      expect(yanit.headers.get("set-cookie"), kod).toBeNull();
    }
  });

  it("demo olmayan sitede ?tema= yok sayılır ve arama motoru başlığı yazılmaz", async () => {
    siteyiKur("gecerli");
    const yanit = await proxy(istek("/?tema=keskin-cizgi"));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("set-cookie")).toBeNull();
    expect(yanit.headers.get("x-robots-tag")).toBeNull();
  });

  it("demoda her yanıt arama motorlarına kapalıdır: sayfa, yönlenme ve panel", async () => {
    siteyiKur("tema-demosu");
    for (const adres of ["/", "/kategori/giyim", "/?tema=canli-carsi", "/favicon.ico"]) {
      const yanit = await proxy(istek(adres));
      expect(yanit.headers.get("x-robots-tag"), adres).toBe("noindex, nofollow");
    }
  });

  it("panel adresinde seçim yapılmaz", async () => {
    siteyiKur("tema-demosu");
    for (const adres of [
      "/yonetim/giris?tema=keskin-cizgi",
      "/%79onetim/giris?tema=keskin-cizgi",
    ]) {
      const yanit = await proxy(istek(adres));
      expect(yanit.headers.get("set-cookie") ?? "", adres).not.toContain(temaDemosu.cerez);
    }
  });
});

describe("müşteri sayfaları", () => {
  it("demoda bulunamadı verir, sekme başlığı bulunamadı sayfasınınkidir", async () => {
    siteyiKur("tema-demosu");
    expect(() => musteriSayfasiniAc()).toThrow();
    const bilgi = await musteriSayfasiBilgisi(async () => ({ title: "Giriş yap" }))();
    expect(bilgi.title).not.toBe("Giriş yap");
  });

  it("demo olmayan sitede açılır", async () => {
    siteyiKur("gecerli");
    expect(() => musteriSayfasiniAc()).not.toThrow();
    expect(await musteriSayfasiBilgisi(async () => ({ title: "Giriş yap" }))()).toEqual({
      title: "Giriş yap",
    });
  });
});

describe("site doğrulaması", () => {
  const site = () => siteKlasorunuOku(resolve(siteler, "tema-demosu"));

  it("demo sitesi geçer; demo olmayan sitede kurallar uygulanmaz", () => {
    const { kimlik, ayarlar } = site();
    expect(temaDemosuSorunlari(kimlik, ayarlar)).toEqual([]);
    const gercek = siteKlasorunuOku(resolve(siteler, "gecerli"));
    expect(temaDemosuSorunlari(gercek.kimlik, gercek.ayarlar)).toEqual([]);
  });

  it("gerçek mağaza tema demosu olamaz, demo e-posta göndermez ve eklenti açmaz", () => {
    const { kimlik, ayarlar } = site();
    const sorunlar = (degisiklik: Partial<typeof ayarlar>, tur: typeof kimlik.tur = "demo") =>
      temaDemosuSorunlari({ ...kimlik, tur }, { ...ayarlar, ...degisiklik });
    expect(sorunlar({}, "gercek")).toEqual([expect.stringContaining("temaDemosu")]);
    expect(sorunlar({ epostaGonderenAdresi: "a@b.test" })).toEqual([
      expect.stringContaining("epostaGonderenAdresi"),
    ]);
    expect(sorunlar({ eklentiler: ["stoga-gelince-haber-ver"] })).toEqual([
      expect.stringContaining("eklentiler"),
    ]);
  });
});
