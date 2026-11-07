// Kategoriler ve ürünlerin kategorileri (kart 0077, karar 0063).
//
// Kategoriler iç içedir: üst kategorisi boş olan en üsttedir. Bir kategori kendi altına ya da bir
// torununun altına taşınamaz; servis bunu kilit altında denetler, veritabanındaki tetikleyici
// (kategoriler_dongu, değişiklik 0015) doğrudan yazılara karşı ikinci ağdır.
//
// Silme silinme işaretiyle yapılır, satır kalır. Silinen kategorinin alt kategorileri onun üstüne
// çıkar, ürün bağlantıları kalkar (kullanıcı kararı, servis.ts). Adres adı ve kardeşler arasında ad
// yalnız silinmemişler arasında tekildir.
//
// Aranan alanlar:
// - kategoriler.adres_adi: vitrinde kategori sayfası bu adla açılır. Silinmemişler arasında tekil
//   (kısmi tekil indeks), indeks aramayı da karşılar.
// - kategoriler.ust_kimligi: bir kategorinin altları ve alt ağacı (özyinelemeli sorgu) okunurken.
//   Kardeş ad tekilliği (ust_kimligi, lower(ad)) kısmi tekil indeksiyle korunur.
// - urun_kategorileri.kategori_kimligi: bir kategorinin ürünleri. urun_kimligi birincil anahtarın
//   ilk alanıdır: bir ürünün kategorileri birincil anahtardan okunur.
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { urunler } from "../urun/model.ts";

export const kategoriler = pgTable(
  "kategoriler",
  {
    kimlik: kimlik(),
    ad: text().notNull(),
    adres_adi: text().notNull(),
    aciklama: text(),
    // Boşsa kategori en üsttedir.
    ust_kimligi: uuid().references((): AnyPgColumn => kategoriler.kimlik, {
      onDelete: "restrict",
    }),
    // Kardeşler arasında sıra; küçük önce.
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("kategoriler_adres_adi")
      .on(tablo.adres_adi)
      .where(sql`${tablo.silinme_zamani} is null`),
    // En üstteki kategorilerin üstü boştur; boş değerler tekil indekste eşit sayılmadığı için sabit
    // bir kimlikle karşılaştırılır.
    uniqueIndex("kategoriler_kardes_adi")
      .on(
        sql`coalesce(${tablo.ust_kimligi}, '00000000-0000-0000-0000-000000000000'::uuid)`,
        sql`lower(${tablo.ad})`,
      )
      .where(sql`${tablo.silinme_zamani} is null`),
    index("kategoriler_ust").on(tablo.ust_kimligi),
    check("kategoriler_kendi_ustu", sql`${tablo.ust_kimligi} <> ${tablo.kimlik}`),
  ],
);

export const urunKategorileri = pgTable(
  "urun_kategorileri",
  {
    urun_kimligi: uuid()
      .notNull()
      .references(() => urunler.kimlik, { onDelete: "restrict" }),
    kategori_kimligi: uuid()
      .notNull()
      .references(() => kategoriler.kimlik, { onDelete: "restrict" }),
    olusturma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    primaryKey({ columns: [tablo.urun_kimligi, tablo.kategori_kimligi] }),
    index("urun_kategorileri_kategori").on(tablo.kategori_kimligi),
  ],
);
