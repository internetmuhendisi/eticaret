// Telif satırı (kart 0108): "© yıl mağaza adı", isteğe bağlı ek metin; altyapı sahibinin ayarı açıksa altyapı
// adı. Mağaza adı ve yıl bölümde yazılmaz, bağlamdan gelir.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const telifSatiri = {
  tur: "telif-satiri",
  ad: "vitrin.bolum.telifSatiri.ad",
  duzenAlanlari: ["alt-kisim"],
  alanlar: {
    ekMetin: { tur: "metin", ad: "vitrin.bolum.telifSatiri.ekMetin", enCok: 120 },
  },
  gorunumler: [
    { kod: "ortali", ad: "vitrin.bolum.gorunum.ortali" },
    { kod: "iki-yana", ad: "vitrin.bolum.gorunum.ikiYana" },
  ],
} as const satisfies BolumTarifi;
