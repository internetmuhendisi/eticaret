// Ürünün yayın durumlarının tek kaydı (kart 0076, karar 0062, .claude/rules/kayit-dosyalari.md).
// Durum adı veritabanına yazılır: yayınlandıktan sonra ancak eski kayıtları dönüştüren bir veri
// değişikliğiyle değişir. Veritabanındaki denetim (urunler_durum) bu listeyle aynıdır, bunu
// cekirdek/moduller/urun/testler/servis.test.ts denetler.
//
// Her durumun vitrinde nerede göründüğü burada yazar; vitrin koşulu (cekirdek/moduller/urun/vitrin.ts)
// yalnız bu tablodan kurulur.
// - sayfa: ürünün kendi sayfası bağlantıyla açılır ve satın alınabilir.
// - liste: ürün kategori, arama ve öteki listelerde görünür.
// - zamanli: ürün yalnız yayın zamanı geldikten sonra görünür (o ana kadar taslak gibidir).
export const urunDurumlari = ["taslak", "yayinda", "zamanlanmis", "gizli", "arsiv"] as const;
export type UrunDurumu = (typeof urunDurumlari)[number];

// Yeni ürünün durumu verilmezse: vitrinde görünmez.
export const varsayilanUrunDurumu: UrunDurumu = "taslak";

export const vitrinYerleri = ["sayfa", "liste"] as const;
export type VitrinYeri = (typeof vitrinYerleri)[number];

export const urunDurumVitrini = {
  taslak: { sayfa: false, liste: false, zamanli: false },
  yayinda: { sayfa: true, liste: true, zamanli: false },
  zamanlanmis: { sayfa: true, liste: true, zamanli: true },
  // Kullanıcı kararı (karar 0062): listede ve aramada yok, bağlantıyı bilen açıp satın alır.
  gizli: { sayfa: true, liste: false, zamanli: false },
  // Kullanıcı kararı (karar 0062): vitrinden bütünüyle çıkar.
  arsiv: { sayfa: false, liste: false, zamanli: false },
} as const satisfies Record<UrunDurumu, Record<VitrinYeri | "zamanli", boolean>>;

// Ürünün türü (kart 0085, karar 0071). Veritabanına yazılmaz, ürünün seçeneklerinden çıkar: silinmemiş
// seçeneği olan ürün varyantlıdır. Basit ürünün tek birimi vardır (boş birleşim); varyantlı üründe her
// birleşim bir birimdir.
export const urunTurleri = ["basit", "varyantli"] as const;
export type UrunTuru = (typeof urunTurleri)[number];

// Varyantların sınırları: bir üründe en çok bu kadar silinmemiş seçenek, seçenek başına değer ve
// birleşim olur. Panel ve sorgular sınırsız birleşimle yavaşlar.
export const varyantSinirlari = { secenek: 3, deger: 50, birlesim: 100 } as const;

// Ürün sayfasında tükenmiş seçenek değeri (kart 0138, karar 0102). Mağaza sahibinin ayarıdır (tukenmisSecenek).
// Değer, öncekilerde seçilenlerle birlikte satılabilir bir birleşime götürmüyorsa tükenmiştir.
// - ustu-cizili: değer görünür, üstü çizilidir ve seçilemez; ekran okuyucu "tükendi" duyar.
// - gizle: değer gösterilmez.
export const tukenmisSecenekGosterimleri = ["ustu-cizili", "gizle"] as const;
export type TukenmisSecenekGosterimi = (typeof tukenmisSecenekGosterimleri)[number];

// Ürün sayfası ilk açıldığında seçili birleşim (kart 0138, kullanıcı kararı). Mağaza sahibinin ayarıdır
// (secenekOnSecimi). Adreste geçerli bir seçim varsa o kullanılır.
// - ilk-satilabilir: birimlerin sırasında ilk satılabilir birleşim seçili gelir; hiçbiri satılamıyorsa seçim yoktur.
// - secimsiz: müşteri seçene kadar hiçbir değer seçili değildir, ürünün fiyat aralığı görünür.
export const secenekOnSecimleri = ["ilk-satilabilir", "secimsiz"] as const;
export type SecenekOnSecimi = (typeof secenekOnSecimleri)[number];

