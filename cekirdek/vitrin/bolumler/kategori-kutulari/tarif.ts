// Kategori kutuları (kart 0110, karar 0087): seçilen kategoriler görseli ve adıyla; ızgara ya da kaydırmalı.
// Kategorinin adı, adresi ve görseli kategoriden gelir (vitrin bağlamı). Silinen kategori görünmez. Rengi
// seçilmeyen kutu sırasıyla temanın kutu renklerini alır.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const kategoriKutulari = {
  tur: "kategori-kutulari",
  ad: "vitrin.bolum.kategoriKutulari.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", enCok: 60 },
    kategoriler: {
      tur: "liste",
      ad: "vitrin.bolum.kategoriKutulari.kategoriler",
      ogeAdi: "vitrin.bolum.kategoriKutulari.kategori",
      enAz: 1,
      enCok: 12,
      alanlar: {
        kategori: { tur: "kategori", ad: "vitrin.bolum.kategoriKutulari.kategori", zorunlu: true },
        zemin: {
          tur: "renk",
          ad: "vitrin.bolum.alan.zemin",
          renkler: ["kutu-1", "kutu-2", "kutu-3", "kutu-4", "kutu-5", "yuzey"],
        },
      },
    },
  },
  // Izgara: masaüstünde bir sırada beş, telefonda üç kutu (Canlı Çarşı taslağı). Kaydırmalı: kutular tek
  // sırada, önceki ve sonraki düğmeleriyle kayar.
  gorunumler: [
    { kod: "izgara", ad: "vitrin.bolum.gorunum.izgara" },
    { kod: "kaydirmali", ad: "vitrin.bolum.gorunum.kaydirmali" },
  ],
} as const satisfies BolumTarifi;
