// Her sitenin başlangıç kataloğu boş bir veritabanına gerçekten kurulur (kart 0084 kontrolü, karar
// 0070). Site doğrulaması dosyanın alanlarını ve servislerin alanlar arası kurallarını denetler; aynı ad
// ve aynı stok kodu gibi veritabanında aranan kuralları ancak bu test yakalar. Kurulamayan katalog
// sunucuda her açılışta yalnız hata kaydederdi; test her yayında çalışır, yayından önce kırmızı olur.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { katalogBaslangiciniKur } from "../baslangic.ts";

const siteler = join(import.meta.dirname, "..", "..", "..", "..", "siteler");
const kataloglu = readdirSync(siteler, { withFileTypes: true })
  .filter((girdi) => girdi.isDirectory())
  .map((girdi) => siteKlasorunuOku(join(siteler, girdi.name)))
  .filter((site) => site.katalogBaslangici.urunler.length > 0);

describe("sitelerin başlangıç kataloğu", () => {
  it("en az bir sitenin kataloğu var", () => {
    expect(kataloglu.length).toBeGreaterThan(0);
  });

  for (const site of kataloglu) {
    it(`${site.kimlik.kodAdi} boş veritabanına kurulur`, async () => {
      const { vt, sil } = await denemeSitesiAc("site-katalogu");
      try {
        expect(await katalogBaslangiciniKur(vt, site)).toBe(true);
      } finally {
        await sil();
      }
    });
  }
});
