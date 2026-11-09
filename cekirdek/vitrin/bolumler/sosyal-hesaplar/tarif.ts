// Sosyal hesaplar (kart 0108): mağaza ayarındaki hesaplar (sosyalHesaplar), sitenin adıyla. İkon setinde marka
// logoları olmadığı için hesap yazıyla gösterilir (karar 0083).
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const sosyalHesaplar = {
  tur: "sosyal-hesaplar",
  ad: "vitrin.bolum.sosyalHesaplar.ad",
  duzenAlanlari: ["alt-kisim"],
  alanlar: {
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", enCok: 60 },
  },
  gorunumler: [
    { kod: "liste", ad: "vitrin.bolum.gorunum.liste" },
    { kod: "yatay", ad: "vitrin.bolum.gorunum.yatay" },
  ],
} as const satisfies BolumTarifi;
