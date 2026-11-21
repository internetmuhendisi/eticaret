// Ürün ekranının seçenekler bölümünün kuralları (kart 0264, karar 0163): birleşim satırları seçeneklerin ve değerlerin
// sırasıyla bütün birleşimlerdir; basit ürünün birimi seçenek eklenince ilk satırın alanlarını verir, yeni seçenekte
// var olan birleşimler ilk değerin satırına geçer (servisin kuralıyla aynı), yeni değerin satırı boştur; kayıtlı ya da
// dönen satır bütün alanlarını (boşu null) gönderir, yeni satır yalnız dolu alanlarını; kayıtlı değeri çıkarmanın
// sildiği birleşim sayısı; çıkan değerin ekranda yazılan alanları da çıkar.
import { describe, expect, it } from "vitest";
import {
  type BirlesimFormu,
  birlesimAnahtari,
  birlesimleriBudar,
  birlesimSatirlari,
  bosBirlesim,
  silinecekBirlesimSayisi,
  type VaryantFormu,
  varyantGirdisi,
} from "../urunler/varyant-formu";

const alan = (stokKodu: string, ek: Partial<BirlesimFormu> = {}): BirlesimFormu => ({
  ...bosBirlesim,
  stokKodu,
  ...ek,
});

// Kayıtlı Beden (S, M) ve Renk (Gri, Lacivert), dört birleşim.
const kayitli: VaryantFormu = {
  secenekler: [
    {
      anahtar: "beden",
      kimlik: "beden",
      ad: "Beden",
      degerler: [
        { anahtar: "s", kimlik: "s", ad: "S" },
        { anahtar: "m", kimlik: "m", ad: "M" },
      ],
    },
    {
      anahtar: "renk",
      kimlik: "renk",
      ad: "Renk",
      degerler: [
        { anahtar: "gri", kimlik: "gri", ad: "Gri" },
        { anahtar: "lcv", kimlik: "lcv", ad: "Lacivert" },
      ],
    },
  ],
  birlesimler: {
    [birlesimAnahtari(["s", "gri"])]: alan("S-GRI", { agirlik: "0,4", gorsel: "g1" }),
    [birlesimAnahtari(["s", "lcv"])]: alan("S-LCV"),
    [birlesimAnahtari(["m", "gri"])]: alan("M-GRI"),
    [birlesimAnahtari(["m", "lcv"])]: alan("M-LCV"),
  },
};
const ad = (satir: { degerler: { ad: string }[] }) => satir.degerler.map((d) => d.ad).join("/");

