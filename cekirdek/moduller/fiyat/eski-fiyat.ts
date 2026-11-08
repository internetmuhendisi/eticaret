// İndirimli üründe gösterilecek eski fiyat (kart 0081, karar 0067). Tek yer: vitrin, sepet ve e-posta
// eski fiyatı yalnız buradan alır (gosterim.ts üzerinden).
//
// Fiyat geçmişi (kart 0080) her değişikliğin tam hâlini yazıldığı anla tutar. Bir satır, yazıldığı
// andan sonraki satır yazılana kadar geçerlidir; içinde indirim, kendi başlangıç ve bitişiyle geçerlidir.
// Böylece geçmişten her an için uygulanan fiyat (indirimli ya da değil) kurulur.
//
// Kurallar (kullanıcı kararları):
// - Ürün o anda indirimde değilse eski fiyat yoktur.
// - Ayar kapalıysa eski fiyat, o anki satış fiyatıdır (indirimden önceki fiyat).
// - Ayar açıksa eski fiyat, indirimin başladığı andan önceki 30 günde uygulanan en düşük fiyattır.
//   Önceki indirimler de bu fiyata dahildir. İndirim fiyatı değişerek kesintisiz sürdüyse başlangıcı
//   ilk indirimin başladığı andır.
// - O 30 günde hiç fiyat yoksa (ürün doğrudan indirimle girilmiş) ya da bulunan en düşük fiyat bugünkü
//   indirimli fiyattan yüksek değilse eski fiyat gösterilmez.
// - Başka para biriminde yazılmış satırlar o dönemde fiyat yokmuş gibi sayılır.
import type { FiyatGecmisiSatiri } from "./servis.ts";

// Eski fiyatın arandığı süre: indirimin başladığı andan geriye.
export const eskiFiyatGunu = 30;
const gunMs = 24 * 60 * 60 * 1000;

type Dilim = { bas: number; bit: number; tutar: number; indirimde: boolean };

// Geçmişten uygulanan fiyat dilimleri, zaman sırasıyla. Satırlar eskiden yeniye gelir; son satır
// sonsuza dek sürer. Uzunluğu sıfır olan dilim yazılmaz.
const dilimler = (gecmis: readonly FiyatGecmisiSatiri[], paraBirimi: string): Dilim[] =>
  gecmis.flatMap((satir, sira) => {
    if (satir.paraBirimi !== paraBirimi) return [];
    const bas = satir.zaman.getTime();
    const bit = gecmis[sira + 1]?.zaman.getTime() ?? Number.POSITIVE_INFINITY;
    const parca = (b: number, s: number, tutar: number, indirimde: boolean): Dilim[] =>
      b < s ? [{ bas: b, bit: s, tutar, indirimde }] : [];
    if (satir.indirimliFiyat === null) return parca(bas, bit, satir.satisFiyati, false);
    const ib = Math.min(
      Math.max(bas, satir.indirimBaslangici?.getTime() ?? Number.NEGATIVE_INFINITY),
      bit,
    );
    const is = Math.max(
      Math.min(bit, satir.indirimBitisi?.getTime() ?? Number.POSITIVE_INFINITY),
      ib,
    );
    return [
      ...parca(bas, ib, satir.satisFiyati, false),
      ...parca(ib, is, satir.indirimliFiyat, true),
      ...parca(is, bit, satir.satisFiyati, false),
    ];
  });

export const eskiFiyatiBul = (
  gecmis: readonly FiyatGecmisiSatiri[],
  an: Date,
  paraBirimi: string,
  enDusukFiyat: boolean,
): number | undefined => {
  const zaman = an.getTime();
  // Verilen andan sonra yazılan satırlar yalnız o andan sonraki dilimleri değiştirir: sonucu etkilemez.
  const tumu = dilimler(gecmis, paraBirimi);
  const simdiki = tumu.findIndex((dilim) => dilim.bas <= zaman && zaman < dilim.bit);
  const dilim = tumu[simdiki];
  if (dilim === undefined || !dilim.indirimde) return undefined;
  if (!enDusukFiyat) return gecmis.findLast((satir) => satir.zaman.getTime() <= zaman)?.satisFiyati;
  // İndirimin başladığı an: kesintisiz indirim dilimlerinin ilki.
  let baslangic = simdiki;
  while (baslangic > 0) {
    const onceki = tumu[baslangic - 1];
    const bu = tumu[baslangic];
    if (onceki === undefined || bu === undefined || !onceki.indirimde || onceki.bit !== bu.bas)
      break;
    baslangic--;
  }
  const s = tumu[baslangic]?.bas ?? zaman;
  const pencere = s - eskiFiyatGunu * gunMs;
  const tutarlar = tumu.filter((d) => d.bas < s && d.bit > pencere).map((d) => d.tutar);
  if (tutarlar.length === 0) return undefined;
  const enDusuk = Math.min(...tutarlar);
  return enDusuk > dilim.tutar ? enDusuk : undefined;
};
