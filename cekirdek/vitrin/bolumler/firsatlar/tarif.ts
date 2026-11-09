// Geri sayımlı fırsatlar (kart 0111, karar 0088; kullanıcı kararıyla temel pakette). Bölüm bir kaynak seçmez:
// bitişi olan süren indirimleri en yakın biteni önce gösterir (cekirdek/vitrin/urun-kaynagi.ts). Bitiş
// çekirdeğin indiriminden gelir, elle girilmez. Süresiz indirim görünmez; indirimi biten ürün bölümden düşer
// (sayfa açıkken de). Ürünü olmayan bölüm çizilmez.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";
import { kartGorunumuAlani } from "../ortak/urun-alanlari.ts";

export const firsatlar = {
  tur: "firsatlar",
  ad: "vitrin.bolum.firsatlar.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    ustYazi: { tur: "metin", ad: "vitrin.bolum.alan.ustYazi", enCok: 40 },
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", enCok: 60 },
    // Kaç ürün gösterileceği (fırsat kaynağının adedi, aşağıdaki firsatAdedi).
    adet: {
      tur: "secim",
      ad: "vitrin.bolum.firsatlar.adet",
      secenekler: [
        { kod: "iki", ad: "vitrin.bolum.firsatlar.adet2" },
        { kod: "dort", ad: "vitrin.bolum.firsatlar.adet4" },
        { kod: "alti", ad: "vitrin.bolum.firsatlar.adet6" },
        { kod: "sekiz", ad: "vitrin.bolum.firsatlar.adet8" },
      ],
      varsayilan: "iki",
    },
    kartGorunumu: kartGorunumuAlani,
    zemin: {
      tur: "renk",
      ad: "vitrin.bolum.alan.zemin",
      renkler: [
        "birincil",
        "afis",
        "alt-kisim",
        "yuzey",
        "kutu-1",
        "kutu-2",
        "kutu-3",
        "kutu-4",
        "kutu-5",
      ],
    },
  },
  firsatAdedi: { alan: "adet", adetler: { iki: 2, dort: 4, alti: 6, sekiz: 8 } },
  // Yan panelli: üst yazı, başlık ve en yakın bitişe büyük sayaç solda, ürünler sağda (Canlı Çarşı taslağı).
  // Panelsiz: başlık ve sayaç üstte, ürünler bütün genişlikte. Her kartın üstünde kendi kalan süresi yazar.
  gorunumler: [
    { kod: "yan-panelli", ad: "vitrin.bolum.gorunum.yanPanelli" },
    { kod: "panelsiz", ad: "vitrin.bolum.gorunum.panelsiz" },
  ],
} as const satisfies BolumTarifi;
