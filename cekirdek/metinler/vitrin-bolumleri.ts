// Vitrinin tarayıcı koduna giden metin bölümleri (kart 0253, karar 0152). Vitrinin tarayıcıdaki okuyucusu
// (istemci-metni.tsx) yalnız bu bölümlerin anahtarlarını kabul eder; dosyası `pnpm vitrin-metinleri` ile tr.json'dan
// üretilir (vitrin-metinleri.json) ve testle tr.json'la aynı tutulur. Panel ve katalog bütün dosyayı okur.
export const vitrinMetinBolumleri = ["ortak", "vitrin", "eklenti"] as const;
export type VitrinMetinBolumu = (typeof vitrinMetinBolumleri)[number];
