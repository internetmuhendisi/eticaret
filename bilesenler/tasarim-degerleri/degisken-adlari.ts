// Tema değerlerinin CSS değişkeni adları. Tailwind ayarı sınıfları bu adlara bağlar, css.ts değerleri
// bu adlarla yazar; ikisi aynı işlevi kullandığı için ayrışamaz.
export const degiskenAdi = {
  renk: (ad: string) => `--renk-${ad}`,
  golge: (ad: string) => `--golge-${ad}`,
  yaziTipi: (ad: string) => `--yazi-tipi-${ad}`,
  kalinlik: (ad: string) => `--kalinlik-${ad}`,
  yaziBoyu: (ad: string) => `--yazi-boyu-${ad}`,
  satirYuksekligi: (ad: string) => `--satir-yuksekligi-${ad}`,
  kose: (ad: string) => `--kose-${ad}`,
};
