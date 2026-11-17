// Ödeme işaretleri (kart 0108, karar 0083): alt kısımda gösterilen ödeme yöntemi işaretlerinin türleri.
// İşaretler sitede gerçekten açık olan ödeme yöntemlerinden gelir (kullanıcı kararı): mağaza kabul etmediği bir
// yöntemin işaretini göstermez. Ödeme modülü yazılınca açık yöntemler buradaki türlere çevrilir; o güne kadar
// ödeme işlevi kapalıdır ve işaretler bölümü çizilmez (cekirdek/kayitlar/islevler.ts).
// Kart markalarının logoları kartla ödeme eklentisiyle gelir; bugün kart genel işaretiyle gösterilir.
export const odemeIsaretleri = ["kart", "havale", "kapida-odeme"] as const;
export type OdemeIsareti = (typeof odemeIsaretleri)[number];

// Ödeme adımı (kart 0213, karar 0140). Ödeme oturumunun sınırları, fatura türleri, stok ayırma süresinin
// sınırları ve ödeme adımına özgü hata kodları tek yerdedir; ödeme modülü (cekirdek/moduller/odeme/), ayar şeması
// ve vitrin buradan okur.
//
// Ödeme oturumu müşterinin "Siparişi onayla"ya bastığı andaki bilgisidir: iletişim, teslimat, fatura, not, onaylar ve
// sepetin kalemleri. Oturumla birlikte sepetin birimleri stok ayırma süresi kadar ayrılır (kullanıcı kararı: ayırma
// düğmeye basınca yapılır, sayfa açılınca değil). Sipariş kart 0214'te oturumdan kurulur.

export const odemeSinirlari = {
  // Sipariş notunun en çok karakter sayısı.
  notEnCok: 500,
  // Ad, soyad ve firma adının en çok karakter sayısı.
  adEnCok: 100,
  // Vergi dairesinin en çok karakter sayısı.
  vergiDairesiEnCok: 100,
} as const;

// Ödemede stok ayırma süresi, dakika (mağaza sahibinin ayarı stokAyirmaSuresi, planlar/site-ayarlari.md).
export const stokAyirmaSuresiSinirlari = { enAz: 5, enCok: 60, varsayilan: 15 } as const;

// Süresi dolan ödeme oturumu (siparişe dönmemiş) bu kadar saat sonra silinir: kişisel veri (adres, telefon,
// e-posta) gereğinden uzun saklanmaz.
export const odemeOturumuSaklamaSaat = 24;

// Fatura türleri: bireysel (müşterinin adına) ya da kurumsal (firma adı, vergi dairesi ve vergi numarasıyla).
export const faturaTurleri = ["bireysel", "kurumsal"] as const;
export type FaturaTuru = (typeof faturaTurleri)[number];

// Ödeme adımının hata kodları (ayrıntıda döner, metni ekran çözer):
// - sepet-degisti: sepet ödemeye geçilemez durumda (satılamayan satır, alım adedi); müşteri sepete döner.
// - sepet-bos: sepette satılabilir ürün yok.
// - stok-ayrildi: birimin stoğu başka bir müşterinin ödemesinde ayrılmış ya da yetmiyor.
// - vergi-numarasi-bicimi, vergi-numarasi-kontrol: kurumsal faturanın vergi numarası (ülkenin veri dosyasından).
export const odemeHatalari = [
  "sepet-degisti",
  "sepet-bos",
  "stok-ayrildi",
  "vergi-numarasi-bicimi",
  "vergi-numarasi-kontrol",
] as const;
export type OdemeHatasi = (typeof odemeHatalari)[number];

// Ödeme yöntemleri (kart 0214, karar 0141). Kayıttaki sıra yöntemin kendi sırası değildir: müşterinin gördüğü sıra ve
// hangilerinin açık olduğu mağaza sahibinin ayarıdır (odemeYontemleri). Kartla ödeme eklentisi (kart 0215) kendi
// yöntemini buraya eklentisiyle ekler: eklentisi kapalı sitede yöntem kapalı sayılır.
// - havale: müşteri siparişten sonra mağazanın banka hesaplarından birine öder. Banka hesabı yoksa ödeme adımında
//   görünmez. Ödenmeyen sipariş havaleIptalSuresi kadar gün sonra kendiliğinden iptal olur.
// - kapida-odeme: müşteri teslimatta kuryeye öder; seçenekleri (nakit, kart) mağaza sahibinin ayarıdır
//   (kapidaOdemeSecenekleri). Müşteri seçeneği ödeme adımında seçer, sipariş seçenekle saklanır.
export const odemeYontemleri = ["havale", "kapida-odeme"] as const;
export type OdemeYontemi = (typeof odemeYontemleri)[number];

export const kapidaOdemeSecenekleri = ["nakit", "kart"] as const;
export type KapidaOdemeSecenegi = (typeof kapidaOdemeSecenekleri)[number];

// Ödenmeyen havale siparişinin iptal süresi, gün (mağaza sahibinin ayarı havaleIptalSuresi).
export const havaleIptalSuresiSinirlari = { enAz: 1, enCok: 30, varsayilan: 3 } as const;

// Banka hesapları (havale): en çok kaç hesap, alanların en çok karakter sayısı.
export const bankaHesabiSinirlari = { enCok: 10, bankaEnCok: 100, sahipEnCok: 150 } as const;

// Havale bildirimi (kart 0214): müşterinin "ödemeyi yaptım" bildirimi. Not ve gönderen adının sınırları; bir siparişe
// en çok kaç bildirim yazılır (bildirimli sipariş kendiliğinden iptal olmaz, sınırsız bildirim yığılmasın); formdaki
// tutar örneği (kuruş, sitenin biçimiyle yazılır).
export const havaleBildirimiSinirlari = {
  notEnCok: 500,
  gonderenEnCok: 150,
  siparisBasinaEnCok: 5,
  tutarOrnegi: 139_960,
} as const;
