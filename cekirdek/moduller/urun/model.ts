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
import { varsayilanUrunDurumu } from "../../kayitlar/urun.ts";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { dosyalar } from "../dosya/model.ts";
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

// Ürünün galerisi (kart 0087, karar 0073): sıralı görseller ve video bağlantıları. Türler
// cekirdek/kayitlar/gorsel.ts kaydındadır. Görsel, dosya deposundaki boyutları üretilmiş bir dosyadır
// (dosya_kimligi); video, bir video sitesinin adı ve videonun kimliğidir, bağlantının kendisi saklanmaz.
// Her öğenin alternatif metni vardır. Sırası küçük olan önce gelir; ana görsel, silinmemiş görsel
// türündeki ilk öğedir.
//
// Silme işaretle yapılır, satır ve dosya kalır: geçmiş siparişler ürünün o andaki görseline bağlı
// kalabilir. Silinen öğeyi seçmiş birleşimin görseli aynı işlemde boşaltılır; veritabanındaki
// tetikleyici bir birimin seçtiği öğenin silinmesini ve birimin silinmiş ya da video öğesini seçmesini
// reddeder.
//
// Aranan alanlar:
// - urun_kimligi: ürünün galerisi (urun_galerisi_urun indeksi, sırayla okunur). Birden çok ürünün ana
//   görseli de buradan tek sorguyla gelir.
// - (urun_kimligi, dosya_kimligi): aynı görsel bir ürünün silinmemiş galerisinde bir kez (kısmi tekil
//   indeks).
// - (kimlik, urun_kimligi): birimin görseli bu ikiliye bağlanır, başka ürünün öğesi seçilemez.
export const urunGalerisi = pgTable(
  "urun_galerisi",
  {
    kimlik: kimlik(),
    urun_kimligi: uuid()
      .notNull()
      .references(() => urunler.kimlik, { onDelete: "restrict" }),
    // cekirdek/kayitlar/gorsel.ts'deki türlerden biri.
    tur: text().notNull(),
    dosya_kimligi: uuid().references(() => dosyalar.kimlik, { onDelete: "restrict" }),
    // cekirdek/kayitlar/video-siteleri.ts'deki sitelerden biri ve videonun o sitedeki kimliği.
    video_sitesi: text(),
    video_kimligi: text(),
    alternatif_metin: text().notNull(),
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    index("urun_galerisi_urun").on(tablo.urun_kimligi, tablo.sira),
    uniqueIndex("urun_galerisi_dosya")
      .on(tablo.urun_kimligi, tablo.dosya_kimligi)
      .where(sql`${tablo.silinme_zamani} is null and ${tablo.dosya_kimligi} is not null`),
    unique("urun_galerisi_kimlik_urun").on(tablo.kimlik, tablo.urun_kimligi),
    check("urun_galerisi_tur", sql`${tablo.tur} in ('gorsel', 'video')`),
    check(
      "urun_galerisi_video",
      sql`(${tablo.tur} = 'gorsel') = (${tablo.dosya_kimligi} is not null)
        and (${tablo.tur} = 'video') = (${tablo.video_sitesi} is not null and ${tablo.video_kimligi} is not null)
        and (${tablo.video_sitesi} is null or ${tablo.video_sitesi} in ('youtube', 'vimeo'))`,
    ),
    check("urun_galerisi_alternatif_metin", sql`length(trim(${tablo.alternatif_metin})) > 0`),
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
    // Birleşimin anahtarı (kart 0085, karar 0071): birimin seçenek değerlerinin kimlikleri sıralı ve
    // virgülle. Basit ürünün birimi boş anahtar taşır. Yalnız varyant.ts yazar, birimin değerleriyle
    // (urun_birimi_degerleri) aynı işlemde. Silinmemiş birimler arasında ürün başına tekildir: aynı
    // birleşim iki kez, basit ürün iki birimle olamaz.
    birlesim: text().notNull().default(""),
    // Birleşimin görseli (kart 0087, karar 0073): kendi ürününün galerisinden bir görsel öğesi
    // (urun_galerisi.kimlik, dosya değil). Boşsa ürünün ana görseli gösterilir. Basit ürünün biriminde
    // boştur. Ürün ve öğe ikilisine bağlıdır: başka ürünün öğesi seçilemez.
    gorsel_kimligi: uuid(),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    index("urun_birimleri_urun").on(tablo.urun_kimligi),
    // Silinen galeri öğesini seçmiş birimler (tetikleyici ve galeri.ts).
    index("urun_birimleri_gorsel_kimligi").on(tablo.gorsel_kimligi),
    foreignKey({
      name: "urun_birimleri_gorsel",
      columns: [tablo.gorsel_kimligi, tablo.urun_kimligi],
      foreignColumns: [urunGalerisi.kimlik, urunGalerisi.urun_kimligi],
    }).onDelete("restrict"),
    uniqueIndex("urun_birimleri_stok_kodu")
      .on(sql`lower(${tablo.stok_kodu})`)
      .where(sql`${tablo.silinme_zamani} is null and ${tablo.stok_kodu} is not null`),
    index("urun_birimleri_barkod").on(tablo.barkod),
    uniqueIndex("urun_birimleri_birlesim")
      .on(tablo.urun_kimligi, tablo.birlesim)
      .where(sql`${tablo.silinme_zamani} is null`),
    check(
      "urun_birimleri_olcu",
      sql`coalesce(${tablo.agirlik_gram}, 0) >= 0 and coalesce(${tablo.en_mm}, 0) >= 0 and coalesce(${tablo.boy_mm}, 0) >= 0 and coalesce(${tablo.yukseklik_mm}, 0) >= 0`,
    ),
  ],
);

