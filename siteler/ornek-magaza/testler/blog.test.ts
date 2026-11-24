// Örnek Mağaza'nın başlangıç blogu (kart 0272): KURALLAR.md'deki tablonun her yazısı boş bir veritabanına kurulduktan
// sonra vitrinde kategorisi, yayın anı (İstanbul saatiyle) ve kapağıyla görünür; blog açık başlar; ana sayfanın
// "Blogdan" bölümü son üç yazıyı gösterir.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../cekirdek/ayar-semasi/site-klasoru.ts";
import { gorselHazirMi } from "../../../cekirdek/moduller/dosya/servis.ts";
import { blogBaslangiciniKur } from "../../../cekirdek/moduller/icerik/baslangic.ts";
import { vitrinBlogYazilari } from "../../../cekirdek/moduller/icerik/vitrin.ts";
import { siteninServisi } from "../../../cekirdek/moduller/magaza-ayarlari/servis.ts";
import type { Veritabani } from "../../../cekirdek/veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../cekirdek/veritabani/testler/deneme-sitesi.ts";

const site = siteKlasorunuOku(join(import.meta.dirname, ".."));

let vt: Veritabani;
let sil: () => Promise<void>;
const klasor = mkdtempSync(join(tmpdir(), "ornek-blog-"));
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ornek-blog"));
  expect(await blogBaslangiciniKur(vt, site, () => klasor)).toBe(true);
}, 120_000);
afterAll(async () => {
  await sil();
  rmSync(klasor, { recursive: true, force: true });
});

describe("Örnek Mağaza'nın blogu", () => {
  it("blog açık başlar", async () => {
    expect(await siteninServisi(site).tekOku(vt, "blogAcik")).toBe(true);
  });

  it("tablodaki üç yazı en yeni önce, kategorisi, İstanbul saatiyle yayın anı ve hazır kapağıyla", async () => {
    const { yazilar } = await vitrinBlogYazilari(vt, { sayfa: 1, boyut: 12 });
    expect(
      yazilar.map((yazi) => [yazi.baslik, yazi.kategori?.ad, yazi.yayinZamani.toISOString()]),
    ).toEqual([
      ["Yılbaşı sofrası için küçük dokunuşlar", "Rehber", "2026-11-20T06:00:00.000Z"],
      ["Kışa hazırlık: katmanlı giyinmenin kısa rehberi", "Rehber", "2026-11-18T07:00:00.000Z"],
      ["Çalışma masanızı sadeleştirmenin 5 yolu", "Ev ve yaşam", "2026-11-10T07:00:00.000Z"],
    ]);
    for (const yazi of yazilar) {
      expect(yazi.kapak?.metin.length).toBeGreaterThan(0);
      const dosya = yazi.kapak?.dosya ?? "";
      expect(await vt.transaction((islem) => gorselHazirMi(islem, dosya))).toBe("hazir");
    }
  });

  it("ana sayfanın blog bölümü son yazıları gösterir ve /blog'a bağlanır", () => {
    const bolum = site.duzenBaslangici["ana-sayfa"].find((b) => b.tur === "blog-yazilari");
    expect(bolum?.degerler).toEqual({ baslik: "Blogdan", tumuBaglantisi: { adres: "/blog" } });
  });
});
