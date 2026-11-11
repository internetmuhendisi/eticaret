// Vitrinin adresleri (kart 0033; kart 0108). Adres dosyaları cekirdek/uygulama/app/(vitrin)/ altındadır.
//
// Arama, sepet, favoriler ve kategori, marka, ürün sayfaları Vitrin bölümünün kartlarıyla yazılır (karar 0083).
// Adresleri burada tek yerde tanımlıdır: menü ve üst kısım bağlantıyı buradan kurar. Arama, sepet ve favori
// düğmeleri ilgili işlev yazılana kadar görünmez (cekirdek/kayitlar/islevler.ts). Kategori, marka, etiket ve
// ürün sayfasının iskeleti kart 0135'te açıldı; içeriği kartlar 0136 ve 0138'de gelir.
import type { AdresliKayitTuru } from "../kayitlar/adres";

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

// Kaydın vitrindeki sayfası, adres adıyla (kart 0135: etiket). Türler cekirdek/kayitlar/adres.ts kaydındadır;
// eksik ya da fazla tür tür kontrolünde hatadır. Adres adı değişen kaydın eski adresi yenisine kalıcı olarak
// yönlenir (cekirdek/moduller/gorunurluk/adres.ts, karar 0103).
export const kayitAdresleri = {
  kategori: (adresAdi: string) => `/kategori/${adresAdi}`,
  marka: (adresAdi: string) => `/marka/${adresAdi}`,
  etiket: (adresAdi: string) => `/etiket/${adresAdi}`,
  urun: (adresAdi: string) => `/urun/${adresAdi}`,
} as const satisfies Record<AdresliKayitTuru, (adresAdi: string) => string>;