// Varyantlı ürünün seçenekleri ve değerleri (kart 0085, karar 0071). Adlar sitenin verisidir ("Beden",
// "M"). Silme işaretle yapılır: değeri silinen birleşim de silinmiş işaretlenir, satırlar kalır, eski
// siparişler bozulmaz. Ad, büyük küçük harf ve noktalı noktasız i ayrımı olmadan (ad anahtarı) ürünün
// silinmemiş seçenekleri, seçeneğin silinmemiş değerleri arasında tekildir.
//
// Aranan alanlar: urun_secenekleri.urun_kimligi (ürünün seçenekleri), urun_secenek_degerleri
// .secenek_kimligi (seçeneğin değerleri); ikisi de tekil ad indeksinin ilk alanıdır.
export const urunSecenekleri = pgTable(
  "urun_secenekleri",
  {
    kimlik: kimlik(),
    urun_kimligi: uuid()
      .notNull()
      .references(() => urunler.kimlik, { onDelete: "restrict" }),
    ad: text().notNull(),
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("urun_secenekleri_ad")
      .on(tablo.urun_kimligi, adAnahtariSql(tablo.ad))
      .where(sql`${tablo.silinme_zamani} is null`),
  ],
);

export const urunSecenekDegerleri = pgTable(
  "urun_secenek_degerleri",
  {
    kimlik: kimlik(),
    secenek_kimligi: uuid()
      .notNull()
      .references(() => urunSecenekleri.kimlik, { onDelete: "restrict" }),
    ad: text().notNull(),
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("urun_secenek_degerleri_ad")
      .on(tablo.secenek_kimligi, adAnahtariSql(tablo.ad))
      .where(sql`${tablo.silinme_zamani} is null`),
  ],
);

// Birimin hangi değerlerden oluştuğu: her seçenekten bir değer. Birimin birleşim anahtarı bu satırlardan
// kurulur (varyant.ts). Aranan alan: deger_kimligi (değeri silinen birleşimler).
export const urunBirimiDegerleri = pgTable(
  "urun_birimi_degerleri",
  {
    birim_kimligi: uuid()
      .notNull()
      .references(() => urunBirimleri.kimlik, { onDelete: "restrict" }),
    deger_kimligi: uuid()
      .notNull()
      .references(() => urunSecenekDegerleri.kimlik, { onDelete: "restrict" }),
  },
  (tablo) => [
    primaryKey({ columns: [tablo.birim_kimligi, tablo.deger_kimligi] }),
    index("urun_birimi_degerleri_deger").on(tablo.deger_kimligi),
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
