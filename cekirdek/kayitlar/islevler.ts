// İşlevler (kart 0106, karar 0081): bir vitrin bölümünün çalışması için gereken, temel paketin henüz
// yazılmamış ya da eklentiyle gelen parçaları (yorum, blog, bülten). Ürün özelliğiyle (cekirdek/moduller/ozellik)
// karışmasın diye "işlev" adıyla yazılır.
//
// Bağlı olduğu işlev olmayan bölüm düzene eklenebilir ama vitrinde çizilmez; panel nedenini gösterir. İşlev
// yazılınca buradaki değeri açılır ve bölüm kendiliğinden çizilir: düzenin kendisi değişmez.
export const islevler = ["yorum", "blog", "bulten"] as const;
export type Islev = (typeof islevler)[number];

// Çekirdekte yazılmış işlevler. Bir işlev gelince aynı değişiklikte burada açılır.
export const yazilanIslevler: Readonly<Record<Islev, boolean>> = {
  yorum: false,
  blog: false,
  bulten: false,
};
