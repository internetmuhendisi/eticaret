// Site klasörlerinin kimlik ve ayar şemasından geçtiğini, bozuk klasörlerin geçemediğini gösterir (kart 0010).
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ayarBilgileri, ayarSemasi, onekTuret } from "../ayarlar";
import { siteKlasorunuDogrula } from "../site-klasoru";

const siteler = join(import.meta.dirname, "..", "..", "..", "siteler");
const ornekler = join(import.meta.dirname, "ornek-siteler");

const dogrula = (ornek: string) => siteKlasorunuDogrula(join(ornekler, ornek));

describe("siteler/ altındaki her site", () => {
  const klasorler = readdirSync(siteler, { withFileTypes: true }).filter((g) => g.isDirectory());

  it("en az bir site var", () => {
    expect(klasorler.length).toBeGreaterThan(0);
  });

  for (const { name } of klasorler) {
    it(`${name} doğrulamadan geçer`, () => {
      const sonuc = siteKlasorunuDogrula(join(siteler, name));
      expect(sonuc.gecerli ? [] : sonuc.hatalar).toEqual([]);
    });
  }
});

describe("ayar şeması", () => {
  it("her ayarın açıklaması ve sahibi yazılı", () => {
    for (const [ad, sema] of Object.entries(ayarSemasi.shape)) {
      expect(ayarBilgileri.get(sema), ad).toBeDefined();
    }
  });

  it("boş ayar dosyası bütün varsayılanları verir", () => {
    expect(ayarSemasi.parse({})).toEqual({
      ulke: "TR",
      dil: "tr",
      paraBirimi: "TRY",
      paraBicimi: {
        simge: "₺",
        simgeYeri: "sonda",
        simgeBoslugu: true,
        binlikAyirici: ".",
        ondalikAyirici: ",",
        ondalikSayisi: 2,
      },
      saatDilimi: "Europe/Istanbul",
      agirlikBirimi: "kg",
      boyutBirimi: "cm",
      siparisBaslangici: 1001,
      temaDegistirilebilir: true,
      vitrindeAltyapiAdi: false,
    });
  });

  it("tanınmayan saat dilimini kabul etmez", () => {
    expect(ayarSemasi.safeParse({ saatDilimi: "Avrupa/Istanbul" }).success).toBe(false);
  });

  it("sipariş önekini görünen addan türetir", () => {
    expect(onekTuret("Öğün Evi")).toBe("OGU");
    expect(onekTuret("ılık çay")).toBe("ILI");
    expect(onekTuret("Şık İş")).toBe("SIK");
  });
});

describe("örnek klasörler", () => {
  it("geçerli klasör varsayılanlarla ve türetilmiş önekle okunur", () => {
    const sonuc = dogrula("gecerli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.kimlik.gorunenAd).toBe("Deneme Dükkanı");
    expect(sonuc.site.ayarlar.siparisOneki).toBe("DEN");
    expect(sonuc.site.ayarlar.siparisBaslangici).toBe(1001);
  });

  const bozuklar: [ornek: string, beklenenHata: string][] = [
    ["bilinmeyen-ayar", "ayarlar.json: (dosyanın tamamı)"],
    ["yanlis-tur", "ayarlar.json: siparisBaslangici"],
    ["eksik-kimlik-alani", "kimlik.json: cekirdekSurumu"],
    ["kod-adi-farkli", "kimlik.json: kodAdi: klasörün adıyla aynı olmalı"],
    ["ayar-dosyasi-yok", "ayarlar.json: dosya yok."],
  ];

  for (const [ornek, beklenenHata] of bozuklar) {
    it(`${ornek} doğrulamadan geçemez`, () => {
      const sonuc = dogrula(ornek);
      expect(sonuc.gecerli).toBe(false);
      if (sonuc.gecerli) return;
      expect(
        sonuc.hatalar.some((hata) => hata.startsWith(beklenenHata)),
        sonuc.hatalar.join("\n"),
      ).toBe(true);
    });
  }

  it("olmayan klasör doğrulamadan geçemez", () => {
    expect(dogrula("olmayan").gecerli).toBe(false);
  });
});
