// Sitelerin gizli bilgileri (kart 0019, karar 0031). Burada değer durmaz; yalnız adı, sunucudaki
// dosyanın adı ve değerin nasıl kurulacağı yazar. Uygulama değeri gizliBilgi() ile okur
// (cekirdek/ayar-semasi/gizli-bilgi.ts).
//
// Değer: on + sunucuda üretilen 64 haneli rastgele değer + son. Rastgele değer bilgisayara gelmez.
// Ön ve son parçada {veritabani}, sitenin veritabanının ve veritabanı kullanıcısının adıdır
// (site_<kod adı>). Parçalar ayrı yazılır: kayıtta şifreli adres kalıbı durmaz (veri ayrımı testi).
// Veritabanı kutusu yerelde "veritabani" adlı hizmettir (sunucu/compose.yaml), sunucuda her
// sitenin ağında "veritabani" adıyla görünür (komutlar/sunucu-veritabani.mts).
//
// yenilenir: pnpm sunucu-gizli --yenile bu değeri değiştirir mi. İki aşamalı giriş anahtarı değişirse
// veritabanındaki şifreli gizliler açılamaz, bütün yöneticiler panelin dışında kalır (karar 0044).
export const gizliBilgiler = {
  VERITABANI_ADRESI: {
    dosya: "veritabani_adresi",
    on: "postgres://{veritabani}:",
    son: "@veritabani:5432/{veritabani}",
    yenilenir: true,
  },
  IKI_ASAMA_ANAHTARI: {
    dosya: "iki_asama_anahtari",
    on: "",
    son: "",
    yenilenir: false,
  },
} as const satisfies Record<string, { dosya: string; on: string; son: string; yenilenir: boolean }>;
export type GizliBilgi = keyof typeof gizliBilgiler;

// Sunucuda bir değerin dosya yolunu veren ortam değişkeninin eki: VERITABANI_ADRESI_DOSYASI.
export const dosyaEki = "_DOSYASI";
