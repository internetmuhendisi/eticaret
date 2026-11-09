// Kampanya afişleri (kart 0110, karar 0087): yan yana iki ya da üç afiş; her birinde görsel, rozet, başlık,
// metin, düğme yazısı, bağlantı ve zemin rengi. Bağlantısı olan afişin tamamı tıklanır. Rengi seçilmeyen
// afiş sırasıyla temanın kutu renklerini alır.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const kampanyaAfisleri = {
  tur: "kampanya-afisleri",
  ad: "vitrin.bolum.kampanyaAfisleri.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    afisler: {
      tur: "liste",
      ad: "vitrin.bolum.kampanyaAfisleri.afisler",
      ogeAdi: "vitrin.bolum.kampanyaAfisleri.afis",
      enAz: 2,
      enCok: 3,
      alanlar: {
        gorsel: { tur: "gorsel", ad: "vitrin.bolum.alan.gorsel" },
        gorselMetni: { tur: "metin", ad: "vitrin.bolum.alan.gorselMetni", enCok: 160 },
        rozet: { tur: "metin", ad: "vitrin.bolum.alan.rozet", enCok: 30 },
        baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", zorunlu: true, enCok: 60 },
        metin: { tur: "uzun-metin", ad: "vitrin.bolum.alan.metin", enCok: 160 },
        dugmeYazisi: { tur: "metin", ad: "vitrin.bolum.alan.dugmeYazisi", enCok: 30 },
        baglanti: { tur: "baglanti", ad: "vitrin.bolum.alan.baglanti" },
        zemin: {
          tur: "renk",
          ad: "vitrin.bolum.alan.zemin",
          renkler: ["kutu-1", "kutu-2", "kutu-3", "kutu-4", "kutu-5", "afis", "yuzey"],
        },
      },
    },
  },
  // Yatay: yazı solda, görsel sağda (Canlı Çarşı taslağı). Dikey: görsel üstte, yazı altta.
  gorunumler: [
    { kod: "yatay", ad: "vitrin.bolum.gorunum.yatay" },
    { kod: "dikey", ad: "vitrin.bolum.gorunum.dikey" },
  ],
} as const satisfies BolumTarifi;
