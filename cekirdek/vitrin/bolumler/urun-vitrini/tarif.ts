// Ürün vitrini (kart 0111, karar 0088): başlık, ürün kaynağı ve adedi, ızgara ya da kaydırmalı, ürün kartının
// görünümü ve isteğe bağlı yan afiş. Ürünler ürün kaynağından gelir (cekirdek/vitrin/urun-kaynagi.ts); ürünü
// olmayan bölüm çizilmez.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";
import { kartGorunumuAlani, tumuBaglantisiAlani, yanAfisAlanlari } from "../ortak/urun-alanlari.ts";

export const urunVitrini = {
  tur: "urun-vitrini",
  ad: "vitrin.bolum.urunVitrini.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", enCok: 60 },
    urunler: { tur: "urun-kaynagi", ad: "vitrin.bolum.urun.kaynak", zorunlu: true, enCokUrun: 12 },
    tumuBaglantisi: tumuBaglantisiAlani,
    kartGorunumu: kartGorunumuAlani,
    ...yanAfisAlanlari,
  },
  // Izgara: masaüstünde dört, telefonda iki kart (yatay kartta telefonda bir); yan afişle masaüstünde üç.
  // Kaydırmalı: kartlar tek sırada, önceki ve sonraki düğmeleriyle kayar.
  gorunumler: [
    { kod: "izgara", ad: "vitrin.bolum.gorunum.izgara" },
    { kod: "kaydirmali", ad: "vitrin.bolum.gorunum.kaydirmali" },
  ],
} as const satisfies BolumTarifi;
