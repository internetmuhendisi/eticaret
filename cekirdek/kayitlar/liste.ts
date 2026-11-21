// Sayfa sayfa okunan listelerin ortak sınırı (.claude/rules/veritabani.md: bir sayfadaki kayıt sayısının
// üst sınırı olsun). Panel listelerinin sütun, süzgeç ve sıralama tanımları liste motorundadır
// (cekirdek/yonetim-paneli/liste/, kart 0258).
export const listeSayfasi = {
  varsayilanBoyut: 24,
  enCokBoyut: 100,
} as const;

// Panel listelerinde sayfa başına satır (kart 0258, karar 0157): mağaza sahibinin ayarı (panelSayfaBoyu), seçenekler
// yalnız bunlardır, varsayılan ilkidir. Toplu işlem en çok bir sayfanın satırlarına uygulanır.
export const panelSayfaBoylari = [25, 50, 100] as const;
export type PanelSayfaBoyu = (typeof panelSayfaBoylari)[number];

// Panel listesinde toplu işlemin sonucu (kart 0258): işlenen satırların anahtarı, işlenemeyenlerin anahtarı ve
// nedeninin kodu (ekran metne çevirir). Her satır kendi işleminde, tekil işlemle aynı denetimden geçerek işlenir;
// birinin hatası ötekileri durdurmaz.
export type TopluSonuc = {
  islenen: string[];
  islenemeyen: { anahtar: string; kod: string }[];
};

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

// Aranan metnin sınırları (kart 0137): metnin en çok harf sayısı ve en çok sözcük sayısı. Ötesi kesilir. Arama
// kutusu da metni bu uzunlukta keser.
export const aramaSinirlari = { metin: 100, sozcuk: 8 } as const;

// Vitrindeki ürün listelerinde sayfa geçişi (kart 0136, karar 0102): numaralı sayfalar ya da "Daha fazla
// göster" (bir sonraki sayfa öncekilerin altına eklenir; adres yine sayfa numarasını taşır).
export const sayfaGecisleri = ["numarali", "daha-fazla"] as const;
export type SayfaGecisi = (typeof sayfaGecisleri)[number];
