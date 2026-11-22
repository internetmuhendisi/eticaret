// Yüklenebilen dosya türlerinin ve sınırlarının tek kaydı (kart 0072, karar 0058). Tür içerikten
// anlaşılır: dosyanın adına ve uzantısına bakılmaz. SVG ve HTML yoktur, içlerinde çalışan kod
// taşıyabilirler. Video dosyası yüklenmez: galerideki video bir video sitesinin bağlantısıdır (kart 0087,
// karar 0073).

// İmza: dosyanın başındaki baytlar. null, o baytın her değeri alabileceğini söyler.
type Imza = readonly (number | null)[];

export const dosyaTurleri = {
  jpeg: { mime: "image/jpeg", uzanti: "jpg", imzalar: [[0xff, 0xd8, 0xff]] },
  png: {
    mime: "image/png",
    uzanti: "png",
    imzalar: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  // "RIFF", dört bayt uzunluk, "WEBP".
  webp: {
    mime: "image/webp",
    uzanti: "webp",
    imzalar: [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  },
} as const satisfies Record<string, { mime: string; uzanti: string; imzalar: readonly Imza[] }>;
export type DosyaTuru = keyof typeof dosyaTurleri;

// Tarayıcının dosya seçicisinde önerilen türler (kart 0094): yükleme parçasının `kabul` değeri. Sunucu yine içerikten
// denetler.
export const yuklenebilenTurler: string = Object.values(dosyaTurleri)
  .map((tur) => tur.mime)
  .join(",");

export const dosyaSinirlari = {
  // Yüklenen dosyanın en büyük boyutu.
  enCokBayt: 10 * 1024 * 1024,
  // Görselin en çok piksel sayısı: küçük görünüp açılınca belleği dolduran dosyaya karşı.
  // 40 milyon piksel, örneğin 8000 x 5000.
  enCokPiksel: 40_000_000,
} as const;

// Sitenin dosya klasörünü veren ortam değişkeni. Yerelde ve sunucuda kutu tanımı verir.
export const dosyaKlasoruDegiskeni = "DOSYA_KLASORU";
// Klasörün kutu içindeki yeri: yerelde ve sunucuda aynıdır.
export const kutudakiDosyaKlasoru = "/dosyalar";

// Kaydetmenin reddetme sebepleri. Ekran metni bu kodlardan çözer.
export const dosyaHatalari = [
  "bos",
  "cok-buyuk",
  "tur-izinsiz",
  "bozuk",
  "cok-fazla-piksel",
] as const;
export type DosyaHatasi = (typeof dosyaHatalari)[number];
