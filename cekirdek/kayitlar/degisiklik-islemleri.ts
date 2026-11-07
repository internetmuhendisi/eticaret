// Değişiklik kaydına yazılan işlemlerin tek kaydı (kart 0029, karar 0045). Kod bir kez yayınlandıktan
// sonra adı değişmez: eski kayıtlar bu adı taşır. Fiyat, stok ve sipariş kendi modülleriyle eklenir.
export const degisiklikIslemleri = [
  "rol.verildi",
  "rol.alindi",
  "yonetici.kapatildi",
  "yonetici.sifre-sifirlandi",
] as const;
export type DegisiklikIslemi = (typeof degisiklikIslemleri)[number];

// Değişen kaydın türü.
export const degisiklikKayitTurleri = ["yonetici"] as const;
export type DegisiklikKayitTuru = (typeof degisiklikKayitTurleri)[number];

// Değişikliği kim yaptı: bir hesap ya da komut gibi hesabı olmayan bir işlem.
export type DegisikligiYapan =
  | { tur: "yonetici" | "musteri" | "sahip"; kimlik: string }
  | { tur: "sistem"; ad: string };

export const sistemIslemi = (ad: string): DegisikligiYapan => ({ tur: "sistem", ad });
