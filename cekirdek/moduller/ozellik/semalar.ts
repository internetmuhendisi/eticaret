// Ürün özelliği girdisinin ortak şemaları (kart 0086, karar 0072). Panelin ekranı ve uçlar aynı şemayı
// kullanır. Hata iletileri düz cümle değil koddur (ozellikHatalari); metni ekran çözer.
//
// Değerin türüne uyup uymadığı ancak özelliğin türü okununca bilinir: ürün girdisi değeri ham alır
// (urunOzellikDegeri), servis türün şemasıyla (degerSemalari) doğrular (degerler.ts).
import { z } from "zod";
import { type OzellikTuru, ozellikSinirlari, ozellikTurleri } from "../../kayitlar/ozellik.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { kayitMetni } from "../degisiklik-kaydi/deger.ts";

export const ozellikHatalari = [
  "kayda-uygun-degil",
  // Aynı adla iki özellik ya da bir özellikte aynı adla iki seçenek (harf ayrımsız).
  "ad-tekrar",
  "secenek-ad-tekrar",
  // Birim yalnız sayı türünde, seçenek yalnız liste türünde olur.
  "birim-yalniz-sayi",
  "secenek-yalniz-liste",
  // Değeri olan ya da seçenekleri olan özelliğin türü değişmez.
  "tur-degisemez",
  "ozellik-siniri",
  "secenek-siniri",
  // Sıralama listesi silinmemiş özelliklerin (ya da seçeneklerin) tamamı değil: eksik, fazla ya da tekrarlı
  // (kart 0261).
  "siralama-gecersiz",
  // Seçenek çıkarmak silmedir: ozellik.sil izni olmayan yönetici çıkaramaz (kart 0261).
  "secenek-silme-yetkisi",
] as const;
export type OzellikHatasi = (typeof ozellikHatalari)[number];

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const ozellikHataMetinleri = {
  "kayda-uygun-degil": "yonetim.ozellik.hata.kayda-uygun-degil",
  "ad-tekrar": "yonetim.ozellik.hata.ad-tekrar",
  "secenek-ad-tekrar": "yonetim.ozellik.hata.secenek-ad-tekrar",
  "birim-yalniz-sayi": "yonetim.ozellik.hata.birim-yalniz-sayi",
  "secenek-yalniz-liste": "yonetim.ozellik.hata.secenek-yalniz-liste",
  "tur-degisemez": "yonetim.ozellik.hata.tur-degisemez",
  "ozellik-siniri": "yonetim.ozellik.hata.ozellik-siniri",
  "secenek-siniri": "yonetim.ozellik.hata.secenek-siniri",
  "siralama-gecersiz": "yonetim.ozellik.hata.siralama-gecersiz",
  "secenek-silme-yetkisi": "yonetim.ozellik.hata.secenek-silme-yetkisi",
} as const satisfies Record<OzellikHatasi, MetinAnahtari>;

const hata = (kod: OzellikHatasi) => kod;

const ad = kayitMetni(100);
const sira = z.int().min(0).max(1_000_000);
const alanlar = {
  ad,
  tur: z.enum(ozellikTurleri),
  birim: kayitMetni(20),
  filtrede: z.boolean(),
  sira,
};

// Alanlar arası kural: birim yalnız sayı türünde olur. Servis birleşmiş kayda uygular (değişiklikte
// yalnız bir alan gelebilir).
export const ozellikAlanKurallari = (kayit: {
  tur: OzellikTuru;
  birim: string | null;
}): { alan: string; kod: OzellikHatasi }[] =>
  kayit.birim !== null && kayit.tur !== "sayi"
    ? [{ alan: "birim", kod: hata("birim-yalniz-sayi") }]
    : [];

// Yeni özellik. Liste türünde seçenekler birlikte verilebilir; sırası listedeki sıradır.
export const ozellikGirdisi = z.strictObject({
  ad: alanlar.ad,
  tur: alanlar.tur,
  birim: alanlar.birim.optional(),
  filtrede: alanlar.filtrede.default(false),
  sira: alanlar.sira.optional(),
  secenekler: z.array(ad).max(ozellikSinirlari.secenek).optional(),
});
export type OzellikGirdisi = z.input<typeof ozellikGirdisi>;

