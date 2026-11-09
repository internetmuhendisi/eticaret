// Duyuru şeridi (kart 0108): üst kısmın en üstünde kısa bir duyuru, isteğe bağlı bağlantıyla.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const duyuruSeridi = {
  tur: "duyuru-seridi",
  ad: "vitrin.bolum.duyuruSeridi.ad",
  duzenAlanlari: ["ust-kisim"],
  alanlar: {
    metin: { tur: "metin", ad: "vitrin.bolum.duyuruSeridi.metin", zorunlu: true, enCok: 120 },
    baglanti: { tur: "baglanti", ad: "vitrin.bolum.duyuruSeridi.baglanti" },
    // Zemin ve üstündeki yazı birlikte seçilir: her renk okunur çiftiyle çizilir (gorunum.tsx).
    zemin: {
      tur: "renk",
      ad: "vitrin.bolum.duyuruSeridi.zemin",
      renkler: ["afis", "birincil", "alt-kisim"],
    },
  },
  gorunumler: [
    { kod: "ortali", ad: "vitrin.bolum.gorunum.ortali" },
    { kod: "ince", ad: "vitrin.bolum.gorunum.ince" },
  ],
} as const satisfies BolumTarifi;