// Panelin ürün listesi (kart 0262, karar 0161). Sıralamanın ve süzgecin adı adreste durur (?sirala=ad-artan): adı
// değişmez, paylaşılmış adresler bozulur. İlki varsayılandır.
// - son-degisen: ürünün son değişikliği, en yeni önce.
// - ad-artan, ad-azalan: ad (büyük küçük harf ayrımsız).
// - stok-artan, stok-azalan: silinmemiş birimlerin toplam stoğu; takibi kapalı ürün her iki yönde sonda.
// - fiyat-artan, fiyat-azalan: silinmemiş birimlerin bugünkü girilen en düşük fiyatı (indirim sürüyorsa indirimli);
//   fiyatı olmayan ürün her iki yönde sonda. Vergi çevirmesi sıraya katılmaz.
// Ürün sayfasında en çok kaç ilgili ürün görünür (kullanıcı kararı, karar 0065); panelin ürün ekranı da en çok bu
// kadarını seçtirir (kart 0263).
export const ilgiliUrunSiniri = 4;

// Ağırlık birimlerinin gram karşılığı ve panelde yazılan ondalık sayısı (kart 0263). Ağırlık gram olarak saklanır
// (karar 0062); panel sitenin agirlikBirimi ayarıyla gösterir ve okur.
export const agirlikBirimleri = {
  kg: { gram: 1000, ondalik: 3 },
  g: { gram: 1, ondalik: 0 },
  lb: { gram: 453.59237, ondalik: 3 },
  oz: { gram: 28.349523125, ondalik: 2 },
} as const;
export type AgirlikBirimi = keyof typeof agirlikBirimleri;
// Ağırlığın en çok gram değeri (ürün şeması ve panelin okuması, kart 0263).
export const agirlikSiniriGram = 10_000_000;
export const agirlikBirimiKodlari = Object.keys(agirlikBirimleri) as [
  AgirlikBirimi,
  ...AgirlikBirimi[],
];

export const urunPanelSiralamalari = [
  "son-degisen",
  "ad-artan",
  "ad-azalan",
  "stok-artan",
  "stok-azalan",
  "fiyat-artan",
  "fiyat-azalan",
] as const;
export type UrunPanelSiralamasi = (typeof urunPanelSiralamalari)[number];

// Panelin stok süzgeci ve satırın stok durumu (stok/durum.ts ile aynı kural): tükendi (satılabilir birimi yok),
// düşük (tükenmemiş, silinmemiş fiyatlı ve takipli bir birimi eşikte ya da altında), stokta (ötekiler; takibi kapalı
// ürün de).
export const urunPanelStokDurumlari = ["stokta", "dusuk", "tukendi"] as const;
export type UrunPanelStokDurumu = (typeof urunPanelStokDurumlari)[number];

// Panelin ürün listesinin toplu işlemleri (karar 0157: temel dört) ve izinleri. Yayınla, taslağa al ve arşive al
// ürünün durumunu değiştirir; sil ürünü siler. Her ürün tekil işlemle aynı yoldan, kendi işleminde geçer.
export const urunTopluIslemleri = {
  yayinla: { izin: "urun.degistir", durum: "yayinda" },
  "taslaga-al": { izin: "urun.degistir", durum: "taslak" },
  "arsive-al": { izin: "urun.degistir", durum: "arsiv" },
  sil: { izin: "urun.sil", durum: null },
} as const satisfies Record<
  string,
  { izin: "urun.degistir" | "urun.sil"; durum: UrunDurumu | null }
>;
export type UrunTopluIslemi = keyof typeof urunTopluIslemleri;
export const urunTopluIslemKodlari = Object.keys(urunTopluIslemleri) as UrunTopluIslemi[];

// Panel listesinde aranan metnin en çok uzunluğu.
export const urunPanelAramaSiniri = 100;
