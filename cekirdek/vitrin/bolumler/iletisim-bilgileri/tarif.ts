// İletişim bilgileri (kart 0108): mağaza ayarlarındaki telefon, e-posta ve adres; boş olan gösterilmez. Bilgi
// bölümde yazılmaz, ayardan okunur.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const iletisimBilgileri = {
  tur: "iletisim-bilgileri",
  ad: "vitrin.bolum.iletisimBilgileri.ad",
  duzenAlanlari: ["alt-kisim"],
  alanlar: {
    // Boşsa ortak başlık görünür.
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", enCok: 60 },
  },
  gorunumler: [
    { kod: "liste", ad: "vitrin.bolum.gorunum.liste" },
    { kod: "yatay", ad: "vitrin.bolum.gorunum.yatay" },
  ],
} as const satisfies BolumTarifi;
