// Sabit sayfaların kaydı (kart 0273): hakkımızda, iletişim gibi mağaza sahibinin yazdığı sayfalar. Vitrinde
// /sayfa/<adres adı> adresindedir (karar 0157). Durum adı veritabanına yazılır: yayınlandıktan sonra ancak eski kayıtları
// dönüştüren bir veri değişikliğiyle değişir. Veritabanındaki denetim (sabit_sayfalar_durum) bu listeyle aynıdır, bunu
// cekirdek/moduller/icerik/testler/sayfa.test.ts denetler.
//
// - taslak: vitrinde görünmez, menüdeki öğesi görünmez.
// - yayinda: görünür. Zamanlama yoktur (taslak: yalnız yayında ya da taslak).
export const sabitSayfaDurumlari = ["yayinda", "taslak"] as const;
export type SabitSayfaDurumu = (typeof sabitSayfaDurumlari)[number];

// Metinlerin en çok uzunluğu (UTF-16 birimi; form ve şema aynı sayar). İçerik biçimli metindir (HTML), sınırı sayfanın
// HTML'idir. Açıklama arama motorlarına giden açıklamadır; boşsa içeriğin başından üretilir. Sayfa sayısı sitedeki
// silinmemiş sayfaların sınırıdır (liste sayfalanmaz, kısa bir listedir).
export const sabitSayfaSinirlari = {
  baslik: 200,
  icerik: 100_000,
  aciklama: 300,
  sayfaSayisi: 100,
} as const;
