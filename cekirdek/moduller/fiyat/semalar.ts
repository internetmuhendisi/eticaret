// Fiyat girdisinin ortak şeması (kart 0080, karar 0066). Panelin ekranı ve uçlar aynı şemayı kullanır.
//
// Girdi birimin fiyatının tam hâlidir: verilmeyen indirim alanı boş sayılır. Böylece indirimi kaldırmak
// yalnız indirimli fiyatı göndermemektir ve geçmişteki her satır fiyatın bütününü taşır.
//
// Tutarlar para biriminin en küçük biriminde (kuruş) tam sayıdır; ekran sitenin para biçimiyle çevirir.
// Zamanlar sitenin saat diliminde yerel olarak yazılır ("2026-11-10T00:00"), servis ana çevirir.
// Alanlar arası kurallar (indirimli fiyat satış fiyatından küçük, bitiş başlangıçtan sonra) serviste
// birleşik girdiye uygulanır.
//
// Hata iletileri düz cümle değil koddur (fiyatHatalari); metni ekran çözer.
import { z } from "zod";
import type { MetinAnahtari } from "../../metinler/metin.ts";

export const fiyatHatalari = [
  "tutar-bicimi",
  "indirim-sifir",
  "indirim-buyuk",
  "indirim-zamani-bicimi",
  "indirim-zamani-gecersiz",
  "indirim-zamani-indirimsiz",
  "indirim-sirasi",
] as const;
export type FiyatHatasi = (typeof fiyatHatalari)[number];

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const fiyatHataMetinleri = {
  "tutar-bicimi": "yonetim.fiyat.hata.tutar-bicimi",
  "indirim-sifir": "yonetim.fiyat.hata.indirim-sifir",
  "indirim-buyuk": "yonetim.fiyat.hata.indirim-buyuk",
  "indirim-zamani-bicimi": "yonetim.fiyat.hata.indirim-zamani-bicimi",
  "indirim-zamani-gecersiz": "yonetim.fiyat.hata.indirim-zamani-gecersiz",
  "indirim-zamani-indirimsiz": "yonetim.fiyat.hata.indirim-zamani-indirimsiz",
  "indirim-sirasi": "yonetim.fiyat.hata.indirim-sirasi",
} as const satisfies Record<FiyatHatasi, MetinAnahtari>;

const hata = (kod: FiyatHatasi) => kod;

// Kuruş olarak tam sayı. z.int() yalnız güvenli tam sayıyı kabul eder; o sınır veritabanının sınırından
// küçüktür.
const tutar = z.int(hata("tutar-bicimi")).min(0, hata("tutar-bicimi"));
const yerelZaman = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, hata("indirim-zamani-bicimi"));

export const fiyatGirdisi = z.strictObject({
  // Sıfır olabilir: ücretsiz ürün (kart 0080, kullanıcı kararı).
  satisFiyati: tutar,
  // Sıfır olamaz: bedava vermek satış fiyatını sıfır yapmaktır.
  // Eksi tutar yalnız biçim hatası alır: aynı alana iki ileti düşmesin (kart 0080 kontrolü).
  indirimliFiyat: z
    .int(hata("tutar-bicimi"))
    .min(0, { error: hata("tutar-bicimi"), abort: true })
    .refine((deger) => deger > 0, hata("indirim-sifir"))
    .nullable()
    .default(null),
  // Boş başlangıç: hemen; boş bitiş: indirim kaldırılana kadar (kart 0080, kullanıcı kararı).
  indirimBaslangici: yerelZaman.nullable().default(null),
  indirimBitisi: yerelZaman.nullable().default(null),
});
export type FiyatGirdisi = z.input<typeof fiyatGirdisi>;

// Alanlar arası kurallar: indirimli fiyat satış fiyatından küçük, zaman yalnız indirimle, bitiş
// başlangıçtan sonra. Zamanlar ana çevrilmiştir. Servis yazmadan önce, başlangıç kataloğunun doğrulaması
// (urun/baslangic-semasi.ts) dosyayı okurken aynı işlevi kullanır.
export const fiyatAlanKurallari = (fiyat: {
  satisFiyati: number;
  indirimliFiyat: number | null;
  indirimBaslangici: Date | null;
  indirimBitisi: Date | null;
}): { alan: string; kod: FiyatHatasi }[] => {
  const sorunlar: { alan: string; kod: FiyatHatasi }[] = [];
  const sorun = (alan: string, kod: FiyatHatasi) => sorunlar.push({ alan, kod });
  const { indirimliFiyat, indirimBaslangici, indirimBitisi } = fiyat;
  if (indirimliFiyat !== null && indirimliFiyat >= fiyat.satisFiyati) {
    sorun("indirimliFiyat", "indirim-buyuk");
  }
  if (indirimliFiyat === null) {
    if (indirimBaslangici !== null) sorun("indirimBaslangici", "indirim-zamani-indirimsiz");
    if (indirimBitisi !== null) sorun("indirimBitisi", "indirim-zamani-indirimsiz");
  }
  if (
    indirimBaslangici !== null &&
    indirimBitisi !== null &&
    indirimBitisi.getTime() <= indirimBaslangici.getTime()
  ) {
    sorun("indirimBitisi", "indirim-sirasi");
  }
  return sorunlar;
};
