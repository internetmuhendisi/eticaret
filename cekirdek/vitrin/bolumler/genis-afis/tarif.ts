// Geniş afiş (kart 0110, karar 0087): tek görsel, üst yazı, başlık, metin, düğme yazısı ve bağlantı; içerik
// genişliğinde. Bağlantısı olan afişin tamamı tıklanır.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const genisAfis = {
  tur: "genis-afis",
  ad: "vitrin.bolum.genisAfis.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    gorsel: { tur: "gorsel", ad: "vitrin.bolum.alan.gorsel" },
    gorselMetni: { tur: "metin", ad: "vitrin.bolum.alan.gorselMetni", enCok: 160 },
    ustYazi: { tur: "metin", ad: "vitrin.bolum.alan.ustYazi", enCok: 40 },
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", zorunlu: true, enCok: 80 },
    metin: { tur: "uzun-metin", ad: "vitrin.bolum.alan.metin", enCok: 240 },
    dugmeYazisi: { tur: "metin", ad: "vitrin.bolum.alan.dugmeYazisi", enCok: 30 },
    baglanti: { tur: "baglanti", ad: "vitrin.bolum.alan.baglanti" },
    zemin: {
      tur: "renk",
      ad: "vitrin.bolum.alan.zemin",
      renkler: ["alt-kisim", "afis", "yuzey", "kutu-1", "kutu-2", "kutu-3", "kutu-4", "kutu-5"],
    },
  },
  // Görsel ve yazı yan yana, zemin renginde bir kutuda (Canlı Çarşı taslağı); görsel bütün genişlikte, yazı onun
  // üstünde zemin renginde bir kutuda.
  gorunumler: [
    { kod: "yan-yana", ad: "vitrin.bolum.gorunum.yanYana" },
    { kod: "tam-genislik", ad: "vitrin.bolum.gorunum.tamGenislik" },
  ],
} as const satisfies BolumTarifi;
