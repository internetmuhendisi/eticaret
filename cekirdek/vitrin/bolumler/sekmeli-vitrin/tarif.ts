// Sekmeli vitrin (kart 0111, karar 0088): her sekme kendi başlığı ve ürün kaynağıyla. Ürünü olmayan sekme
// görünmez; hiçbir sekmenin ürünü yoksa bölüm çizilmez.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";
import { kartGorunumuAlani } from "../ortak/urun-alanlari.ts";

export const sekmeliVitrin = {
  tur: "sekmeli-vitrin",
  ad: "vitrin.bolum.sekmeliVitrin.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", enCok: 60 },
    sekmeler: {
      tur: "liste",
      ad: "vitrin.bolum.sekmeliVitrin.sekmeler",
      ogeAdi: "vitrin.bolum.sekmeliVitrin.sekme",
      enAz: 2,
      enCok: 6,
      alanlar: {
        baslik: {
          tur: "metin",
          ad: "vitrin.bolum.sekmeliVitrin.sekmeBasligi",
          zorunlu: true,
          enCok: 30,
        },
        urunler: {
          tur: "urun-kaynagi",
          ad: "vitrin.bolum.urun.kaynak",
          zorunlu: true,
          enCokUrun: 12,
        },
      },
    },
    kartGorunumu: kartGorunumuAlani,
  },
  // Sekmeler başlığın yanında; ürünler ızgarada ya da kaydırmalı şeritte (ürün vitriniyle aynı).
  gorunumler: [
    { kod: "izgara", ad: "vitrin.bolum.gorunum.izgara" },
    { kod: "kaydirmali", ad: "vitrin.bolum.gorunum.kaydirmali" },
  ],
} as const satisfies BolumTarifi;
