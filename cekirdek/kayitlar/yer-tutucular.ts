// Yer tutucular (kart 0110, karar 0087): mağaza sahibinin bölüm metnine yazabileceği, ayardan dolan değerler.
// Güven şeridinin maddesinde "{kargoyaVermeSuresi} iş gününde kargoda" yazılırsa vitrinde ayardaki sayı
// görünür. Değer vitrin bağlamında okunur (cekirdek/vitrin/baglam-oku.ts); değeri olmayan yer tutucuyu
// taşıyan metin çizilmez (yanlış ya da boş bir sayı göstermektense madde görünmez).
//
// Ücretsiz kargo sınırı ve iade süresi kendi modülleriyle (kargo hesabı, iade) buraya eklenir; o güne kadar
// mağaza sahibi bu değerleri metne elle yazar (kullanıcı kararı).
export const yerTutucular = ["kargoyaVermeSuresi"] as const;
export type YerTutucu = (typeof yerTutucular)[number];
