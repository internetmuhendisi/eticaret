// Testlerin deneme teması ve deneme kütüphanesi (kart 0105). Çekirdeğin bölüm ve görünüm kayıtları bugün
// boştur (cekirdek/kayitlar/tema.ts); şemanın bölüm ve görünüm kuralları bu deneme kayıtlarıyla denenir.
import { varsayilanTemaDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { TemaKutuphanesi, TemaTanimiGirdisi } from "../sema.ts";

export const denemeKutuphanesi: TemaKutuphanesi = {
  bolumTurleri: {
    "deneme-afis": { alanlar: ["ana-sayfa"] },
    "deneme-menu": { alanlar: ["ust-kisim", "alt-kisim"] },
  },
  parcaGorunumleri: { "deneme-kart": ["dikey", "yatay"] },
};

// Her çağrı yeni bir kopya döndürür: testler bozabilir.
export const denemeTemasi = (): TemaTanimiGirdisi & {
  gorunumler: Record<string, string>;
} => ({
  degerler: structuredClone(varsayilanTemaDegerleri),
  magazaSecenekleri: {
    renkler: ["birincil", "afis"],
    yaziTipleri: {
      "yalniz-inter": {
        govde: "Inter Variable, system-ui, sans-serif",
        baslik: "Inter Variable, system-ui, sans-serif",
      },
    },
    koseler: { keskin: { kucuk: "0", orta: "0" }, yumusak: { kucuk: "6px", orta: "12px" } },
    dugmeBicimleri: { kare: "0", hap: "9999px" },
  },
  gorunumler: {},
  baslangicDuzeni: { "ust-kisim": [], "ana-sayfa": [], "alt-kisim": [] },
});

// Deneme kütüphanesiyle geçerli, bölümlü ve görünümlü tema.
export const kutuphaneliDenemeTemasi = () => ({
  ...denemeTemasi(),
  gorunumler: { "deneme-kart": "dikey" } as Record<string, string>,
  baslangicDuzeni: {
    "ust-kisim": [{ tur: "deneme-menu" }],
    "ana-sayfa": [{ tur: "deneme-afis" }, { tur: "deneme-afis", gizli: true }],
    "alt-kisim": [{ tur: "deneme-menu" }],
  },
});
