// Tema Galerisi (kart 0116, karar 0127): hazır temaların demosu. Site tema demosudur, bütün hazır temaları sunar,
// logo taşımaz; "Öne çıkanlar" sırada 5 ürün gösteren temalarda dolu sıralar verir (kullanıcı kararı).
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../cekirdek/ayar-semasi/site-klasoru.ts";
import { hazirTemaKodlari } from "../../../cekirdek/temalar/temalar.ts";
import duzen from "../baslangic/duzen.json" with { type: "json" };

const klasor = join(import.meta.dirname, "..");
const site = siteKlasorunuOku(klasor);

describe("Tema Galerisi", () => {
  it("tema demosudur, türü demo, bütün hazır temaları sunar, başlangıcı ilk hazır tema", () => {
    expect(site.ayarlar.temaDemosu).toBe(true);
    expect(site.kimlik.tur).toBe("demo");
    expect(site.temalar.map((tema) => tema.kod)).toEqual(hazirTemaKodlari());
    expect(site.temaBaslangici.tema).toBe(hazirTemaKodlari()[0]);
  });

  it("logo taşımaz, e-posta göndermez, eklenti açmaz", () => {
    expect(existsSync(join(klasor, "marka"))).toBe(false);
    expect(site.ayarlar.epostaGonderenAdresi).toBeUndefined();
    expect(site.ayarlar.eklentiler).toEqual([]);
  });

  it('"Öne çıkanlar" 10 ürün: sırada 5 ürün gösteren her temada dolu sıralar', () => {
    const one = duzen["ana-sayfa"].find(
      (bolum) => bolum.tur === "urun-vitrini" && bolum.degerler.baslik === "Öne çıkanlar",
    );
    const urunler = (one?.degerler.urunler as { urunler?: string[] } | undefined)?.urunler ?? [];
    expect(urunler).toHaveLength(10);
    const besli = site.temalar.filter((tema) => tema.tanim.degerler.urunSutunu === 5);
    expect(besli.length).toBeGreaterThan(0);
    for (const tema of besli)
      expect(urunler.length % tema.tanim.degerler.urunSutunu, tema.kod).toBe(0);
  });
});
