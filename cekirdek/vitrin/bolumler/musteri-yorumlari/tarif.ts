// Müşteri yorumları (kart 0112, karar 0090): onaylanmış yorumlardan mağaza sahibinin yorum listesinde "ana
// sayfada göster" diye işaretledikleri ya da en yeniler (kullanıcı kararı); puan, yorum ve müşterinin adı. Yorum
// işlevine bağlıdır: işlev yazılana kadar vitrinde çizilmez, panel nedenini gösterir. Yorumu olmayan bölüm çizilmez.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

// Seçeneğin kodundan yorum sayısına.
export const yorumAdetleri = { uc: 3, alti: 6 } as const;

export const musteriYorumlari = {
  tur: "musteri-yorumlari",
  ad: "vitrin.bolum.musteriYorumlari.ad",
  duzenAlanlari: ["ana-sayfa"],
  islev: "yorum",
  alanlar: {
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", enCok: 60 },
    kaynak: {
      tur: "secim",
      ad: "vitrin.bolum.musteriYorumlari.kaynak",
      aciklama: "vitrin.bolum.musteriYorumlari.kaynakAciklamasi",
      secenekler: [
        { kod: "isaretlenenler", ad: "vitrin.bolum.musteriYorumlari.isaretlenenler" },
        { kod: "en-yeni", ad: "vitrin.bolum.musteriYorumlari.enYeni" },
      ],
      varsayilan: "isaretlenenler",
    },
    adet: {
      tur: "secim",
      ad: "vitrin.bolum.musteriYorumlari.adet",
      secenekler: [
        { kod: "uc", ad: "vitrin.bolum.musteriYorumlari.adet3" },
        { kod: "alti", ad: "vitrin.bolum.musteriYorumlari.adet6" },
      ],
      varsayilan: "uc",
    },
  },
  // Kartlar: masaüstünde üç sütun, telefonda bir (Canlı Çarşı taslağı). Kaydırmalı: tek sırada kayar.
  gorunumler: [
    { kod: "kartlar", ad: "vitrin.bolum.gorunum.kartlar" },
    { kod: "kaydirmali", ad: "vitrin.bolum.gorunum.kaydirmali" },
  ],
} as const satisfies BolumTarifi;
