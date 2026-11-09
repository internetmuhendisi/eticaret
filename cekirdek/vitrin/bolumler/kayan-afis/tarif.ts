// Kayan büyük afiş (kart 0110, karar 0087); panelde adı "Slider" (kullanıcı kararı). Birden çok slayt: her
// slaytta masaüstü görseli, isteğe bağlı ayrı telefon görseli, üst yazı, başlık, metin, düğme ve bağlantı.
// Slaytlar kendiliğinden geçer (süre bölümün ayarı, varsayılan 6 saniye); durdurma düğmesi her zaman vardır,
// hareket azaltma tercihinde kendiliğinden geçmez (gorunum.tsx, kaydirici.tsx).
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

// Kendiliğinden geçme süreleri, milisaniye; kapalıda geçmez.
export const gecisSureleri = { kisa: 4000, orta: 6000, uzun: 8000 } as const;

export const kayanAfis = {
  tur: "kayan-afis",
  ad: "vitrin.bolum.kayanAfis.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    slaytlar: {
      tur: "liste",
      ad: "vitrin.bolum.kayanAfis.slaytlar",
      ogeAdi: "vitrin.bolum.kayanAfis.slayt",
      enAz: 1,
      enCok: 6,
      alanlar: {
        gorsel: { tur: "gorsel", ad: "vitrin.bolum.kayanAfis.gorsel" },
        darEkranGorseli: { tur: "gorsel", ad: "vitrin.bolum.kayanAfis.telefonGorseli" },
        gorselMetni: { tur: "metin", ad: "vitrin.bolum.alan.gorselMetni", enCok: 160 },
        ustYazi: { tur: "metin", ad: "vitrin.bolum.alan.ustYazi", enCok: 40 },
        baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", zorunlu: true, enCok: 80 },
        metin: { tur: "uzun-metin", ad: "vitrin.bolum.alan.metin", enCok: 240 },
        dugmeYazisi: { tur: "metin", ad: "vitrin.bolum.alan.dugmeYazisi", enCok: 30 },
        baglanti: { tur: "baglanti", ad: "vitrin.bolum.alan.baglanti" },
      },
    },
    gecis: {
      tur: "secim",
      ad: "vitrin.bolum.kayanAfis.gecis",
      secenekler: [
        { kod: "orta", ad: "vitrin.bolum.kayanAfis.gecisOrta" },
        { kod: "kisa", ad: "vitrin.bolum.kayanAfis.gecisKisa" },
        { kod: "uzun", ad: "vitrin.bolum.kayanAfis.gecisUzun" },
        { kod: "kapali", ad: "vitrin.bolum.kayanAfis.gecisKapali" },
      ],
      varsayilan: "orta",
    },
    zemin: {
      tur: "renk",
      ad: "vitrin.bolum.alan.zemin",
      renkler: ["afis", "yuzey", "kutu-1", "kutu-2", "kutu-3", "kutu-4", "kutu-5"],
    },
  },
  // Yazı solda, görsel sağda (Canlı Çarşı taslağı); görsel arkada, yazı onun üstünde bir kutuda.
  gorunumler: [
    { kod: "yazi-solda", ad: "vitrin.bolum.gorunum.yaziSolda" },
    { kod: "gorsel-arkada", ad: "vitrin.bolum.gorunum.gorselArkada" },
  ],
} as const satisfies BolumTarifi;
