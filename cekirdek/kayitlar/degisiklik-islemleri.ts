// Değişiklik kaydına yazılan işlemlerin tek kaydı (kart 0029, karar 0045). Kod bir kez yayınlandıktan
// sonra adı değişmez: eski kayıtlar bu adı taşır. Fiyat, stok ve sipariş kendi modülleriyle eklenir.
export const degisiklikIslemleri = [
  "rol.verildi",
  "rol.alindi",
  "yonetici.kapatildi",
  "yonetici.sifre-sifirlandi",
  // Mağaza sahibinin ayarı veritabanına ilk kez başlangıç değeriyle yazıldı (kart 0069).
  "magaza-ayari.baslangic",
  "magaza-ayari.degisti",
  // Vergi sınıfı ya da oranı sitenin başlangıç verisinden ilk kez yazıldı (kart 0074).
  "vergi.baslangic",
  "vergi-sinifi.eklendi",
  "vergi-sinifi.degisti",
  "vergi-sinifi.silindi",
  "vergi-orani.eklendi",
  "vergi-orani.degisti",
  "vergi-orani.silindi",
  // Kargo ücretinin vergi sınıfı değişti (kart 0075).
  "vergi.kargo-sinifi",
  // Ürün ve satılabilir birimi (kart 0076).
  "urun.eklendi",
  "urun.degisti",
  "urun.silindi",
  // Varyantlı ürünün seçenekleri, değerleri ve birleşimleri (kart 0085). Değeri silinen birleşim de
  // kendi satırıyla urun-birimi.silindi olarak yazılır.
  "urun-secenegi.eklendi",
  "urun-secenegi.degisti",
  "urun-secenegi.silindi",
  "urun-secenek-degeri.eklendi",
  "urun-secenek-degeri.degisti",
  "urun-secenek-degeri.silindi",
  "urun-birimi.eklendi",
  "urun-birimi.degisti",
  "urun-birimi.silindi",
  // Ürün galerisi (kart 0087): öğe eklendi, alternatif metni değişti, silindi; sıralama ürünün
  // kaydına yazılır (kayıt türü urun). Silinen öğeyi seçmiş birleşimin görseli urun-birimi.degisti
  // olarak yazılır.
  "urun-galerisi.eklendi",
  "urun-galerisi.degisti",
  "urun-galerisi.silindi",
  "urun-galerisi.siralandi",
  // Kategori (kart 0077). Taşıma, üst kategorinin değişmesidir: kategori.degisti.
  "kategori.eklendi",
  "kategori.degisti",
  "kategori.silindi",
  // Marka ve etiket (kart 0078).
  "marka.eklendi",
  "marka.degisti",
  "marka.silindi",
  "etiket.eklendi",
  "etiket.degisti",
  "etiket.silindi",
  // Ürün özelliği ve liste türündeki seçenekleri (kart 0086). Ürünün değerleri urun.* ile yazılır;
  // silinen özelliğin ya da seçeneğin değerlerinin kalktığı ürünler silme kaydında listelenir.
  "ozellik.eklendi",
  "ozellik.degisti",
  "ozellik.silindi",
  "ozellik-secenegi.eklendi",
  "ozellik-secenegi.degisti",
  "ozellik-secenegi.silindi",
  // Satılabilir birimin fiyatı (kart 0080). İlk fiyatta eski değer boştur.
  "fiyat.degisti",
  // Satılabilir birimin stoğu panelden elle düzeltildi (kart 0082). Siparişin düşürmesi ve iptalin
  // artırması yalnız stok geçmişine yazılır.
  "stok.duzeltildi",
  // Sitenin tema sürümü (kart 0105): başlangıç değeriyle ilk sürüm, mağaza sahibinin yayını ve önceki bir
  // sürüme dönüş. Kayıt kimliği yeni sürümün kimliğidir.
  "tema.baslangic",
  "tema.yayinlandi",
  "tema.geri-donuldu",
  // Sitenin düzeni (kart 0106): başlangıç düzeniyle ilk sürüm ve bölüm işlemleri. Kayıt kimliği yeni düzen
  // sürümünün kimliğidir; değerlerde bölümün kimliği ve türü yazar.
  "duzen.baslangic",
  "duzen.bolum-eklendi",
  "duzen.bolum-degisti",
  "duzen.bolum-gizlendi",
  "duzen.bolum-gosterildi",
  "duzen.bolumler-siralandi",
  "duzen.bolum-silindi",
  // Tema değişikliğinin düzeni (kart 0113): yeni temanın düzeni uygulandı ya da düzen korunup görünümü
  // olmayan bölümler varsayılana düştü; tema kodu değişen geri dönüşte önceki düzen getirildi. Tema
  // sürümünün kaydıyla aynı işlemde yazılır; değerlerde düzen sürümlerinin sırası ve yol yazar.
  "duzen.tema-degisti",
  "duzen.geri-donuldu",
  // Menü ve öğeleri (kart 0107). Öğenin taşınması üstünün değişmesidir: menu-ogesi.degisti. Kardeşlerin
  // sıralanması menünün kaydına yazılır. Silinen menünün ve öğenin alt öğeleri silme kaydında listelenir.
  // Başlangıç menüleri aynı işlemlerle, "baslangic-menu" adlı sistem işlemi olarak yazılır.
  "menu.eklendi",
  "menu.degisti",
  "menu.silindi",
  "menu-ogesi.eklendi",
  "menu-ogesi.degisti",
  "menu-ogesi.silindi",
  "menu-ogesi.siralandi",
] as const;
export type DegisiklikIslemi = (typeof degisiklikIslemleri)[number];

// Değişen kaydın türü.
export const degisiklikKayitTurleri = [
  "yonetici",
  "magaza-ayari",
  "vergi-sinifi",
  "vergi-orani",
  "urun",
  // Kart 0085: varyantlı ürünün seçeneği, değeri ve satılabilir birimi.
  "urun-secenegi",
  "urun-secenek-degeri",
  "urun-birimi",
  // Kart 0087: ürün galerisinin öğesi.
  "urun-galeri-ogesi",
  "kategori",
  "marka",
  "etiket",
  // Kart 0086: ürün özelliği ve liste seçeneği.
  "ozellik",
  "ozellik-secenegi",
  // Kayıt kimliği satılabilir birimin kimliğidir (kart 0080).
  "fiyat",
  // Kayıt kimliği satılabilir birimin kimliğidir (kart 0082).
  "stok",
  // Kart 0105: sitenin tema sürümü.
  "tema-surumu",
  // Kart 0106: sitenin düzen sürümü.
  "duzen-surumu",
  // Kart 0107: menü ve menü öğesi.
  "menu",
  "menu-ogesi",
] as const;
export type DegisiklikKayitTuru = (typeof degisiklikKayitTurleri)[number];

// Değişikliği kim yaptı: bir hesap ya da komut gibi hesabı olmayan bir işlem.
export type DegisikligiYapan =
  | { tur: "yonetici" | "musteri" | "sahip"; kimlik: string }
  | { tur: "sistem"; ad: string };

export const sistemIslemi = (ad: string): DegisikligiYapan => ({ tur: "sistem", ad });
