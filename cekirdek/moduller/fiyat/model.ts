// Satılabilir birimin fiyatı ve fiyat geçmişi (kart 0080, karar 0066).
//
// Fiyat ürüne değil satılabilir birime bağlıdır (karar 0062): basit ürünün tek birimi, varyantlı ürünün
// her birleşimi (kart 0085) aynı tabloyu kullanır. Tutarlar para biriminin en küçük biriminde (kuruş)
// tam sayıdır, para birimi her satırda yazılıdır (yazıldığı andaki site ayarı).
//
// birim_fiyatlari birimin bugünkü fiyatıdır, her birimde en çok bir satır. fiyat_gecmisi her
// değişikliğin tam hâlini zamanıyla tutar; satırları güncellenemez ve silinemez (tetikleyici, değişiklik
// dosyası 0018). Son 30 günün en düşük fiyatı (kart 0081) bu geçmişten hesaplanır.
//
// Aranan alanlar:
// - birim_fiyatlari.birim_kimligi: birincil anahtar, birimin fiyatı buradan okunur.
// - fiyat_gecmisi.birim_kimligi ve zaman: bir birimin dönem içindeki geçmişi, indeksli. Panelin fiyat geçmişi
//   birkaç birimi (varyantlı ürünün birleşimleri) aynı indeksle okur.
import { sql } from "drizzle-orm";
import { type AnyPgColumn, check, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kimlik, tutar, zaman } from "../../veritabani/turler.ts";
import { urunBirimleri } from "../urun/model.ts";

// İki tablonun ortak kuralları: satış fiyatı sıfır olabilir (ücretsiz ürün), indirimli fiyat sıfırdan
// büyük ve satış fiyatından küçüktür, indirim zamanları yalnız indirimli fiyatla birlikte bulunur, bitiş
// başlangıçtan sonradır. Serviste de denetlenir; bu, başka yoldan gelen yazmaya karşı ikinci ağdır.
type FiyatAlanlari = Record<
  "satis_fiyati" | "indirimli_fiyat" | "indirim_baslangici" | "indirim_bitisi" | "para_birimi",
  AnyPgColumn
>;
const fiyatKurallari = (onEk: string, t: FiyatAlanlari) => [
  check(`${onEk}_satis`, sql`${t.satis_fiyati} >= 0`),
  check(
    `${onEk}_indirimli`,
    sql`${t.indirimli_fiyat} is null or (${t.indirimli_fiyat} > 0 and ${t.indirimli_fiyat} < ${t.satis_fiyati})`,
  ),
  check(
    `${onEk}_indirim_zamani`,
    sql`${t.indirimli_fiyat} is not null or (${t.indirim_baslangici} is null and ${t.indirim_bitisi} is null)`,
  ),
  check(
    `${onEk}_indirim_sirasi`,
    sql`${t.indirim_baslangici} is null or ${t.indirim_bitisi} is null or ${t.indirim_bitisi} > ${t.indirim_baslangici}`,
  ),
  check(`${onEk}_para_birimi`, sql`${t.para_birimi} ~ '^[A-Z]{3}$'`),
];

export const birimFiyatlari = pgTable(
  "birim_fiyatlari",
  {
    birim_kimligi: uuid()
      .primaryKey()
      .references(() => urunBirimleri.kimlik, { onDelete: "restrict" }),
    satis_fiyati: tutar().notNull(),
    indirimli_fiyat: tutar(),
    // İndirimin başladığı an (dahil) ve bittiği an (hariç). Boş başlangıç: hemen; boş bitiş: süresiz.
    indirim_baslangici: zaman(),
    indirim_bitisi: zaman(),
    para_birimi: text().notNull(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => fiyatKurallari("birim_fiyatlari", tablo),
);

export const fiyatGecmisi = pgTable(
  "fiyat_gecmisi",
  {
    kimlik: kimlik(),
    birim_kimligi: uuid()
      .notNull()
      .references(() => urunBirimleri.kimlik, { onDelete: "restrict" }),
    // Satırın yazıldığı an. Servis kilit alındıktan sonraki saati yazar (clock_timestamp): geçmişin
    // sırası yazılma sırasıdır.
    zaman: zaman().notNull().defaultNow(),
    satis_fiyati: tutar().notNull(),
    indirimli_fiyat: tutar(),
    indirim_baslangici: zaman(),
    indirim_bitisi: zaman(),
    para_birimi: text().notNull(),
    // Değişikliği yapan (kart 0265; stok geçmişiyle aynı biçim): yönetici, müşteri ya da sahip kimliğiyle,
    // sistem işlemi adıyla. Bu sütunlardan önce yazılmış satırlarda boştur.
    kim_turu: text(),
    kim_kimligi: uuid(),
    kim_adi: text(),
  },
  (tablo) => [
    index("fiyat_gecmisi_birim_zaman").on(tablo.birim_kimligi, tablo.zaman),
    ...fiyatKurallari("fiyat_gecmisi", tablo),
    check(
      "fiyat_gecmisi_kim",
      sql`(${tablo.kim_turu} is null and ${tablo.kim_kimligi} is null and ${tablo.kim_adi} is null) or (${tablo.kim_turu} = 'sistem' and length(${tablo.kim_adi}) > 0 and ${tablo.kim_kimligi} is null) or (${tablo.kim_turu} in ('yonetici', 'musteri', 'sahip') and ${tablo.kim_kimligi} is not null and ${tablo.kim_adi} is null)`,
    ),
  ],
);
