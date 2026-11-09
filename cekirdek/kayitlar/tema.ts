// Temanın başvurduğu kayıtlar (kart 0105, .claude/rules/kayit-dosyalari.md). Bir tema yalnız buradaki
// alanlara, bölüm türlerine ve parça görünümlerine başvurabilir; olmayana başvuran tema açılmaz
// (cekirdek/temalar/sema.ts).

// Sayfanın bölümlerle kurulan alanları (kart 0106). Her alan sıralı bölümlerden oluşur.
export const duzenAlanlari = ["ust-kisim", "ana-sayfa", "alt-kisim"] as const;
export type DuzenAlani = (typeof duzenAlanlari)[number];

export type BolumTuruKaydi = { alanlar: readonly DuzenAlani[] };

// Bölüm kütüphanesi: bölüm türünün kodu ve konabileceği alanlar. Bölüm türleri kendi kartlarıyla gelir
// (0106 kütüphaneyi, 0108 ve 0110–0112 türleri yazar); o güne kadar liste boştur ve temanın başlangıç
// düzeni boş kalır.
export const bolumTurleri: Readonly<Record<string, BolumTuruKaydi>> = {};

// Parçaların temanın seçtiği görünüm tipleri: parçanın kodu ve görünümlerinin kodları. Tema listedeki
// her parça için bir görünüm seçer. İlk parça ürün kartıdır (kart 0109); o güne kadar liste boştur.
export const parcaGorunumleri: Readonly<Record<string, readonly string[]>> = {};
