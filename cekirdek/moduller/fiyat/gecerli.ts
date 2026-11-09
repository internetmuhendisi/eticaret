// Bir anın geçerli fiyatını veren tek işlev (kart 0080, karar 0066). Sepet, ödeme, sipariş ve vitrin
// birimin fiyatını yalnız bununla bulur (.claude/rules/e-ticaret-is-kurallari.md).
//
// İndirim başlangıç anında başlar (dahil), bitiş anında biter (hariç): bitişi "2026-11-16T00:00" olan
// indirim 15 Kasım gece yarısına kadar sürer. Zamanlar yazılırken sitenin saat diliminde yorumlanıp an
// olarak saklandığı için (servis.ts) burada saat dilimi gerekmez.
//
// Fiyatı olmayan birim satılamaz (kart 0080, kullanıcı kararı). Saklanan para birimi sitenin bugünkü
// para biriminden farklıysa fiyat yok sayılır: başka para biriminde yazılmış tutar yanlış satılmasın.

export type Fiyat = {
  birim: string;
  satisFiyati: number;
  indirimliFiyat: number | null;
  indirimBaslangici: Date | null;
  indirimBitisi: Date | null;
  paraBirimi: string;
};

export type GecerliFiyat = {
  // O anda ödenecek tutar, kuruş.
  tutar: number;
  paraBirimi: string;
  // Tutar indirimli fiyat mı? Satış fiyatı her zaman yanında durur.
  indirimde: boolean;
  satisFiyati: number;
  // İndirimdeyse ve bitişi varsa indirimin bittiği an (hariç). Süresiz indirimde ve indirimsizken yoktur.
  // Geri sayım bunu gösterir (kart 0111); elle girilmez.
  indirimBitisi?: Date;
};

export const indirimSuruyorMu = (fiyat: Fiyat, an: Date): boolean =>
  fiyat.indirimliFiyat !== null &&
  (fiyat.indirimBaslangici === null || fiyat.indirimBaslangici.getTime() <= an.getTime()) &&
  (fiyat.indirimBitisi === null || an.getTime() < fiyat.indirimBitisi.getTime());

export const gecerliFiyat = (
  fiyat: Fiyat | undefined,
  an: Date,
  paraBirimi: string,
): GecerliFiyat | undefined => {
  if (fiyat === undefined || fiyat.paraBirimi !== paraBirimi) return undefined;
  const indirimde = indirimSuruyorMu(fiyat, an);
  return {
    tutar: indirimde && fiyat.indirimliFiyat !== null ? fiyat.indirimliFiyat : fiyat.satisFiyati,
    paraBirimi: fiyat.paraBirimi,
    indirimde,
    satisFiyati: fiyat.satisFiyati,
    ...(indirimde && fiyat.indirimBitisi !== null ? { indirimBitisi: fiyat.indirimBitisi } : {}),
  };
};
