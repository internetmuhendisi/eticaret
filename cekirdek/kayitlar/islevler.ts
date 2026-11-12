// İşlevler (kart 0106, karar 0081): bir vitrin bölümünün çalışması için gereken, temel paketin henüz
// yazılmamış ya da eklentiyle gelen parçaları (yorum, blog, bülten). Kart 0108 (karar 0083): üst kısmın arama,
// favori ve sepet düğmeleri ilgili işlev yazılınca görünür, ödeme işaretleri bölümü ödeme işleviyle çizilir. Ürün özelliğiyle (cekirdek/moduller/ozellik)
// karışmasın diye "işlev" adıyla yazılır.
//
// Bağlı olduğu işlev olmayan bölüm düzene eklenebilir ama vitrinde çizilmez; panel nedenini gösterir. İşlev
// yazılınca buradaki değeri açılır ve bölüm kendiliğinden çizilir: düzenin kendisi değişmez.
export const islevler = ["yorum", "blog", "bulten", "arama", "favori", "sepet", "odeme"] as const;
export type Islev = (typeof islevler)[number];

// Çekirdekte yazılmış işlevler. Bir işlev gelince aynı değişiklikte burada açılır.
export const yazilanIslevler: Readonly<Record<Islev, boolean>> = {
  // Kart 0139: ürün yorumları ve puan.
  yorum: true,
  blog: false,
  bulten: false,
  arama: true,
  // Kart 0140: favoriler.
  favori: true,
  sepet: false,
  odeme: false,
};
