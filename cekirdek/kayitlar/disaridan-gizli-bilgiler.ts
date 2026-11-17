// Dışarıdan gelen gizli bilgiler (kart 0215, karar 0142). Sunucuda üretilen gizli bilgilerden (gizli-bilgiler.ts)
// ayrıdır: değer bir hizmetin (ödeme kuruluşu) verdiği anahtardır, yalnız o hizmeti kullanan sitede bulunur ve yoksa
// hata değildir (hizmet o sitede kullanılamaz). Burada değer durmaz; okuma cekirdek/ayar-semasi/disaridan-gizli-bilgi.ts.
// Sunucuda değer dosyadadır (dosyaDegiskeni dosyanın yolunu verir), bilgisayarda .env'deki ortam değişkenidir.
// Sunucuya kurulması bu kartta yoktur (canlıya geçişte, mağazanın sözleşmesiyle).
export const disaridanGizliBilgiler = {
  // Kartla ödeme eklentisinin ödeme kuruluşu anahtarları (iyzico'nun API anahtarı ve gizli anahtarı).
  KARTLA_ODEME_ANAHTARI: { dosyaDegiskeni: "KARTLA_ODEME_ANAHTARI_DOSYASI" },
  KARTLA_ODEME_GIZLI_ANAHTARI: { dosyaDegiskeni: "KARTLA_ODEME_GIZLI_ANAHTARI_DOSYASI" },
} as const satisfies Record<string, { dosyaDegiskeni: string }>;
export type DisaridanGizliBilgi = keyof typeof disaridanGizliBilgiler;
