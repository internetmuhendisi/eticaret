// Alan değerlerini okuma (kart 0108). Değerler düzen servisinde tarifin şemasından geçmiştir; görünüş yine de
// türünü sınar, bozuk bir değer bölümü düşürmesin.
export const metinMi = (deger: unknown): deger is string => typeof deger === "string";

export type BaglantiDegeri = { adres: string; yeniSekme: boolean };
export const baglantiMi = (deger: unknown): deger is BaglantiDegeri =>
  typeof deger === "object" &&
  deger !== null &&
  typeof (deger as { adres?: unknown }).adres === "string";
