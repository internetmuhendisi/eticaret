// Ürün özellikleri (kart 0086, karar 0072): sitenin kendi tanımladığı ek alanlar (kumaş, malzeme,
// yazar) ve ürünlerin bu alanlardaki değerleri. Özellik adları ve liste seçenekleri sitenin verisidir.
//
// - Özellik: ad, değer türü (cekirdek/kayitlar/ozellik.ts), sayıda birim, filtrede kullanılıp
//   kullanılmayacağı, sıra. Ad büyük küçük harf ve noktalı noktasız i ayrımsız (ad anahtarı)
//   silinmemişler arasında sitede tekildir.
// - Liste türündeki özelliğin seçenekleri ayrı tablodadır; ad özelliğin silinmemiş seçenekleri
//   arasında tekildir.
// - Ürünün bir özellikte en çok bir değeri olur. Satır değerin türünü de taşır: (özellik, tür) çifti
//   özelliğe bağlıdır, bu yüzden değeri olan özelliğin türü veritabanında da değişemez; satırda yalnız
//   türünün alanı doludur. Liste değerinin seçeneği o özelliğin seçeneği olmak zorundadır.
// - Silme işaretle yapılır. Silinen özelliğin ya da seçeneğin değerleri ürünlerden kalkar (kullanıcı
//   kararı), kalkan ürünler silme kaydında listelenir.
//
// Aranan alanlar:
// - ad anahtarı: ad tekilliği (kısmi tekil indeks).
// - ozellik_secenekleri.ozellik_kimligi: özelliğin seçenekleri; tekil ad indeksinin ilk alanıdır.
// - urun_ozellik_degerleri.urun_kimligi: ürünün değerleri; birincil anahtarın ilk alanıdır.
// - urun_ozellik_degerleri.ozellik_kimligi ile değer: bir değere sahip ürünler (filtrenin temeli).
//   Türe göre dört indeks: seçenek, sayı, evet/hayır ve metnin ad anahtarı.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import { kimlik, ondalikSayi, zaman } from "../../veritabani/turler.ts";
import { urunler } from "../urun/model.ts";

export const ozellikler = pgTable(
  "ozellikler",
  {
    kimlik: kimlik(),
    ad: text().notNull(),
    // cekirdek/kayitlar/ozellik.ts'deki türlerden biri.
    tur: text().notNull(),
    // Yalnız sayı türünde: "cm", "saat". Sitenin verisidir.
    birim: text(),
    // Vitrin filtresinde kullanılır mı (filtre vitrin bölümüyle gelir).
    filtrede: boolean().notNull().default(false),
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("ozellikler_adi")
      .on(adAnahtariSql(tablo.ad))
      .where(sql`${tablo.silinme_zamani} is null`),
    // Değer satırının (özellik, tür) bağı bu çifte gider.
    unique("ozellikler_kimlik_tur").on(tablo.kimlik, tablo.tur),
    check("ozellikler_tur", sql`${tablo.tur} in ('metin', 'sayi', 'evet-hayir', 'liste')`),
    check("ozellikler_birim", sql`${tablo.birim} is null or ${tablo.tur} = 'sayi'`),
  ],
);

export const ozellikSecenekleri = pgTable(
  "ozellik_secenekleri",
  {
    kimlik: kimlik(),
    ozellik_kimligi: uuid()
      .notNull()
      .references(() => ozellikler.kimlik, { onDelete: "restrict" }),
    ad: text().notNull(),
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("ozellik_secenekleri_ad")
      .on(tablo.ozellik_kimligi, adAnahtariSql(tablo.ad))
      .where(sql`${tablo.silinme_zamani} is null`),
    // Değer satırının (seçenek, özellik) bağı bu çifte gider: seçenek başka özelliğin olamaz.
    unique("ozellik_secenekleri_kimlik_ozellik").on(tablo.kimlik, tablo.ozellik_kimligi),
  ],
);

export const urunOzellikDegerleri = pgTable(
  "urun_ozellik_degerleri",
  {
    urun_kimligi: uuid()
      .notNull()
      .references(() => urunler.kimlik, { onDelete: "restrict" }),
    ozellik_kimligi: uuid().notNull(),
    // Özelliğin türü; özellikle aynı olmak zorundadır (bağ).
    tur: text().notNull(),
    metin_degeri: text(),
    sayi_degeri: ondalikSayi(),
    evet_hayir_degeri: boolean(),
    secenek_kimligi: uuid(),
    olusturma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    primaryKey({ columns: [tablo.urun_kimligi, tablo.ozellik_kimligi] }),
    foreignKey({
      name: "urun_ozellik_degerleri_ozellik",
      columns: [tablo.ozellik_kimligi, tablo.tur],
      foreignColumns: [ozellikler.kimlik, ozellikler.tur],
    }).onDelete("restrict"),
    foreignKey({
      name: "urun_ozellik_degerleri_secenek",
      columns: [tablo.secenek_kimligi, tablo.ozellik_kimligi],
      foreignColumns: [ozellikSecenekleri.kimlik, ozellikSecenekleri.ozellik_kimligi],
    }).onDelete("restrict"),
    // Satırda yalnız türünün alanı dolu (cekirdek/kayitlar/ozellik.ts, ozellikDegerAlanlari).
    check(
      "urun_ozellik_degerleri_deger",
      sql`(${tablo.tur} = 'metin') = (${tablo.metin_degeri} is not null)
        and (${tablo.tur} = 'sayi') = (${tablo.sayi_degeri} is not null)
        and (${tablo.tur} = 'evet-hayir') = (${tablo.evet_hayir_degeri} is not null)
        and (${tablo.tur} = 'liste') = (${tablo.secenek_kimligi} is not null)`,
    ),
    index("urun_ozellik_degerleri_secenek").on(tablo.ozellik_kimligi, tablo.secenek_kimligi),
    index("urun_ozellik_degerleri_sayi").on(tablo.ozellik_kimligi, tablo.sayi_degeri),
    index("urun_ozellik_degerleri_evet_hayir").on(tablo.ozellik_kimligi, tablo.evet_hayir_degeri),
    index("urun_ozellik_degerleri_metin").on(
      tablo.ozellik_kimligi,
      adAnahtariSql(tablo.metin_degeri),
    ),
  ],
);
