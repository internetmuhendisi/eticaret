// Testlerin renk örnekleri (kart 0105). Mağaza sahibinin panelde seçebileceği renkleri ve bozuk girdileri
// taklit eder; tema, birleşim ve tema servisi testleri renkleri buradan alır. Ham renk yalnız bu klasörde
// yazılabilir (denetim/kurallar/ham-renk.grit).
export const ornekRenk = {
  turuncu: "#FFB020",
  turuncuKucukHarfle: "#ffb020",
  turuncular: ["#FFB020", "#FFC040", "#FFD060", "#F0A000", "#E8B030", "#FFA810"],
  acikTuruncu: "#FFC040",
  // Koyu yazıyla okunmayan koyu renkler.
  koyuLacivert: "#1A1A40",
  koyuKirmizi: "#9B1C1C",
  sari: "#FFFF00",
  koyuMavi: "#1D4ED8",
  beyaz: "#FFFFFF",
  siyah: "#000000",
  ortaGri: "#808080",
  cokKoyuGri: "#202020",
  // Koyu temanın kenar rengi: koyu zeminde yazı olarak okunmaz.
  koyuKenar: "#2A303B",
  // Açık zeminde işaret olarak okunmaz.
  cokAcikGri: "#F0F0F0",
  // Bozuk girdiler.
  kisaBicim: "#FFF",
  kacisli: "#FFB020;}body{",
} as const;
