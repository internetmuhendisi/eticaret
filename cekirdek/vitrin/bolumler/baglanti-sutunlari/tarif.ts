// Bağlantı sütunları (kart 0108): alt kısımda bir menü. En üst öğeler sütun başlığı, altları bağlantıdır.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const baglantiSutunlari = {
  tur: "baglanti-sutunlari",
  ad: "vitrin.bolum.baglantiSutunlari.ad",
  duzenAlanlari: ["alt-kisim"],
  alanlar: {
    menu: { tur: "menu", ad: "vitrin.bolum.baglantiSutunlari.menu", zorunlu: true },
  },
  gorunumler: [
    { kod: "sutunlu", ad: "vitrin.bolum.gorunum.sutunlu" },
    { kod: "tek-satir", ad: "vitrin.bolum.gorunum.tekSatir" },
  ],
} as const satisfies BolumTarifi;
