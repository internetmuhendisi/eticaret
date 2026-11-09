// Marka logoları (kart 0111, karar 0088): seçilen markalar logolarıyla, markanın sayfasına bağlı. Logosu
// olmayan markanın adı yazıyla görünür (kullanıcı kararı). Silinen marka görünmez; hiçbiri kalmazsa bölüm
// çizilmez.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const markaLogolari = {
  tur: "marka-logolari",
  ad: "vitrin.bolum.markaLogolari.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", enCok: 60 },
    markalar: {
      tur: "liste",
      ad: "vitrin.bolum.markaLogolari.markalar",
      ogeAdi: "vitrin.bolum.markaLogolari.marka",
      enAz: 1,
      enCok: 12,
      alanlar: {
        marka: { tur: "marka", ad: "vitrin.bolum.markaLogolari.marka", zorunlu: true },
      },
    },
  },
  // Izgara: masaüstünde bir sırada beş, telefonda iki kutu (Canlı Çarşı taslağı). Kaydırmalı: tek sıra.
  gorunumler: [
    { kod: "izgara", ad: "vitrin.bolum.gorunum.izgara" },
    { kod: "kaydirmali", ad: "vitrin.bolum.gorunum.kaydirmali" },
  ],
} as const satisfies BolumTarifi;
