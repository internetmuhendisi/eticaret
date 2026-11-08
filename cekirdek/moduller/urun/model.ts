// Ürün ve satılabilir birimi (kart 0076, karar 0062).
//
// Her ürünün en az bir satılabilir birimi olur. Basit ürünün tek birimi vardır; varyantlı üründe her
// birleşim bir birimdir (kart 0085). Fiyat (0080) ve stok (0082) her zaman birime bağlanır, böylece
// varyant için ikinci bir yol yazılmaz. Stok kodu, barkod, ağırlık ve ölçüler birimdedir.
//
// Silme silinme işaretiyle yapılır, satır kalır. Stok kodu ve adres adı yalnız silinmemişler arasında
// tekildir: silinen ürünün kodu ve adı yeniden kullanılabilir.
//
// Aranan alanlar:
// - urunler.adres_adi: vitrinde ürün sayfası bu adla açılır. Silinmemişler arasında tekil (kısmi tekil
//   indeks), indeks aramayı da karşılar.
// - urunler.durum, yayin_zamani: vitrin listeleri (vitrin.ts). Ürün sayısı küçükken ayrı indeks
//   gerekmez; liste ekranları gelince ölçülerek eklenir.
// - urunler.vergi_sinifi_kimligi: silinmiş vergi sınıfındaki ürünleri panel gösterir (karar 0060).
// - urun_birimleri.urun_kimligi: ürünün birimleri okunurken.
// - urun_birimleri.stok_kodu: büyük küçük harf ayrımı olmadan, silinmemişler arasında tekil (kısmi
//   tekil indeks lower(stok_kodu)); panel araması da bu indeksi kullanır.
// - urun_birimleri.barkod: panel araması (panel bölümü). Tekil değildir.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { varsayilanUrunDurumu } from "../../kayitlar/urun.ts";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { vergiSiniflari } from "../vergi/model.ts";

export const urunler = pgTable(
  "urunler",
  {
    kimlik: kimlik(),
    ad: text().notNull(),
    kisa_aciklama: text(),
    uzun_aciklama: text(),
    adres_adi: text().notNull(),
    // cekirdek/kayitlar/urun.ts'deki durumlardan biri.
    durum: text().notNull().default(varsayilanUrunDurumu),
    // Yalnız zamanlanmış üründe dolu: bu andan sonra ürün vitrinde görünür.
    yayin_zamani: zaman(),
    kargo_gerekmez: boolean().notNull().default(false),
    // Stok takibi (kart 0082, karar 0068). Kapalıysa stok düşmez ve artmaz, ürün stoktan bağımsız
    // satılır. Yeni üründe açık (kullanıcı kararı): stok girilene kadar stoğu sıfırdır.
    stok_takibi: boolean().notNull().default(true),
    // Ürünün kendi düşük stok eşiği (kart 0083). Boşsa mağaza ayarı (dusukStokEsigi) geçerlidir.
    dusuk_stok_esigi: integer(),
    en_az_adet: integer().notNull().default(1),
    en_cok_adet: integer(),
    // Boşsa ürün vergisizdir. Silinmiş sınıf da bağlı kalabilir (karar 0060).
    vergi_sinifi_kimligi: uuid().references(() => vergiSiniflari.kimlik, { onDelete: "restrict" }),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("urunler_adres_adi")
      .on(tablo.adres_adi)
      .where(sql`${tablo.silinme_zamani} is null`),
    index("urunler_vergi_sinifi").on(tablo.vergi_sinifi_kimligi),
    check(
      "urunler_durum",
      sql`${tablo.durum} in ('taslak', 'yayinda', 'zamanlanmis', 'gizli', 'arsiv')`,
    ),
    check(
      "urunler_yayin_zamani",
      sql`(${tablo.durum} = 'zamanlanmis') = (${tablo.yayin_zamani} is not null)`,
    ),
    check(
      "urunler_dusuk_stok_esigi",
      sql`${tablo.dusuk_stok_esigi} is null or ${tablo.dusuk_stok_esigi} >= 0`,
    ),
    check(
      "urunler_adet",
      sql`${tablo.en_az_adet} >= 1 and (${tablo.en_cok_adet} is null or ${tablo.en_cok_adet} >= ${tablo.en_az_adet})`,
    ),
  ],
);

export const urunBirimleri = pgTable(
  "urun_birimleri",
  {
    kimlik: kimlik(),
    urun_kimligi: uuid()
      .notNull()
      .references(() => urunler.kimlik, { onDelete: "restrict" }),
    stok_kodu: text(),
    // Saklanan biçim: boşluksuz, tiresiz; ISBN-10'un X'i büyük harf (barkod.ts).
    barkod: text(),
    agirlik_gram: integer(),
    en_mm: integer(),
    boy_mm: integer(),
    yukseklik_mm: integer(),
    // Varyantlı üründe birimlerin sırası; küçük önce.
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    index("urun_birimleri_urun").on(tablo.urun_kimligi),
    uniqueIndex("urun_birimleri_stok_kodu")
      .on(sql`lower(${tablo.stok_kodu})`)
      .where(sql`${tablo.silinme_zamani} is null and ${tablo.stok_kodu} is not null`),
    index("urun_birimleri_barkod").on(tablo.barkod),
    check(
      "urun_birimleri_olcu",
      sql`coalesce(${tablo.agirlik_gram}, 0) >= 0 and coalesce(${tablo.en_mm}, 0) >= 0 and coalesce(${tablo.boy_mm}, 0) >= 0 and coalesce(${tablo.yukseklik_mm}, 0) >= 0`,
    ),
  ],
);

// Ürünün elle seçilen ilgili ürünleri (kart 0079, karar 0065). Sıra tutulur, küçük önce. Ürün kendisine
// bağlanamaz. Bağlanan ürün sonradan silinirse satır kalır, vitrin listesi (ilgili.ts) onu süzer.
//
// Aranan alanlar: urun_kimligi birincil anahtarın ilk alanıdır, bir ürünün ilgilileri oradan okunur.
export const urunIlgilileri = pgTable(
  "urun_ilgilileri",
  {
    urun_kimligi: uuid()
      .notNull()
      .references(() => urunler.kimlik, { onDelete: "restrict" }),
    ilgili_kimligi: uuid()
      .notNull()
      .references(() => urunler.kimlik, { onDelete: "restrict" }),
    sira: integer().notNull(),
    olusturma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    primaryKey({ columns: [tablo.urun_kimligi, tablo.ilgili_kimligi] }),
    check("urun_ilgilileri_kendisi", sql`${tablo.urun_kimligi} <> ${tablo.ilgili_kimligi}`),
  ],
);
