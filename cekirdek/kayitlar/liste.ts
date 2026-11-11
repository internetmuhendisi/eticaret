// Sayfa sayfa okunan listelerin ortak sınırı (.claude/rules/veritabani.md: bir sayfadaki kayıt sayısının
// üst sınırı olsun). Liste motoru gelince sütun ve filtre tanımları da buraya bağlanır.
export const listeSayfasi = {
  varsayilanBoyut: 24,
  enCokBoyut: 100,
} as const;

// Vitrindeki ürün listelerinin sıralamaları (kart 0136, karar 0102). Sıralamanın adı adreste durur
// (?sirala=fiyat-artan): yayınlandıktan sonra adı değişmez, paylaşılmış adresler bozulur.
// - onerilen: mağaza sahibinin elle sırası (ürünün vitrin sırası, tek genel sıra); sırası olmayan ürünler
//   sonra, en yeni önce.
// - en-yeni: ürünün oluşturma zamanı, en yeni önce (kart 0127).
// - fiyat-artan, fiyat-azalan: kartta görünen en düşük fiyat (fiyat/gosterim.ts); fiyatı olmayan ürün sonda.
// "Çok satanlar" ve "en çok puan alan" sipariş ve yorumla gelir.
export const listeSiralamalari = ["onerilen", "en-yeni", "fiyat-artan", "fiyat-azalan"] as const;
export type ListeSiralamasi = (typeof listeSiralamalari)[number];

// Arama sayfasının sıralamaları (kart 0137): "en uygun" (aramanın puanı, cekirdek/moduller/urun/arama.ts) ve
// listelerin sıralamaları. Aramanın varsayılanı "en uygun"dur, mağaza sahibinin sıralama ayarı aramaya uygulanmaz.
export const aramaSiralamalari = ["en-uygun", ...listeSiralamalari] as const;
export type AramaSiralamasi = (typeof aramaSiralamalari)[number];

// Vitrindeki ürün listelerinde sayfa geçişi (kart 0136, karar 0102): numaralı sayfalar ya da "Daha fazla
// göster" (bir sonraki sayfa öncekilerin altına eklenir; adres yine sayfa numarasını taşır).
export const sayfaGecisleri = ["numarali", "daha-fazla"] as const;
export type SayfaGecisi = (typeof sayfaGecisleri)[number];
