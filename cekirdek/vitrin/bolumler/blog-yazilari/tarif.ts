// Blog yazıları (kart 0112, karar 0090): son yazılar ya da seçilen blog kategorisinin yazıları; görsel, tarih,
// başlık ve özet. Blog işlevine bağlıdır: işlev yazılana kadar vitrinde çizilmez, panel nedenini gösterir. Yazısı
// olmayan bölüm çizilmez.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";
import { tumuBaglantisiAlani } from "../ortak/urun-alanlari.ts";

// Seçeneğin kodundan yazı sayısına.
export const blogAdetleri = { uc: 3, alti: 6 } as const;

export const blogYazilari = {
  tur: "blog-yazilari",
  ad: "vitrin.bolum.blogYazilari.ad",
  duzenAlanlari: ["ana-sayfa"],
  islev: "blog",
  alanlar: {
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", enCok: 60 },
    // Seçilmezse son yazılar gelir.
    kategori: {
      tur: "blog-kategorisi",
      ad: "vitrin.bolum.blogYazilari.kategori",
      aciklama: "vitrin.bolum.blogYazilari.kategoriAciklamasi",
    },
    adet: {
      tur: "secim",
      ad: "vitrin.bolum.blogYazilari.adet",
      secenekler: [
        { kod: "uc", ad: "vitrin.bolum.blogYazilari.adet3" },
        { kod: "alti", ad: "vitrin.bolum.blogYazilari.adet6" },
      ],
      varsayilan: "uc",
    },
    tumuBaglantisi: tumuBaglantisiAlani,
  },
  // Izgara: masaüstünde üç sütun, telefonda bir (Canlı Çarşı taslağı). Kaydırmalı: tek sırada kayar.
  gorunumler: [
    { kod: "izgara", ad: "vitrin.bolum.gorunum.izgara" },
    { kod: "kaydirmali", ad: "vitrin.bolum.gorunum.kaydirmali" },
  ],
} as const satisfies BolumTarifi;
