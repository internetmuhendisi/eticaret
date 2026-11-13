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
      renkler: ["alt-kisim", "afis", "birincil"],
    },
  },
  // İki yana: metin solda, mağazanın telefonu sağda (masaüstünde; Canlı Çarşı taslağı). Ortalı: yalnız metin,
  // kalın.
  gorunumler: [
    { kod: "iki-yana", ad: "vitrin.bolum.gorunum.ikiYana" },
    { kod: "ortali", ad: "vitrin.bolum.gorunum.ortali" },
  ],
  // 0.40.0'da ince görünüm kalktı (kart 0108, karar 0084): ortalanmış duyurunun ince yazılı çeşidiydi.
  eskiKodlar: { gorunumler: { ince: "ortali" } },
} as const satisfies BolumTarifi;
