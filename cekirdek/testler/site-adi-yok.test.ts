// Çekirdekte ve ortak bileşenlerde hiçbir sitenin kod adı ya da görünen adı geçmez
// (değişmez kural 1, .claude/rules/ayarlar.md). Siteye özel davranış ayarla yapılır; demo paketleri de
// (cekirdek/demolar/, karar 0203) sitenin adını taşımaz, mağazanın adı yer tutucuyla yazılır. Sitenin başlangıç
// kataloğundaki ürün ve marka adları da geçmez (kart 0084): örnek ürünler yalnız sitenin klasöründe ya da demo
// paketindedir.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../ayar-semasi/site-klasoru";

const kok = join(import.meta.dirname, "..", "..");
const atlananlar = new Set(["node_modules", ".next", "test-results"]);

const dosyalar = (klasor: string): string[] =>
  readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
    if (atlananlar.has(girdi.name)) return [];
    const yol = join(klasor, girdi.name);
    return girdi.isDirectory() ? dosyalar(yol) : [yol];
  });

const taranan = ["cekirdek", "bilesenler"].flatMap((klasor) => dosyalar(join(kok, klasor)));
// Demo paketlerinin görselleri ikili dosyadır, metin olarak taranmaz.
const metinDosyasi = (dosya: string) => !/\.(jpe?g|png|webp|gif|avif)$/i.test(dosya);
const demolar = join(kok, "cekirdek", "demolar");
const paketDisi = taranan.filter((dosya) => !dosya.startsWith(`${demolar}/`));

const siteKlasorleri = readdirSync(join(kok, "siteler"), { withFileTypes: true })
  .filter((girdi) => girdi.isDirectory())
  .map((girdi) => join(kok, "siteler", girdi.name));

describe("çekirdekte site adı", () => {
  for (const klasor of siteKlasorleri) {
    const { kimlik, katalogBaslangici } = siteKlasorunuOku(klasor);

    it(`${kimlik.kodAdi} geçmez`, () => {
      const adlar = [kimlik.kodAdi, kimlik.gorunenAd].map((ad) => ad.toLowerCase());
      const gecenler = taranan.filter(metinDosyasi).filter((dosya) => {
        const icerik = readFileSync(dosya, "utf8").toLowerCase();
        return adlar.some((ad) => icerik.includes(ad));
      });
      expect(gecenler.map((dosya) => relative(kok, dosya))).toEqual([]);
    });

    it(`${kimlik.kodAdi} kataloğunun ürün ve marka adları geçmez`, () => {
      const adlar = [
        ...katalogBaslangici.urunler.flatMap((urun) => [urun.ad, urun.adresAdi]),
        ...katalogBaslangici.markalar.map((marka) => marka.ad),
      ].map((ad) => ad.toLocaleLowerCase("tr"));
      const gecenler = paketDisi.filter(metinDosyasi).flatMap((dosya) => {
        const icerik = readFileSync(dosya, "utf8").toLocaleLowerCase("tr");
        return adlar
          .filter((ad) => icerik.includes(ad))
          .map((ad) => `${relative(kok, dosya)}: ${ad}`);
      });
      expect(gecenler).toEqual([]);
    });
  }
});
