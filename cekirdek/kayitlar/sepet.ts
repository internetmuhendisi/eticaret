// Sepet ve kargo kaydı (kart 0212, karar 0135). Sepetin sınırları, ayar seçenekleri ve satır uyarılarının adları
// tek yerdedir; sepet hesabı (cekirdek/moduller/sepet/hesap.ts), kargo hesabı (cekirdek/moduller/kargo/hesap.ts),
// ayar şeması ve vitrin buradan okur.
//
// Sepet yalnız müşterinin tarayıcısındadır (kullanıcı kararı, karar 0135): üye ve üye olmayan müşteride aynıdır,
// sunucuda saklanmaz, hesaba bağlanmaz. Hesaba bağlı ve cihazlar arası sepet "kalıcı sepet" eklentisidir.

// Tarayıcı deposundaki anahtar. Yalnız birim kimlikleri, adetler ve müşterinin son gördüğü birim fiyatı saklanır.
export const sepetDepoAnahtari = "sepet";

// Sepet ve ödeme sayfasına giden çerez (kart 0218, karar 0136; kart 0213): yalnız sepetteki kalem sayısını taşır, birim
// ya da fiyat taşımaz. Sunucu sepeti bilmez; çerezde kalem yoksa sepet ve ödeme sayfası boş hâli hemen çizer. Çerez
// yalnız bu iki yola gider (her yol için aynı adla ayrı çerez yazılır).
// Süresi depo kadar uzundur (tarayıcıların izin verdiği en uzun süre, 400 gün): tarayıcı kapanınca silinseydi dolu
// sepetle gelen müşteri bir an boş ekran görürdü. Sepet boşalınca çerez silinir.
export const sepetCerezi = {
  ad: "sepet-sayisi",
  yollar: ["/sepet", "/odeme"],
  saniye: 400 * 24 * 60 * 60,
} as const;

export const sepetSinirlari = {
  // Sepette en çok kaç ayrı birim (kalem) olur.
  kalemEnCok: 50,
  // Bir kalemin en büyük adedi; ürünün kendi en çok alım adedi ve stok bundan önce gelir.
  adetEnCok: 999,
} as const;

// Kargo ücretinin ve ücretsiz kargo sınırının en büyük değeri, kuruş (1 milyon para birimi).
export const sepetTutariEnCok = 100_000_000;

// Ürün sepete eklenince ne olur (mağaza sahibinin ayarı, karar 0132): sağdan açılan sepet penceresi, kısa
// bildirim ya da sepet sayfası.
export const sepeteEkleyinceSecenekleri = ["yan-pencere", "bildirim", "sepet-sayfasi"] as const;
export type SepeteEkleyince = (typeof sepeteEkleyinceSecenekleri)[number];

// Ücretsiz kargo sınırının karşılaştırıldığı tutar (planlar/site-ayarlari.md): indirimden sonraki ya da önceki
// sepet tutarı.
export const ucretsizKargoTutarlari = ["indirimden-sonra", "indirimden-once"] as const;
export type UcretsizKargoTutari = (typeof ucretsizKargoTutarlari)[number];

// Sepet satırının müşteriye söylenen değişiklikleri (kart 0212):
// - fiyat-degisti: müşterinin son gördüğü birim fiyatı değişti.
// - stok-azaldi: istenen adet stoktan fazla; adet stoğa indirildi.
// - en-az, en-cok: ürünün alım adedi sınırı; en-az ödemeye geçmeyi durdurur, en-cok adedi sınıra indirir.
// - tukendi: birim satılamaz (stok, fiyat; stok/durum.ts).
// - kaldirildi: ürün ya da birim artık yok, sayfası açılmıyor.
export const sepetUyarilari = [
  "fiyat-degisti",
  "stok-azaldi",
  "en-az",
  "en-cok",
  "tukendi",
  "kaldirildi",
] as const;
export type SepetUyarisi = (typeof sepetUyarilari)[number];

// Ödemeye geçmeyi durduran uyarılar: satılamayan ya da alınamayacak adetteki satır.
export const odemeyiDurduranUyarilar: readonly SepetUyarisi[] = ["en-az", "tukendi", "kaldirildi"];
