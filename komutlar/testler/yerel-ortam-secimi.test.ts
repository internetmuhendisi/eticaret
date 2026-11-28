// Yerel ortam denemesinin siteleri (kart 0132): kontrol hattı yalnız şu anki çekirdeğin görüntüsünü üretebilir. Eski
// sürümdeki proje sitesi açılmaz, "ölçülmedi" satırıyla yazılır; siteler arası ölçümler için yerine ikinci bir deneme
// sitesi açılır. Her kuralın bozuk bir örneği yakalanır.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kok, olculmediSatiri, yerelDenemeSecimi } from "../yerel-ortam.mts";

const site = (kodAdi: string, surum: string) => ({ klasor: `/siteler/${kodAdi}`, kodAdi, surum });

describe("yerel ortam denemesinin seçimi", () => {
  it("şu anki sürümdeki proje sitesi açılır, ek deneme sitesi gerekmez", () => {
    const secim = yerelDenemeSecimi([site("ornek-magaza", "0.82.0")], "0.82.0");
    expect(secim.acilacaklar.map((s) => s.kodAdi)).toEqual(["ornek-magaza"]);
    expect(secim.olculmeyenler).toEqual([]);
    expect(secim.ekDenemeSitesi).toBe(0);
  });

  it.each([
    ["eski", "0.81.0"],
    ["yeni (henüz üretilmemiş sürüm)", "0.83.0"],
  ])(
    "%s sürümdeki site açılmaz, ölçülmedi sayılır, yerine bir deneme sitesi açılır",
    (_, surum) => {
      const secim = yerelDenemeSecimi([site("ornek-magaza", surum)], "0.82.0");
      expect(secim.acilacaklar).toEqual([]);
      expect(secim.olculmeyenler.map((s) => s.kodAdi)).toEqual(["ornek-magaza"]);
      expect(secim.ekDenemeSitesi).toBe(1);
    },
  );

  it("biri şu anki sürümde olan iki siteden yalnız eskisi ölçülmez, ek deneme sitesi gerekmez", () => {
    const secim = yerelDenemeSecimi(
      [site("ornek-magaza", "0.82.0"), site("tema-galerisi", "0.76.0")],
      "0.82.0",
    );
    expect(secim.acilacaklar.map((s) => s.kodAdi)).toEqual(["ornek-magaza"]);
    expect(secim.olculmeyenler.map((s) => s.kodAdi)).toEqual(["tema-galerisi"]);
    expect(secim.ekDenemeSitesi).toBe(0);
  });

  it("ölçülmedi satırı sitenin adını, iki sürümü ve nedenini söyler", () => {
    expect(olculmediSatiri(site("ornek-magaza", "0.81.0"), "0.82.0")).toBe(
      "ölçülmedi  ornek-magaza: kimlik 0.81.0, çekirdek 0.82.0; bu sürümün görüntüsü burada üretilemez, site kendi güncellemesinde ölçülür (kart 0132)",
    );
  });
});

// Denemenin seçimi kullanması yalnız yazıyla denetlenir: deneme Docker ister, birim testlerinde çalışmaz.
describe("yerel ortam denemesi seçimi kullanır", () => {
  const metin = readFileSync(join(kok, "komutlar", "yerel-ortam-testi.mts"), "utf8");
  const govde = metin.slice(metin.indexOf("const calistir = async"));

  it("Örnek Mağaza'yı seçimden geçirir, ölçülmeyeni yazar, ek deneme sitesini açar", () => {
    expect(govde).toMatch(/yerelDenemeSecimi\(\s*\[/);
    expect(govde).toMatch(/olculmeyenSatirlari\.push\(olculmediSatiri\(/);
    expect(metin).toMatch(
      /for \(const satir of olculmeyenSatirlari\) console\.log\(satir\);\s*process\.exitCode/,
    );
    expect(govde).toMatch(
      /length: secim\.ekDenemeSitesi \}, \(\) =>\s*denemeSitesiAc\(\{ epostaGonderir: true \}\)/,
    );
    expect(govde).toMatch(/siteler = await ortamiAc\(klasorler\)/);
  });

  it("siteyi doğrudan açmaz: Örnek Mağaza'nın klasörü yalnız seçimden geçer", () => {
    // Klasör değişkeni yalnız tanımında ve seçimin girdisinde geçer; açılan liste yalnız seçimden kurulur.
    expect(govde.match(/ornekKlasoru/g)?.length).toBe(3);
    expect(govde).toMatch(/klasor: ornekKlasoru,/);
    expect(govde).toMatch(/siteKlasorunuOku\(ornekKlasoru\)/);
    expect(govde).toMatch(
      /const klasorler = \[\s*\.\.\.secim\.acilacaklar\.map\(\(\{ klasor \}\) => klasor\),/,
    );
    expect(govde).not.toMatch(/ortamiAc\(\[join\(kok, "siteler"/);
    expect(govde).not.toMatch(/siteKlasorunuOku\(join\(kok, "siteler", kodAdi\)\)/);
  });
});
