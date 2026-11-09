// Kategori girdisinin ortak şemaları (kart 0077, karar 0063). Panelin ekranı ve uçlar aynı şemayı
// kullanır. Hata iletileri düz cümle değil koddur (kategoriHatalari); metni ekran çözer.
import { z } from "zod";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { kayitMetni } from "../degisiklik-kaydi/deger.ts";

export const kategoriHatalari = [
  "kayda-uygun-degil",
  "adres-adi-bicimi",
  "adres-adi-tekrar",
  // Aynı üst kategorinin altında aynı adla iki kategori (büyük küçük harf ayrımsız).
  "ad-tekrar",
  // Üst kategori yok ya da silinmiş.
  "ust-gecersiz",
  // Kategori kendi altına ya da bir torununun altına taşınamaz.
  "dongu",
  // Silinen kategorinin bir alt kategorisi üste çıkınca orada aynı adlı bir kardeşle karşılaşıyor.
  "silmede-ad-tekrar",
  // Görsel yok, silinmiş, kendisi bir boyut ya da boyutları eksik (kart 0110).
  "gorsel-gecersiz",
] as const;
export type KategoriHatasi = (typeof kategoriHatalari)[number];

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const kategoriHataMetinleri = {
  "kayda-uygun-degil": "yonetim.kategori.hata.kayda-uygun-degil",
  "adres-adi-bicimi": "yonetim.kategori.hata.adres-adi-bicimi",
  "adres-adi-tekrar": "yonetim.kategori.hata.adres-adi-tekrar",
  "ad-tekrar": "yonetim.kategori.hata.ad-tekrar",
  "ust-gecersiz": "yonetim.kategori.hata.ust-gecersiz",
  dongu: "yonetim.kategori.hata.dongu",
  "silmede-ad-tekrar": "yonetim.kategori.hata.silmede-ad-tekrar",
  "gorsel-gecersiz": "yonetim.kategori.hata.gorsel-gecersiz",
} as const satisfies Record<KategoriHatasi, MetinAnahtari>;

const hata = (kod: KategoriHatasi) => kod;

const alanlar = {
  ad: kayitMetni(100),
  adresAdi: z.string().trim().max(adresAdiUzunlugu).regex(adresAdiKalibi, hata("adres-adi-bicimi")),
  aciklama: kayitMetni(10_000),
  // Üst kategorinin kimliği; null kategoriyi en üste koyar.
  ust: z.uuid().nullable(),
  sira: z.int().min(0).max(9999),
  // Görselin dosya kimliği (kart 0110); null görseli kaldırır.
  // Büyük harfle verilen kimlik küçük harfe çevrilir: veritabanı ve vitrin görseli ucu küçük harfle karşılaştırır.
  gorsel: z
    .uuid()
    .transform((kimlik) => kimlik.toLowerCase())
    .nullable(),
};

// Yeni kategori. Verilmeyen adres adı addan üretilir, verilmeyen üst en üsttür, verilmeyen sıra
// kardeşlerin sonudur.
export const kategoriGirdisi = z.strictObject({
  ad: alanlar.ad,
  adresAdi: alanlar.adresAdi.optional(),
  aciklama: alanlar.aciklama.optional(),
  ust: alanlar.ust.default(null),
  sira: alanlar.sira.optional(),
  gorsel: alanlar.gorsel.default(null),
});
export type KategoriGirdisi = z.input<typeof kategoriGirdisi>;

// Değişiklik: yalnız verilen alan değişir. Üstün değişmesi taşımadır. Açıklamayı boşaltmak için null.
export const kategoriDegisikligi = z.strictObject({
  ad: alanlar.ad.optional(),
  adresAdi: alanlar.adresAdi.optional(),
  aciklama: alanlar.aciklama.nullable().optional(),
  ust: alanlar.ust.optional(),
  sira: alanlar.sira.optional(),
  gorsel: alanlar.gorsel.optional(),
});
export type KategoriDegisikligi = z.input<typeof kategoriDegisikligi>;
