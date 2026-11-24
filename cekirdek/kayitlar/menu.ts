// Menülerin tek kaydı (kart 0107, karar 0082): menü türleri, öğenin bağlanabileceği hedefler, derinlik ve
// sınırlar. Servis, şemalar, veritabanının denetimleri (değişiklik 0026) ve başlangıç dosyasının şeması bu
// değerleri buradan okur; veritabanındaki kopyaların bununla aynı kaldığını menü testi ölçer.

// elle: öğelerini mağaza sahibi kurar. kategori-agaci: öğe saklamaz, kategori ağacından kendiliğinden
// kurulur (kullanıcı kararı: bütün ağaç, derinlik sınırına kadar).
export const menuTurleri = ["elle", "kategori-agaci"] as const;
export type MenuTuru = (typeof menuTurleri)[number];

// Öğenin bağlandığı yer. baslik bağlantısızdır: açılır menünün ya da alt bilgi sütununun başıdır.
export const menuHedefTurleri = [
  "kategori",
  "marka",
  "urun",
  // Sabit sayfa (kart 0273).
  "sayfa",
  // Tek bir blog yazısı (kart 0273, karar 0176'nın sonucu). Blogun listesi "adres" hedefiyle (/blog) bağlanır.
  "blog-yazisi",
  // Sitenin kendi adresi (/ ile) ya da https adresi; bölümlerdeki bağlantı kuralıyla aynı.
  "adres",
  "baslik",
] as const;
export type MenuHedefTuru = (typeof menuHedefTurleri)[number];

// Seçilebilen hedefler. Bugün hepsi açıktır (sayfa kart 0273'te açıldı); yazılmamış bir hedef türü eklenirse burada
// kapalı başlar, şema ve servis reddeder.
export const kullanilabilirMenuHedefleri = {
  kategori: true,
  marka: true,
  urun: true,
  sayfa: true,
  "blog-yazisi": true,
  adres: true,
  baslik: true,
} as const satisfies Record<MenuHedefTuru, boolean>;

// Kaydı veritabanında olan, kimliğiyle bağlanan hedefler.
export const kayitliMenuHedefleri = [
  "kategori",
  "marka",
  "urun",
  "sayfa",
  "blog-yazisi",
] as const satisfies readonly MenuHedefTuru[];
export type KayitliMenuHedefi = (typeof kayitliMenuHedefleri)[number];
// Kayıtlı hedeflerden katalogun kayıtları (panelde kayit-ara ucuyla, urun.gor) ve içeriğin kayıtları (icerik-ara ucuyla,
// icerik.gor) ayrı aranır: içerik editörü ürünleri görmeden sayfayı menüye bağlayabilsin.
export const icerikMenuHedefleri = [
  "sayfa",
  "blog-yazisi",
] as const satisfies readonly KayitliMenuHedefi[];
export type IcerikMenuHedefi = (typeof icerikMenuHedefleri)[number];

export const menuSinirlari = {
  // En üst düzey ve onun bir alt düzeyi (açılır menü). Kategori menüsü de bu derinliğe kadar kurulur.
  derinlik: 2,
  // Bir menüdeki silinmemiş öğe sayısı.
  ogeSayisi: 100,
  menuAdi: 100,
  ogeMetni: 100,
  adres: 2000,
  // Sitedeki silinmemiş menü sayısı (kullanıcı kararı: mağaza sahibi istediği kadar menü açar; bu sınır
  // yalnız kötüye kullanıma karşıdır).
  menuSayisi: 50,
} as const;
