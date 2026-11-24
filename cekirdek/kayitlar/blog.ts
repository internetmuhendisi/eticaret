// Blog yazılarının kaydı (kart 0272, karar 0176). Durum adı veritabanına yazılır: yayınlandıktan sonra ancak eski
// kayıtları dönüştüren bir veri değişikliğiyle değişir. Veritabanındaki denetim (blog_yazilari_durum) bu listeyle aynıdır,
// bunu cekirdek/moduller/icerik/testler/servis.test.ts denetler.
//
// - taslak: vitrinde görünmez.
// - zamanlanmis: yayın zamanı gelince görünür (yayin_zamani zorunlu).
// - yayinda: görünür; yayın zamanı ilk yayınlandığı andır (sıra ve tarih bundandır).
export const blogYaziDurumlari = ["taslak", "zamanlanmis", "yayinda"] as const;
export type BlogYaziDurumu = (typeof blogYaziDurumlari)[number];

// Metinlerin en çok uzunluğu (UTF-16 birimi; form ve şema aynı sayar). İçerik biçimli metindir (HTML), sınırı
// yazının HTML'idir. Vitrinde blog listesi sayfa başına yazıyı, panel kategori sayısını sınırlar.
export const blogSinirlari = {
  baslik: 200,
  ozet: 200,
  icerik: 100_000,
  yazar: 100,
  kapakMetni: 250,
  kategoriAdi: 60,
  kategoriSayisi: 50,
  vitrinSayfasi: 12,
  panelArama: 100,
} as const;

// Panelin blog listesinin sıralamaları; ilki varsayılandır. Ad adreste durur (?sirala=yayin-artan).
export const blogPanelSiralamalari = ["yayin-azalan", "yayin-artan", "baslik-artan"] as const;
export type BlogPanelSiralamasi = (typeof blogPanelSiralamalari)[number];
