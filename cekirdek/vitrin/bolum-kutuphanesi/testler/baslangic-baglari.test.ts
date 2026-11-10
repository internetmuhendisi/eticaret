// Başlangıç düzenindeki adres adlarının kimliğe çevrilmesi (kart 0114, karar 0092), veritabanısız: bulunamayan
// bağın kendi öğesiyle düşmesi. Aynı liste öğesinde iki bağ bulunamayınca öğe bir kez düşer (çözümleyici
// çökmez); sekmeli vitrinde elle seçimi boş kalan sekme yalnız kendisi düşer. Gerçek veritabanıyla kurulum
// cekirdek/moduller/duzen/testler/baslangic.test.ts'dedir.
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { type BolumKutuphanesi, baslangicBaglariniCoz, type Duzen } from "../duzen.ts";
import { bolumKutuphanesi } from "../kutuphane.ts";
import type { BolumTarifi } from "../tarif.ts";

// Liste öğesinde üç bağ (biri elle seçim) olan deneme bölümü: bugün gerçek kütüphanede yoktur, kart 0115'te kategori kutusu
// kategori ve görselle böyle olacak.
const ikiBagli = {
  tur: "iki-bagli",
  ad: "gelistirme.bolum.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    ogeler: {
      tur: "liste",
      ad: "gelistirme.bolum.alan.maddeler",
      ogeAdi: "gelistirme.bolum.alan.madde",
      enAz: 1,
      enCok: 6,
      alanlar: {
        kategori: { tur: "kategori", ad: "gelistirme.bolum.alan.kategori", zorunlu: true },
        marka: { tur: "marka", ad: "gelistirme.bolum.alan.marka", zorunlu: true },
        urunler: { tur: "urun-kaynagi", ad: "gelistirme.bolum.alan.urunler", enCokUrun: 4 },
      },
    },
  },
  gorunumler: [{ kod: "duz", ad: "gelistirme.bolum.gorunum.duz" }],
} as const satisfies BolumTarifi;
const kutuphane: BolumKutuphanesi = { ...bolumKutuphanesi, "iki-bagli": ikiBagli };

const kimlikler = {
  kategori: new Map([["giyim", randomUUID()]]),
  marka: new Map([["deneme-ses", randomUUID()]]),
  etiket: new Map<string, string>(),
  urun: new Map([
    ["kupa", randomUUID()],
    ["atki", randomUUID()],
  ]),
};

const anaSayfa = (bolumler: Duzen["ana-sayfa"]): Duzen => ({
  "ust-kisim": [],
  "ana-sayfa": bolumler,
  "alt-kisim": [],
});
const bolum = (tur: string, degerler: Record<string, unknown>) => ({
  kimlik: randomUUID(),
  tur,
  gorunum: tur === "iki-bagli" ? "duz" : "izgara",
  gizli: false,
  degerler,
});

describe("bulunamayan bağ kendi öğesiyle düşer", () => {
  it("aynı liste öğesinde birden çok bağ (elle seçimdeki ürün de) bulunamayınca öğe bir kez düşer, öteki öğe kalır", () => {
    const { duzen, bulunamayanlar } = baslangicBaglariniCoz(
      anaSayfa([
        bolum("iki-bagli", {
          ogeler: [
            {
              kategori: "olmayan",
              marka: "olmayan-marka",
              urunler: { tur: "elle", urunler: ["kupa", "olmayan-urun"] },
            },
            { kategori: "giyim", marka: "deneme-ses" },
          ],
        }),
      ]),
      kutuphane,
      kimlikler,
    );
    expect(duzen["ana-sayfa"][0]?.degerler).toEqual({
      ogeler: [
        { kategori: kimlikler.kategori.get("giyim"), marka: kimlikler.marka.get("deneme-ses") },
      ],
    });
    expect(bulunamayanlar).toEqual([
      "ana-sayfa iki-bagli: kategori olmayan",
      "ana-sayfa iki-bagli: marka olmayan-marka",
      "ana-sayfa iki-bagli: urun olmayan-urun",
    ]);
  });

  it("sekmeli vitrinde elle seçimi boş kalan sekme yalnız kendisi düşer", () => {
    const { duzen } = baslangicBaglariniCoz(
      anaSayfa([
        bolum("sekmeli-vitrin", {
          sekmeler: [
            { baslik: "A", urunler: { tur: "elle", urunler: ["olmayan"] } },
            { baslik: "B", urunler: { tur: "elle", urunler: ["kupa", "olmayan-iki"] } },
            { baslik: "C", urunler: { tur: "elle", urunler: ["atki"] } },
          ],
        }),
      ]),
      bolumKutuphanesi,
      kimlikler,
    );
    expect(duzen["ana-sayfa"][0]?.degerler).toEqual({
      sekmeler: [
        { baslik: "B", urunler: { tur: "elle", urunler: [kimlikler.urun.get("kupa")] } },
        { baslik: "C", urunler: { tur: "elle", urunler: [kimlikler.urun.get("atki")] } },
      ],
    });
  });

  it("düşen sekmelerle en az sınırının altına inen sekmeli vitrin düşer", () => {
    const { duzen } = baslangicBaglariniCoz(
      anaSayfa([
        bolum("sekmeli-vitrin", {
          sekmeler: [
            { baslik: "A", urunler: { tur: "elle", urunler: ["olmayan"] } },
            { baslik: "C", urunler: { tur: "elle", urunler: ["atki"] } },
          ],
        }),
      ]),
      bolumKutuphanesi,
      kimlikler,
    );
    expect(duzen["ana-sayfa"]).toEqual([]);
  });
});
