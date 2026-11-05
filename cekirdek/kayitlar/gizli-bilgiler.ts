// Sitelerin gizli bilgileri (kart 0019, karar 0031). Burada değer durmaz; yalnız adı, sunucudaki
// dosyanın adı ve değerin nasıl kurulacağı yazar. Uygulama değeri gizliBilgi() ile okur
// (cekirdek/ayar-semasi/gizli-bilgi.ts).
//
// Şablondaki yer tutucular:
// - {rastgele}: sunucuda üretilen 64 haneli rastgele değer. Tam bir kez geçer. Bilgisayara gelmez.
// - {veritabani}: sitenin veritabanının ve veritabanı kullanıcısının adı (site_<kod adı>).
// Sunucuda veritabanı kutusunun adı "veritabani"dır (sunucu/compose.yaml).
export const gizliBilgiler = {
  VERITABANI_ADRESI: {
    dosya: "veritabani_adresi",
    sablon: "postgres://{veritabani}:{rastgele}@veritabani:5432/{veritabani}",
  },
} as const satisfies Record<string, { dosya: string; sablon: string }>;
export type GizliBilgi = keyof typeof gizliBilgiler;

// Sunucuda bir değerin dosya yolunu veren ortam değişkeninin eki: VERITABANI_ADRESI_DOSYASI.
export const dosyaEki = "_DOSYASI";
