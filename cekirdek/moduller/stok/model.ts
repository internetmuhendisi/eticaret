// Satılabilir birimin stoğu ve stok geçmişi (kart 0082, karar 0068).
//
// Stok ürüne değil satılabilir birime bağlıdır (karar 0062): basit ürünün tek birimi, varyantlı ürünün
// her birleşimi (kart 0085) aynı tabloyu kullanır. Tek depo vardır. Stok takibinin açık olup olmadığı
// üründedir (urunler.stok_takibi).
//
// birim_stoklari birimin bugünkü miktarıdır, her birimde en çok bir satır; satırı olmayan birimin stoğu
// sıfırdır. Miktar sıfırın altına inmez. stok_gecmisi her değişikliği kimin yaptığı, sebebi, önceki ve
// sonraki miktarıyla tutar; satırları güncellenemez ve silinemez (tetikleyici, değişiklik dosyası 0019).
//
// Aranan alanlar:
// - birim_stoklari.birim_kimligi: birincil anahtar, birimin stoğu buradan okunur ve kilitlenir.
// - stok_gecmisi.birim_kimligi ve zaman: bir birimin geçmişi, en yeni önce, indeksli.
// - stok_gecmisi.kaynak_kimligi: bir siparişin ya da iadenin stok hareketleri (sipariş bölümü), indeksli.
import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { urunBirimleri } from "../urun/model.ts";

export const birimStoklari = pgTable(
  "birim_stoklari",
  {
    birim_kimligi: uuid()
      .primaryKey()
      .references(() => urunBirimleri.kimlik, { onDelete: "restrict" }),
    miktar: integer().notNull().default(0),
    guncellenme_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [check("birim_stoklari_miktar", sql`${tablo.miktar} >= 0`)],
);

export const stokGecmisi = pgTable(
  "stok_gecmisi",
  {
    kimlik: kimlik(),
    birim_kimligi: uuid()
      .notNull()
      .references(() => urunBirimleri.kimlik, { onDelete: "restrict" }),
    // Satırın yazıldığı an: kilit alındıktan sonraki saat (clock_timestamp), sıra yazılma sırasıdır.
    zaman: zaman().notNull().defaultNow(),
    onceki_miktar: integer().notNull(),
    sonraki_miktar: integer().notNull(),
    // cekirdek/kayitlar/stok.ts'deki sebeplerden biri.
    sebep: text().notNull(),
    // Elle düzeltmenin notu.
    not: text(),
    // Hareketi doğuran siparişin ya da iadenin kimliği (sipariş bölümü). Bağ yoktur: sipariş tablosu
    // sonra gelir.
    kaynak_kimligi: uuid(),
    // Kim: değişiklik kaydıyla aynı biçim (hesapsa türü ve kimliği, komutsa "sistem" ve adı).
    kim_turu: text().notNull(),
    kim_kimligi: uuid(),
    kim_adi: text(),
  },
  (tablo) => [
    index("stok_gecmisi_birim_zaman").on(tablo.birim_kimligi, tablo.zaman),
    index("stok_gecmisi_kaynak").on(tablo.kaynak_kimligi),
    check(
      "stok_gecmisi_miktar",
      sql`${tablo.onceki_miktar} >= 0 and ${tablo.sonraki_miktar} >= 0 and ${tablo.onceki_miktar} <> ${tablo.sonraki_miktar}`,
    ),
    // Kayıt dosyasındaki sebeplerle aynıdır (cekirdek/kayitlar/stok.ts); bunu servis testi denetler.
    check(
      "stok_gecmisi_sebep",
      sql`${tablo.sebep} in ('sayim', 'yeni-mal', 'hasarli-kayip', 'iade-edilen', 'diger', 'siparis', 'siparis-iptali', 'siparis-iadesi')`,
    ),
    check(
      "stok_gecmisi_kim_dolu",
      sql`(${tablo.kim_turu} = 'sistem' and length(${tablo.kim_adi}) > 0 and ${tablo.kim_kimligi} is null) or (${tablo.kim_turu} in ('yonetici', 'musteri', 'sahip') and ${tablo.kim_kimligi} is not null and ${tablo.kim_adi} is null)`,
    ),
  ],
);
