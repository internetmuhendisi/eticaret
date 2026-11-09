// Mağazanın sosyal hesaplarının siteleri (kart 0108, karar 0083). Mağaza sahibi siteyi seçer ve kullanıcı
// adını yazar; hesabın adresi buradan kurulur, elle yazılmaz. Böylece adres hep https'tir ve "@" içeren
// adresler (TikTok, YouTube) değişiklik kaydına adres olarak girmez.
//
// Kullanıcı adı yalnız harf, rakam, nokta, alt çizgi ve tireden oluşur, harf ya da rakamla başlar ("." ve ".."
// adresi platformun ana sayfasına çözerdi); "@" yazılmaz. LinkedIn'de şirket sayfası bağlanır.
export const sosyalSiteler = [
  "instagram",
  "facebook",
  "x",
  "youtube",
  "tiktok",
  "pinterest",
  "linkedin",
] as const;
export type SosyalSite = (typeof sosyalSiteler)[number];

export const sosyalHesapKalibi = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

// Hesabın adresi kullanıcı adından kurulur.
export const sosyalHesapAdresleri = {
  instagram: (hesap) => `https://www.instagram.com/${hesap}`,
  facebook: (hesap) => `https://www.facebook.com/${hesap}`,
  x: (hesap) => `https://x.com/${hesap}`,
  youtube: (hesap) => `https://www.youtube.com/@${hesap}`,
  tiktok: (hesap) => `https://www.tiktok.com/@${hesap}`,
  pinterest: (hesap) => `https://www.pinterest.com/${hesap}`,
  linkedin: (hesap) => `https://www.linkedin.com/company/${hesap}`,
} as const satisfies Record<SosyalSite, (hesap: string) => string>;

// Mağazanın gösterebileceği hesap sayısı.
export const sosyalHesapSiniri = 10;
