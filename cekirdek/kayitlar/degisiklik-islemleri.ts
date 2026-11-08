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
  // Satılabilir birimin fiyatı (kart 0080). İlk fiyatta eski değer boştur.
  "fiyat.degisti",
] as const;
export type DegisiklikIslemi = (typeof degisiklikIslemleri)[number];

// Değişen kaydın türü.
export const degisiklikKayitTurleri = [
  "yonetici",
  "magaza-ayari",
  "vergi-sinifi",
  "vergi-orani",
  "urun",
  "kategori",
  "marka",
  "etiket",
  // Kayıt kimliği satılabilir birimin kimliğidir (kart 0080).
  "fiyat",
] as const;
export type DegisiklikKayitTuru = (typeof degisiklikKayitTurleri)[number];

// Değişikliği kim yaptı: bir hesap ya da komut gibi hesabı olmayan bir işlem.
export type DegisikligiYapan =
  | { tur: "yonetici" | "musteri" | "sahip"; kimlik: string }
  | { tur: "sistem"; ad: string };

export const sistemIslemi = (ad: string): DegisikligiYapan => ({ tur: "sistem", ad });
