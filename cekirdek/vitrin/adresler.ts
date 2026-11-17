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
  // Ödeme adımı (kart 0213): vitrinin çerçevesinin dışında, sade üst ve alt kısımla.
  odeme: "/odeme",
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

// Müşteri girişinden sonra dönülecek adres (kart 0139: yorum yazmak için girişe giden müşteri ürüne döner).
// Yalnız vitrinin kendi sayfasına dönülür: başka siteye, panele, kapıya ve giriş sayfasının kendisine dönülmez;
// geçersiz değer ana sayfadır. Panelin kuralıyla aynı yol (cekirdek/yonetim-paneli/adresler.ts, guvenliDonus).
export const vitrinDonusParametresi = "donus";
const cozumKoku = "http://vitrin.invalid";
const donulmeyenler = ["/yonetim", "/kapi", "/gelistirme", vitrinAdresleri.giris];

export const vitrinDonusu = (deger: string | null | undefined): string => {
  if (!deger?.startsWith("/") || deger.startsWith("//") || deger.includes("\\")) {
    return vitrinAdresleri.anasayfa;
  }
  let adres: URL;
  try {
    adres = new URL(deger, cozumKoku);
  } catch {
    return vitrinAdresleri.anasayfa;
  }
  const { origin, pathname, search, hash } = adres;
  // Kodlanmış yazılış ("/y%6Fnetim") da çözülerek karşılaştırılır; çözülemeyen yol ana sayfadır.
  let cozulmus: string;
  try {
    cozulmus = decodeURIComponent(pathname).toLowerCase();
  } catch {
    return vitrinAdresleri.anasayfa;
  }
  const yasak = donulmeyenler.some((kok) => cozulmus === kok || cozulmus.startsWith(`${kok}/`));
  if (origin !== cozumKoku || yasak) return vitrinAdresleri.anasayfa;
  return `${pathname}${search}${hash}`;
};

export const girisAdresiDonuslu = (donus: string): string =>
  `${vitrinAdresleri.giris}?${new URLSearchParams({ [vitrinDonusParametresi]: donus })}`;
