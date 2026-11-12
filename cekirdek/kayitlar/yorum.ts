// Ürün yorumlarının kaydı (kart 0139, karar 0109, .claude/rules/kayit-dosyalari.md). Durum adı veritabanına
// yazılır: yayınlandıktan sonra ancak eski kayıtları dönüştüren bir veri değişikliğiyle değişir. Veritabanındaki
// denetim (yorumlar_durum) bu listeyle aynıdır, bunu cekirdek/moduller/yorum/testler/servis.test.ts denetler.
//
// - onay-bekliyor: müşteri yazdı, mağaza henüz onaylamadı. Hiçbir yerde görünmez, ortalamaya girmez.
// - yayinda: mağaza onayladı. Ürün sayfasında, ürün kartının puanında ve ana sayfanın yorum bölümünde görünür.
// - reddedildi: mağaza reddetti. Hiçbir yerde görünmez, ortalamaya girmez; satırı kalır.
export const yorumDurumlari = ["onay-bekliyor", "yayinda", "reddedildi"] as const;
export type YorumDurumu = (typeof yorumDurumlari)[number];

// Mağazanın verebileceği karar: yorum yayınlanır ya da reddedilir. Yayındaki yorum sonradan reddedilebilir,
// reddedilen yayınlanabilir; onay bekliyor durumuna dönülmez.
export const yorumKararlari = ["yayinda", "reddedildi"] as const satisfies readonly YorumDurumu[];

// Puan 1–5 tam sayıdır. Metinlerin en çok uzunluğu UTF-16 birimidir (formun maxLength'i ve şema aynı sayar).
export const yorumSinirlari = {
  enDusukPuan: 1,
  enYuksekPuan: 5,
  baslik: 120,
  metin: 2000,
  // Müşterinin formda yazdığı ad ve soyad; kayda yalnız kısaltılmış hâli girer ("Ayşe Y.").
  ad: 80,
  // Ürün sayfasında bir sayfada gösterilen yorum ("Daha fazla göster" bir sonrakini ekler) ve en çok sayfa: bir
  // istek en çok sayfa × sayfa yorumu okur (en yeni 100 yorum; bağımsız kontrolün bulgusu).
  sayfa: 5,
  enCokSayfa: 20,
  // Yönetici listesinin bir sayfası.
  yoneticiSayfasi: 50,
} as const;
