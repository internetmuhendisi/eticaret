// Ödeme işaretleri (kart 0108, karar 0083): alt kısımda gösterilen ödeme yöntemi işaretlerinin türleri.
// İşaretler sitede gerçekten açık olan ödeme yöntemlerinden gelir (kullanıcı kararı): mağaza kabul etmediği bir
// yöntemin işaretini göstermez. Ödeme modülü yazılınca açık yöntemler buradaki türlere çevrilir; o güne kadar
// ödeme işlevi kapalıdır ve işaretler bölümü çizilmez (cekirdek/kayitlar/islevler.ts).
// Kart markalarının logoları kartla ödeme eklentisiyle gelir; bugün kart genel işaretiyle gösterilir.
export const odemeIsaretleri = ["kart", "havale", "kapida-odeme"] as const;
export type OdemeIsareti = (typeof odemeIsaretleri)[number];
