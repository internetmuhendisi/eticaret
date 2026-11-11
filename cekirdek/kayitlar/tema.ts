// Temanın başvurduğu kayıtlar (kart 0105, .claude/rules/kayit-dosyalari.md). Bir tema yalnız buradaki
// alanlara, bölüm kütüphanesindeki türlere ve parça görünümlerine başvurabilir; olmayana başvuran tema açılmaz
// (cekirdek/temalar/sema.ts).

// Sayfanın bölümlerle kurulan alanları (kart 0106). Her alan sıralı bölümlerden oluşur.
export const duzenAlanlari = ["ust-kisim", "ana-sayfa", "alt-kisim"] as const;
export type DuzenAlani = (typeof duzenAlanlari)[number];

// Bölüm türleri bölüm kütüphanesindedir (cekirdek/vitrin/bolum-kutuphanesi/kutuphane.ts, kart 0106).

// Ürün kartının görünüm tipleri (kart 0109, karar 0085). Kartı çizen bölüm kendi görünüm seçeneğiyle
// temanın seçimini değiştirebilir (cekirdek/vitrin/urun-karti/gorunum.ts).
// - dikey: görsel üstte, bilgiler altta; ızgaralarda.
// - yatay: küçük görsel solda, bilgiler sağda; sekmeli vitrin gibi dar yerlerde.
// - buyuk-gorsel: görsel daha uzun ve büyük boyuttan, ad ve fiyat daha büyük; az ürünlü vitrinlerde.
export const urunKartiGorunumleri = ["dikey", "yatay", "buyuk-gorsel"] as const;
export type UrunKartiGorunumu = (typeof urunKartiGorunumleri)[number];

// Ürün listesindeki filtrenin yeri (kart 0136, karar 0102), masaüstünde. Telefonda filtre her zaman yan
// pencerede açılır.
// - solda: filtreler listenin solunda, açık duran bir sütun.
// - ustte: filtreler listenin üstünde, her grup kendi düğmesiyle açılır.
export const urunFiltresiGorunumleri = ["solda", "ustte"] as const;
export type UrunFiltresiGorunumu = (typeof urunFiltresiGorunumleri)[number];

// Parçaların temanın seçtiği görünüm tipleri: parçanın kodu ve görünümlerinin kodları. Tema listedeki
// her parça için bir görünüm seçer. İlk parça ürün kartıdır (kart 0109).
export const parcaGorunumleri: Readonly<Record<string, readonly string[]>> = {
  "urun-karti": urunKartiGorunumleri,
  "urun-filtresi": urunFiltresiGorunumleri,
};
