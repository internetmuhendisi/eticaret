// Yüklenebilen dosya türlerinin ve sınırlarının tek kaydı (kart 0072, karar 0058). Tür içerikten
// anlaşılır: dosyanın adına ve uzantısına bakılmaz. SVG ve HTML yoktur, içlerinde çalışan kod
// taşıyabilirler. Video dosyası yüklenmez: galerideki video bir video sitesinin bağlantısıdır (kart 0087,
// karar 0073).

// İmza: dosyanın başındaki baytlar. null, o baytın her değeri alabileceğini söyler.
type Imza = readonly (number | null)[];

export const dosyaTurleri = {
  jpeg: { mime: "image/jpeg", uzanti: "jpg", ad: "JPEG", imzalar: [[0xff, 0xd8, 0xff]] },
  png: {
    mime: "image/png",
    uzanti: "png",
    ad: "PNG",
    imzalar: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  // "RIFF", dört bayt uzunluk, "WEBP".
  webp: {
    mime: "image/webp",
    uzanti: "webp",
    ad: "WebP",
    imzalar: [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  },
} as const satisfies Record<
  string,
  // ad: ekranda türün okunan adı (kart 0094: "JPEG, PNG veya WebP").
  { mime: string; uzanti: string; ad: string; imzalar: readonly Imza[] }
>;
export type DosyaTuru = keyof typeof dosyaTurleri;

// Belge türleri (kart 0268, karar 0170): görsel değildir, yeniden kodlanmaz, olduğu gibi saklanır. Yalnız kendi
// yoluyla kaydedilir (belgeKaydet) ve okunur (belgeOku); görselin hiçbir yolu (logo, galeri, vitrin ve panel görseli)
// belge kaydını görmez. Tarayıcıya yalnız indirilecek dosya olarak verilir: PDF içinde kod taşıyabilir.
// "%PDF-".
export const belgeTurleri = {
  pdf: {
    mime: "application/pdf",
    uzanti: "pdf",
    ad: "PDF",
    imzalar: [[0x25, 0x50, 0x44, 0x46, 0x2d]],
  },
} as const satisfies Record<
  string,
  { mime: string; uzanti: string; ad: string; imzalar: readonly Imza[] }
>;
export type BelgeTuru = keyof typeof belgeTurleri;
// Dosya kaydındaki bütün türler (dosyanın adı ve uzantısı için).
export const kayitliDosyaTurleri = { ...dosyaTurleri, ...belgeTurleri };
export type KayitliDosyaTuru = keyof typeof kayitliDosyaTurleri;
// Yüklenebilen belge türleri: dosya seçicisinin `kabul` değeri ve okunan adları.
export const yuklenebilenBelgeTurleri: string = Object.values(belgeTurleri)
  .map((tur) => tur.mime)
  .join(",");
export const yuklenebilenBelgeTurAdlari: string[] = Object.values(belgeTurleri).map(
  (tur) => tur.ad,
);
// Belgenin en büyük boyutu (kart 0268): e-fatura portalının PDF'i birkaç yüz KB'dır.
export const belgeSinirlari = { enCokBayt: 5 * 1024 * 1024 } as const;

// Tarayıcının dosya seçicisinde önerilen türler (kart 0094): yükleme parçasının `kabul` değeri. Sunucu yine içerikten
// denetler.
export const yuklenebilenTurler: string = Object.values(dosyaTurleri)
  .map((tur) => tur.mime)
  .join(",");
// Yüklenebilen türlerin okunan adları (kart 0094): ekran metnine biçimleyicinin listesiyle girer.
export const yuklenebilenTurAdlari: string[] = Object.values(dosyaTurleri).map((tur) => tur.ad);

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
