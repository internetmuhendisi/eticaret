// Testlerin deneme teması ve deneme kütüphanesi (kart 0105). Şemanın bölüm ve görünüm kuralları deneme
// bölümleriyle (cekirdek/katalog/deneme-bolumu/, kart 0106) ve deneme görünümüyle denenir.
import { varsayilanTemaDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import { denemeKutuphanesi as denemeBolumleri } from "../../katalog/deneme-bolumu/tarif.ts";
import type { BaslangicDuzeniGirdisi } from "../../vitrin/bolum-kutuphanesi/duzen.ts";
import type { TemaKutuphanesi, TemaTanimiGirdisi } from "../sema.ts";

export const denemeKutuphanesi: TemaKutuphanesi = {
  bolumTurleri: denemeBolumleri,
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
  // Çekirdeğin parça kaydıyla geçer (kart 0109).
  gorunumler: { "urun-karti": "dikey", "urun-filtresi": "solda" },
  baslangicDuzeni: { "ust-kisim": [], "ana-sayfa": [], "alt-kisim": [] },
});

// Deneme kütüphanesiyle geçerli, bölümlü ve görünümlü tema.
export const kutuphaneliDenemeTemasi = () => ({
  ...denemeTemasi(),
  gorunumler: { "deneme-kart": "dikey" } as Record<string, string>,
  baslangicDuzeni: {
    "ust-kisim": [{ tur: "deneme-seridi", degerler: { metin: "Duyuru" } }],
    "ana-sayfa": [
      { tur: "deneme-bolumu", degerler: { baslik: "Seçkiler" } },
      { tur: "deneme-bolumu", gorunum: "dar", gizli: true, degerler: { baslik: "Yeniler" } },
    ],
    "alt-kisim": [{ tur: "deneme-seridi", degerler: { metin: "Alt bilgi" } }],
  } as BaslangicDuzeniGirdisi,
});
