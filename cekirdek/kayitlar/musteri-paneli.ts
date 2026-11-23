// Panelin müşteri ekranlarının kaydı (kart 0271, karar 0173): listenin sıralamaları ve süzgeç seçenekleri, sınırlar.
// Listede yalnız üyeler vardır (karar 0157); üye olmadan verilen sipariş siparişlerde görünür.

// Sıralamalar: kayıt zamanı, sipariş sayısı ve toplam; eşitlikte kayıt zamanı ve kimlik. İlki varsayılandır. Adreste
// durur (?sirala=toplam-azalan): yayınlandıktan sonra adı değişmez.
export const musteriListesiSiralamalari = [
  "en-yeni",
  "en-eski",
  "siparis-azalan",
  "siparis-artan",
  "toplam-azalan",
  "toplam-artan",
] as const;
export type MusteriListesiSiralamasi = (typeof musteriListesiSiralamalari)[number];

// Kampanya izni süzgeci: en yeni pazarlama onayı verilmiş mi. Sipariş süzgeci: iptal edilmemiş siparişi var mı.
export const musteriKampanyaSecenekleri = ["var", "yok"] as const;
export const musteriSiparisSecenekleri = ["var", "yok"] as const;

export const musteriPanelSinirlari = {
  // Aranan metnin en çok harf sayısı (ad ya da e-posta).
  aramaEnCok: 100,
  // Notun en çok harf sayısı; veritabanının musteri_notlari_metin denetimiyle aynıdır (test).
  notEnCok: 1000,
  // Ayrıntıda gösterilen en yeni sipariş sayısı; toplam sipariş sayısı ayrıca yazılır.
  ayrintiSiparis: 20,
  // Ayrıntıda gösterilen en yeni not sayısı.
  ayrintiNot: 100,
} as const;
