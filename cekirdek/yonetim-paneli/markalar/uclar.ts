// Markalar ve etiketler ekranının kullandığı yönetici uçları (kart 0261, uç belgesi: cekirdek/kapi/uclar.md).
export const grupUclari = {
  marka: { ekle: "marka-ekle", degistir: "marka-degistir", sil: "marka-sil" },
  etiket: { ekle: "etiket-ekle", degistir: "etiket-degistir", sil: "etiket-sil" },
} as const;
export type GrupTuru = keyof typeof grupUclari;
