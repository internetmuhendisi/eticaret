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

// Mağaza sahibine açılabilen renkler ve köşe ile düğme biçimi seçeneklerinin kodları (kart 0260, karar 0168).
// Panelin tema ayarları ekranı her birini metin dosyasındaki adıyla gösterir: tema yalnız buradakileri açabilir,
// adı olmayan renk ya da seçenek açan tema açılmaz (cekirdek/temalar/sema.ts). Yazı tipi seçeneğinin adı kendi
// yazı tiplerinin adıdır, kayıtta değildir.
export const magazaRenkleri = ["birincil", "indirim", "afis", "alt-kisim"] as const;
export type MagazaRengi = (typeof magazaRenkleri)[number];
export const koseSecenekleri = ["keskin", "orta", "yumusak", "yuvarlak"] as const;
export type KoseSecenegi = (typeof koseSecenekleri)[number];
export const dugmeBicimiSecenekleri = ["hap", "yumusak", "koseli"] as const;
export type DugmeBicimiSecenegi = (typeof dugmeBicimiSecenekleri)[number];

// Tema demosu (kart 0116, karar 0127): ziyaretçinin seçtiği tema adreste bu parametreyle gelir, ara katman onu
// çereze yazar; sonraki sayfalar çerezden okur. Yalnız temaDemosu ayarı açık sitede okunur. Demo sitesinin sayfası
// kökünde oznitelik'i taşır: tarayıcıdaki kod (hesap durumu) ziyaretçinin yalnız gezdiğini buradan bilir.
export const temaDemosu = {
  parametre: "tema",
  cerez: "tema-demosu",
  oznitelik: "data-tema-demosu",
} as const;
