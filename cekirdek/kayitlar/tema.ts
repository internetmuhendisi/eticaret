// Temanın başvurduğu kayıtlar (kart 0105, .claude/rules/kayit-dosyalari.md). Bir tema yalnız buradaki
// alanlara, bölüm kütüphanesindeki türlere ve parça görünümlerine başvurabilir; olmayana başvuran tema açılmaz
// (cekirdek/temalar/sema.ts).

// Sayfanın bölümlerle kurulan alanları (kart 0106). Her alan sıralı bölümlerden oluşur.
export const duzenAlanlari = ["ust-kisim", "ana-sayfa", "alt-kisim"] as const;
export type DuzenAlani = (typeof duzenAlanlari)[number];

// Bölüm türleri bölüm kütüphanesindedir (cekirdek/vitrin/bolum-kutuphanesi/kutuphane.ts, kart 0106).

// Parçaların temanın seçtiği görünüm tipleri: parçanın kodu ve görünümlerinin kodları. Tema listedeki
// her parça için bir görünüm seçer. İlk parça ürün kartıdır (kart 0109); o güne kadar liste boştur.
export const parcaGorunumleri: Readonly<Record<string, readonly string[]>> = {};
