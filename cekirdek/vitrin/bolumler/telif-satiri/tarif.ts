// Telif satırı (kart 0108): "© yıl mağaza adı", isteğe bağlı ek metin; altyapı sahibinin ayarı açıksa altyapı
// adı. Mağaza adı ve yıl bölümde yazılmaz, bağlamdan gelir. Alt kısmın en alt satırındadır.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const telifSatiri = {
  tur: "telif-satiri",
  ad: "vitrin.bolum.telifSatiri.ad",
  duzenAlanlari: ["alt-kisim"],
  alanlar: {
    ekMetin: { tur: "metin", ad: "vitrin.bolum.telifSatiri.ekMetin", enCok: 120 },
  },
  // Alt satırın solunda durur; yerini alt kısım verir.
  gorunumler: [{ kod: "duz", ad: "vitrin.bolum.gorunum.duz" }],
  altKisimdaYeri: "alt-satir",
  // 0.40.0'da ortalı ve iki yana görünümleri kalktı, telif alt satırın soluna geçti (kart 0108, karar 0084).
  eskiKodlar: { gorunumler: { ortali: "duz", "iki-yana": "duz" } },
} as const satisfies BolumTarifi;
