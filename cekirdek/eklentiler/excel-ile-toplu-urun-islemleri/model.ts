// Excel ile toplu ürün işlemleri (kart 0315, plan planlar/excel-ile-toplu-urun-islemleri.md). Üç tablo:
// - excel_disa_aktarmalari: dışa aktarılan dosya ve birimlerin indirildiği andaki değerleri. Yüklenen dosyanın hücresi
//   o andaki değere eşitse alan değişmez (kullanıcı kararı). Dosya ve değerler saklama süresi (excelAyari.saklamaGun)
//   dolunca kayıtla birlikte silinir.
// - excel_ice_aktarmalari: yüklenen dosya ve işin durumu. Dosya iş bitince ya da vazgeçilince boşalır.
// - excel_ice_aktarma_satirlari: dosyanın her satırının denetim sonucu ve uygulanıp uygulanmadığı. Uygulama ürün
//   başına bir işlemdir; ürünün satırları aynı işlemde "uygulandı" işaretlenir: yarıda kalan iş kaldığı üründen
//   sürer, aynı satır iki kez yazılmaz.
//
// Dosyalar bu tablolarda durur, dosya servisinin görsel ve belge yollarına girmez: geçicidir ve yalnız sahibi indirir.
// Değişiklik kaydına bu tablolar girmez; ürünlerde yapılan her değişiklik servislerin kendi kaydına girer.
//
// Aranan alanlar:
// - yonetici_kimligi, olusturma_zamani: yöneticinin son dışa aktarması ve içe aktarması (indeksli).
// - olusturma_zamani: saklama süresi dolanlar (aynı indeksin ikinci alanı değil; ayrı indeks).
// - is_kimligi, satir_no: işin satırları sırasıyla (tekil indeks); uygulanmamış satırlar.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { yoneticiler } from "../../moduller/ekip/model.ts";
import { kimlik, zaman } from "../../veritabani/turler.ts";

// Dosyanın baytları (geçici; en çok excelAyari.enCokBayt).
const bayt = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const excelDisaAktarmalari = pgTable(
  "excel_disa_aktarmalari",
  {
    kimlik: kimlik(),
    yonetici_kimligi: uuid()
      .notNull()
      .references(() => yoneticiler.kimlik, { onDelete: "cascade" }),
    durum: text().notNull(),
    // Listenin süzgeçleri (ürün listesinin girdisi) ya da null: bütün ürünler.
    kapsam: jsonb(),
    // Dosyaya fiyat ve stok sütunlarının yazılıp yazılmadığı (hazırlayanın izni).
    fiyat_sutunlari: boolean().notNull(),
    stok_sutunu: boolean().notNull(),
    // Hazırlanırken ilerleme: işlenen ürün sayısı ve kalan ürünler (partiler).
    urun_sayisi: integer().notNull().default(0),
    satir_sayisi: integer().notNull().default(0),
    // Birimlerin ve ürünlerin indirildiği andaki değerleri (dosya-duzeni.ts, IndirilenDegerler).
    degerler: jsonb().notNull().default({}),
    dosya: bayt(),
    olusturma_zamani: zaman().notNull().defaultNow(),
    bitis_zamani: zaman(),
  },
  (tablo) => [
    check(
      "excel_disa_aktarmalari_durum",
      sql`${tablo.durum} in ('hazirlaniyor', 'hazir', 'hatali')`,
    ),
    check(
      "excel_disa_aktarmalari_dosya",
      sql`(${tablo.durum} = 'hazir') = (${tablo.dosya} is not null)`,
    ),
    index("excel_disa_aktarmalari_yonetici").on(tablo.yonetici_kimligi, tablo.olusturma_zamani),
    index("excel_disa_aktarmalari_zaman").on(tablo.olusturma_zamani),
  ],
);

export const excelIceAktarmalari = pgTable(
  "excel_ice_aktarmalari",
  {
    kimlik: kimlik(),
    yonetici_kimligi: uuid()
      .notNull()
      .references(() => yoneticiler.kimlik, { onDelete: "cascade" }),
    durum: text().notNull(),
    // Yüklenen dosyanın adı (tarayıcının verdiği; yalnız gösterilir) ve baytları.
    dosya_adi: text().notNull(),
    dosya_boyutu: integer().notNull(),
    dosya: bayt(),
    // Dosyanın "Bilgi" sayfasındaki dışa aktarmanın kimliği (varsa ve süresi dolmadıysa).
    disa_aktarma_kimligi: uuid(),
    // Dosya okunamadıysa nedeninin kodu (kayitlar/eklentiler.ts değil, eklentinin hata kodları).
    neden: text(),
    satir_sayisi: integer().notNull().default(0),
    // Yükleyenin izinleri, yükleme anında: fiyat ve stok değiştiren satırlar bunlarla denetlenir; uygulamada yeniden
    // sorulur.
    fiyat_izni: boolean().notNull(),
    stok_izni: boolean().notNull(),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    bitis_zamani: zaman(),
  },
  (tablo) => [
    check(
      "excel_ice_aktarmalari_durum",
      sql`${tablo.durum} in ('denetleniyor', 'onizleme', 'uygulaniyor', 'bitti', 'vazgecildi', 'okunamadi')`,
    ),
    index("excel_ice_aktarmalari_yonetici").on(tablo.yonetici_kimligi, tablo.olusturma_zamani),
    index("excel_ice_aktarmalari_zaman").on(tablo.olusturma_zamani),
  ],
);

export const excelIceAktarmaSatirlari = pgTable(
  "excel_ice_aktarma_satirlari",
  {
    kimlik: kimlik(),
    is_kimligi: uuid()
      .notNull()
      .references(() => excelIceAktarmalari.kimlik, { onDelete: "cascade" }),
    // Dosyadaki satır numarası (başlık 1. satırdır).
    satir_no: integer().notNull(),
    // Satırın ürün grubu: ürün kodu ya da kodsuz satırda satırın kendisi. Uygulama grup başına bir işlemdir.
    grup: text().notNull(),
    sonuc: text().notNull(),
    urun_kimligi: uuid(),
    birim_kimligi: uuid(),
    // Ekranda satırın adı ("Tişört · Renk: Beyaz; Beden: L").
    ad: text().notNull(),
    // Değişecek alanlar: [{ alan, simdi, yeni }] (gösterim yazılarıyla) ve hatalar: [{ kod, alan?, deger? }].
    degisiklikler: jsonb().notNull().default([]),
    hatalar: jsonb().notNull().default([]),
    // Önizlemede okunan şimdiki değerler: uygulamada değişmişse satır uygulanmaz.
    gorulen: jsonb(),
    // Satırın yazılacak hâli (denetim.ts, YazilacakSatir): uygulama yeniden okumaz.
    yazilacak: jsonb(),
    uygulandi: boolean().notNull().default(false),
    // Uygulanamadıysa nedeninin kodu.
    uygulama_hatasi: text(),
  },
  (tablo) => [
    check(
      "excel_ice_aktarma_satirlari_sonuc",
      sql`${tablo.sonuc} in ('ekle', 'degistir', 'ayni', 'hatali')`,
    ),
    uniqueIndex("excel_ice_aktarma_satirlari_sira").on(tablo.is_kimligi, tablo.satir_no),
  ],
);
