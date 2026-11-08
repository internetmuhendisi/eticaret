// Ürün özelliklerinin değer türlerinin tek kaydı (kart 0086, karar 0072, .claude/rules/kayit-dosyalari.md).
// Tür adı veritabanına yazılır: yayınlandıktan sonra ancak eski kayıtları dönüştüren bir veri
// değişikliğiyle değişir. Veritabanındaki denetimler (ozellikler_tur, urun_ozellik_degerleri_deger) bu
// listeyle aynıdır, bunu cekirdek/moduller/ozellik/testler/servis.test.ts denetler.
//
// - metin: serbest metin ("Pamuk ve polyester").
// - sayi: ondalıklı sayı; özelliğin birimi (cm, saat) sitenin verisidir.
// - evet-hayir: iki değerli.
// - liste: özelliğin tanımlı seçeneklerinden biri (kullanıcı kararı: tek seçim).
export const ozellikTurleri = ["metin", "sayi", "evet-hayir", "liste"] as const;
export type OzellikTuru = (typeof ozellikTurleri)[number];

// Her türün değerinin veritabanında durduğu alan (urun_ozellik_degerleri). Bir satırda yalnız türünün
// alanı doludur.
export const ozellikDegerAlanlari = {
  metin: "metin_degeri",
  sayi: "sayi_degeri",
  "evet-hayir": "evet_hayir_degeri",
  liste: "secenek_kimligi",
} as const satisfies Record<OzellikTuru, string>;

// Sınırlar: sitede en çok bu kadar silinmemiş özellik, özellik başına seçenek. Metin değeri en çok bu
// uzunlukta. Sayı en çok bu kadar ondalık basamak taşır ve mutlak değeri bu sınırı aşmaz: 11 tam ve 4
// ondalık basamak, toplam 15 basamak JavaScript sayısında kayıpsız durur (veritabanı alanı
// numeric(16, 4)).
export const ozellikSinirlari = {
  ozellik: 200,
  secenek: 200,
  metin: 500,
  ondalik: 4,
  sayi: 99_999_999_999,
} as const;
