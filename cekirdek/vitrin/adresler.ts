// Vitrinin adresleri (kart 0033; kart 0108). Adres dosyaları cekirdek/uygulama/app/(vitrin)/ altındadır.
//
// Arama, sepet, favoriler ve kategori, marka, ürün sayfaları Vitrin bölümünün kartlarıyla yazılır (karar 0083).
// Adresleri burada tek yerde tanımlıdır: menü ve üst kısım bağlantıyı buradan kurar. Arama, sepet ve favori
// düğmeleri ilgili işlev yazılana kadar görünmez (cekirdek/kayitlar/islevler.ts); kategori, marka ve ürün
// bağlantıları sayfaları yazılana kadar boş sayfaya düşer.
export const vitrinAdresleri = {
  anasayfa: "/",
  giris: "/giris",
  kayit: "/kayit",
  sifremiUnuttum: "/sifremi-unuttum",
  sifreYenile: "/sifre-yenile",
  uyelikSozlesmesi: "/yasal/uyelik-sozlesmesi",
  kvkkAydinlatma: "/yasal/kvkk-aydinlatma",
  arama: "/arama",
  sepet: "/sepet",
  favoriler: "/favoriler",
} as const;

// Kaydın vitrindeki sayfası, adres adıyla.
export const kayitAdresleri = {
  kategori: (adresAdi: string) => `/kategori/${adresAdi}`,
  marka: (adresAdi: string) => `/marka/${adresAdi}`,
  urun: (adresAdi: string) => `/urun/${adresAdi}`,
} as const;
