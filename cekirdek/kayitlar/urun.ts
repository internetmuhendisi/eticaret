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
