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