describe("birleşim satırları", () => {
  it("bütün birleşimler, seçeneklerin ve değerlerin sırasıyla; anahtar sıradan bağımsız", () => {
    const satirlar = birlesimSatirlari(kayitli, kayitli, undefined);
    expect(satirlar.map(ad)).toEqual(["S/Gri", "S/Lacivert", "M/Gri", "M/Lacivert"]);
    expect(satirlar.map((s) => s.yol)).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]);
    expect(satirlar.every((s) => s.kayitli)).toBe(true);
    const ters = { ...kayitli, secenekler: kayitli.secenekler.toReversed() };
    const tersSatirlar = birlesimSatirlari(ters, kayitli, undefined);
    expect(tersSatirlar.map(ad)).toEqual(["Gri/S", "Gri/M", "Lacivert/S", "Lacivert/M"]);
    expect(tersSatirlar[0]?.alanlar.stokKodu).toBe("S-GRI");
    expect(birlesimSatirlari({ secenekler: [], birlesimler: {} }, kayitli, undefined)).toEqual([]);
  });

  it("basit ürüne seçenek eklenince ilk satır basit birimin alanlarını alır, ötekiler boş ve yenidir", () => {
    const bos: VaryantFormu = { secenekler: [], birlesimler: {} };
    const form: VaryantFormu = {
      secenekler: [
        {
          anahtar: "y1",
          ad: "Beden",
          degerler: [
            { anahtar: "y2", ad: "S" },
            { anahtar: "y3", ad: "M" },
          ],
        },
      ],
      birlesimler: {},
    };
    const satirlar = birlesimSatirlari(form, bos, alan("BASIT", { barkod: "96385074" }));
    expect(satirlar.map((s) => [ad(s), s.alanlar.stokKodu, s.kayitli])).toEqual([
      ["S", "BASIT", true],
      ["M", "", false],
    ]);
  });

  it("yeni seçenekte var olan birleşim ilk değerin satırına geçer; yeni değerin satırı boştur", () => {
    const form: VaryantFormu = {
      secenekler: [
        ...kayitli.secenekler,
        {
          anahtar: "kumas",
          ad: "Kumaş",
          degerler: [
            { anahtar: "pamuk", ad: "Pamuk" },
            { anahtar: "polar", ad: "Polar" },
          ],
        },
      ],
      birlesimler: {},
    };
    const satirlar = birlesimSatirlari(form, kayitli, undefined);
    expect(satirlar.slice(0, 2).map((s) => [ad(s), s.alanlar.stokKodu, s.kayitli])).toEqual([
      ["S/Gri/Pamuk", "S-GRI", true],
      ["S/Gri/Polar", "", false],
    ]);
    // Kayıtlı seçeneğe eklenen değer dönmez: kendi satırı yenidir.
    const degerli: VaryantFormu = {
      ...kayitli,
      secenekler: kayitli.secenekler.map((s, i) =>
        i === 0 ? { ...s, degerler: [...s.degerler, { anahtar: "l", ad: "L" }] } : s,
      ),
    };
    const sonuncu = birlesimSatirlari(degerli, kayitli, undefined).at(-1);
    expect([sonuncu && ad(sonuncu), sonuncu?.kayitli]).toEqual(["L/Lacivert", false]);
  });

  it("ekranda yazılan alan satırın alanıdır", () => {
    const form = {
      ...kayitli,
      birlesimler: { ...kayitli.birlesimler, [birlesimAnahtari(["m", "lcv"])]: alan("YENI") },
    };
    expect(birlesimSatirlari(form, kayitli, undefined)[3]?.alanlar.stokKodu).toBe("YENI");
  });
});

describe("sunucunun girdisi", () => {
  it("seçenekler kimlikleriyle; kayıtlı satır boş alanı null, yeni satır yalnız dolu alanı gönderir", () => {
    const form: VaryantFormu = {
      ...kayitli,
      secenekler: kayitli.secenekler.map((s, i) =>
        i === 0 ? { ...s, degerler: [...s.degerler, { anahtar: "l", ad: "L" }] } : s,
      ),
      birlesimler: {
        ...kayitli.birlesimler,
        [birlesimAnahtari(["l", "gri"])]: alan("L-GRI"),
      },
    };
    const girdi = varyantGirdisi(birlesimSatirlari(form, kayitli, undefined), form, kayitli);
    // Ekranın bildiği kayıtlı kimlikler: sunucu bunlardan başkasını görürse yazmaz.
    expect(girdi.gorulen).toEqual({
      secenekler: ["beden", "renk"],
      degerler: ["s", "m", "gri", "lcv"],
    });
    expect(girdi.secenekler[0]).toEqual({
      kimlik: "beden",
      ad: "Beden",
      degerler: [{ kimlik: "s", ad: "S" }, { kimlik: "m", ad: "M" }, { ad: "L" }],
    });
    expect(girdi.birlesimler[0]).toEqual({
      degerler: [0, 0],
      stokKodu: "S-GRI",
      barkod: null,
      agirlik: "0,4",
      gorsel: "g1",
    });
    expect(girdi.birlesimler.slice(4)).toEqual([
      { degerler: [2, 0], stokKodu: "L-GRI" },
      { degerler: [2, 1] },
    ]);
  });
});

describe("çıkarmak", () => {
  it("kayıtlı değeri çıkarmak anahtarında o değer geçen birleşimleri siler; ekranda yazılanlar da çıkar", () => {
    expect(silinecekBirlesimSayisi(kayitli, "s")).toBe(2);
    expect(silinecekBirlesimSayisi(kayitli, "yok")).toBe(0);
    expect(Object.keys(birlesimleriBudar(kayitli.birlesimler, ["gri"]))).toEqual([
      birlesimAnahtari(["s", "lcv"]),
      birlesimAnahtari(["m", "lcv"]),
    ]);
  });
});
