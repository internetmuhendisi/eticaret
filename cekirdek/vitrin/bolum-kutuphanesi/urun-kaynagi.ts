// Ürün bölümlerinin ürün kaynağı (kart 0111, karar 0088). Ürün gösteren her bölüm ürünlerini buradaki
// kaynaklardan biriyle seçer; kaynağın ürünleri vitrin bağlamında anahtarıyla durur (baglam.ts), bölüm onları
// anahtarla bulur. Ürünleri getiren tek işlev sunucudadır (cekirdek/vitrin/urun-kaynagi.ts).
//
// Mağaza sahibinin seçtiği kaynaklar tarifteki "urun-kaynagi" alanıdır (tarif.ts): elle seçilen ürünler,
// kategori (alt kategorileriyle), marka, etiket, yeni gelenler ve indirimdekiler. Fırsat kaynağı seçilmez:
// geri sayımlı fırsatlar bölümünün kendisidir, bitişi olan süren indirimleri en yakın biteni önce getirir.
//
// Bu dosya yalnız tür ve düz işlevdir, sunucu kodu almaz: bölümlerin görünüşleri tarayıcıda da çalışır.

import { kimligiDuzelt } from "../../veritabani/kimlik";

export type UrunKaynagi =
  | { tur: "elle"; urunler: readonly string[] }
  | { tur: "kategori"; kategori: string; adet: number }
  | { tur: "marka"; marka: string; adet: number }
  | { tur: "etiket"; etiket: string; adet: number }
  | { tur: "yeni" | "indirimli" | "firsat"; adet: number };

// Kaynağın bağlamdaki anahtarı: aynı kaynak hangi bölümde olursa olsun aynı anahtarı alır, bir kez okunur.
// Kimlikler küçük harfle yazılır (kart 0119: büyük harfle de gelebilir).
export const urunKaynagiAnahtari = (kaynak: UrunKaynagi): string => {
  switch (kaynak.tur) {
    case "elle":
      return `elle:${kaynak.urunler.map(kimligiDuzelt).join(",")}`;
    case "kategori":
      return `kategori:${kimligiDuzelt(kaynak.kategori)}:${kaynak.adet}`;
    case "marka":
      return `marka:${kimligiDuzelt(kaynak.marka)}:${kaynak.adet}`;
    case "etiket":
      return `etiket:${kimligiDuzelt(kaynak.etiket)}:${kaynak.adet}`;
    case "yeni":
    case "indirimli":
    case "firsat":
      return `${kaynak.tur}:${kaynak.adet}`;
  }
};
