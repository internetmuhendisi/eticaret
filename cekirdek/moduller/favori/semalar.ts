// Favori uçlarının şemaları (kart 0140, karar 0110). Tarayıcıdaki favori durumu da aynı şemaları kullanır.
import { z } from "zod";
import { favoriSiniriEnCok } from "../../kayitlar/favori.ts";

// Hata kodları. Kod bir kez yayınlandıktan sonra adı değişmez.
export const favoriHatalari = [
  // Ürün yok ya da sayfası açılmıyor (taslak, arşiv, silinmiş, zamanı gelmemiş).
  "urun-yok",
  // Müşterinin favori sayısı sitenin sınırında.
  "favori-siniri",
] as const;
export type FavoriHatasi = (typeof favoriHatalari)[number];

// GET /kapi/musteri/favoriler: girdi almaz, kimlik yalnız kapıdan gelir.
export const favorilerSemasi = z.strictObject({});

// POST /kapi/musteri/favori: ürünü favorilere ekler ya da çıkarır.
export const favoriSemasi = z.strictObject({
  urun: z.uuid(),
  favoride: z.boolean(),
});

// POST /kapi/musteri/favori-birlestir: tarayıcıdaki liste, en yeni önce. Tekrar ve fazlası reddedilmez,
// servis ayıklar; ama liste hiçbir sitede sınırın en büyük değerinden uzun olamaz.
export const favoriBirlestirSemasi = z.strictObject({
  urunler: z.array(z.uuid()).max(favoriSiniriEnCok),
});

// Uçların ortak cevabı: müşterinin vitrinde sayfası açılan favorileri, en yeni önce.
export type FavoriListesi = { favoriler: string[] };
export type BirlesmeSonucu = FavoriListesi & { sigmayan: number };