// Değişiklik: yalnız verilen alan değişir; birimi boşaltmak için null.
export const ozellikDegisikligi = z.strictObject({
  ad: alanlar.ad.optional(),
  tur: alanlar.tur.optional(),
  birim: alanlar.birim.nullable().optional(),
  filtrede: alanlar.filtrede.optional(),
  sira: alanlar.sira.optional(),
});
export type OzellikDegisikligi = z.input<typeof ozellikDegisikligi>;

// Panelin özellik formunun tek kaydı (kart 0261): özelliğin alanları ve seçeneklerinin son hâli, sırasıyla. Kimliği
// olan seçenek var olandır (adı değişebilir), kimliği olmayan yenidir; listede olmayan var olan seçenek silinir.
// Liste türünde olmayan özellikte liste boştur.
export const ozellikKaydi = z.strictObject({
  ad: alanlar.ad,
  tur: alanlar.tur,
  birim: alanlar.birim.nullable(),
  filtrede: alanlar.filtrede,
  secenekler: z
    .array(z.strictObject({ kimlik: kimlikSemasi.optional(), ad }))
    .max(ozellikSinirlari.secenek),
});
export type OzellikKaydiGirdisi = z.input<typeof ozellikKaydi>;

export const ozellikSecenegiGirdisi = z.strictObject({ ad, sira: sira.optional() });
export type OzellikSecenegiGirdisi = z.input<typeof ozellikSecenegiGirdisi>;

export const ozellikSecenegiDegisikligi = z.strictObject({
  ad: ad.optional(),
  sira: sira.optional(),
});
export type OzellikSecenegiDegisikligi = z.input<typeof ozellikSecenegiDegisikligi>;

// Ondalık basamak sınırı: sayı, sınır kadar basamağa yuvarlanınca değişmiyorsa uygundur. Metne bakmak
// 1e-7 gibi üstel yazılışları kaçırırdı.
const ondalikUygun = (sayi: number) => Number(sayi.toFixed(ozellikSinirlari.ondalik)) === sayi;

// Her türün değer şeması (cekirdek/kayitlar/ozellik.ts). Liste değeri seçeneğin kimliğidir; seçeneğin
// o özelliğe ait ve silinmemiş olduğunu servis veritabanında arar. Kimlik küçük harfe çevrilir:
// veritabanı da öyle döndürür, aynı değer değişmiş görünmez.
export const degerSemalari = {
  metin: kayitMetni(ozellikSinirlari.metin),
  sayi: z.number().min(-ozellikSinirlari.sayi).max(ozellikSinirlari.sayi).refine(ondalikUygun),
  "evet-hayir": z.boolean(),
  liste: kimlikSemasi,
} as const satisfies Record<OzellikTuru, z.ZodType>;

export type OzellikDegeri = string | number | boolean;

// Ürün girdisindeki bir özellik değeri: türü henüz bilinmez, ham değer servis tarafından türün
// şemasıyla doğrulanır.
export const urunOzellikDegeri = z.strictObject({
  ozellik: kimlikSemasi,
  // NaN gibi hiçbir türe uymayan değer de türüne uymayan değerdir.
  deger: z.union([z.string(), z.number(), z.boolean()], { error: "ozellik-deger-gecersiz" }),
});
export type UrunOzellikDegeri = { ozellik: string; deger: OzellikDegeri };

// Uçların girdileri (kart 0261). Özelliğin alanları servis şemasıyla doğrulanır (ozellikGirdisi, ozellikKaydi):
// hata alanın adıyla ve özelliğin koduyla döner, uç yalnız zarfı denetler.
const ozellikNesnesi = z.record(z.string(), z.unknown());
export const ozellikEklemeSemasi = z.strictObject({ ozellik: ozellikNesnesi });
export const ozellikKaydiSemasi = z.strictObject({ kimlik: kimlikSemasi, ozellik: ozellikNesnesi });
export const ozellikSilmeSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const ozellikSiralamaSemasi = z.strictObject({
  kimlikler: z.array(kimlikSemasi).max(ozellikSinirlari.ozellik),
});
