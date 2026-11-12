// Ürün yorumları (kart 0139, karar 0109). Müşteri girişli yazar, mağaza onaylayınca yayınlanır.
//
// - Görünen ad kayda kısaltılmış girer ("Ayşe Y."): müşterinin soyadı hiç saklanmaz.
// - Metin düz metindir; vitrin onu yazı olarak çizer, HTML ve bağlantı çalışmaz.
// - Bir müşteri bir ürüne bir yorum yazar (kullanıcı kararı): (ürün, müşteri) tekildir. Başlangıç kataloğunun
//   örnek yorumlarının müşterisi yoktur.
// - Doğrulanmış alıcı işareti yazıldığı anda satın alma denetiminden gelir (satin-alma.ts); vitrinde görünüp
//   görünmemesi mağaza sahibinin ayarıdır.
// - Ana sayfada göster: ana sayfanın müşteri yorumları bölümünün "işaretlenenler" kaynağı (karar 0090).
//
// Aranan alanlar:
// - urun_kimligi, durum, olusturma_zamani: ürünün yayındaki yorumları en yeni önce ve puan özeti (indeksli).
// - durum, ana_sayfada, olusturma_zamani: ana sayfanın yorumları (indeksli).
// - urun_kimligi, musteri_kimligi: müşterinin bu ürüne yorumu var mı (tekil indeks).
// - durum, olusturma_zamani: yöneticinin listesi (indeksli).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { musteriler } from "../musteri/model.ts";
import { urunler } from "../urun/model.ts";

export const yorumlar = pgTable(
  "yorumlar",
  {
    kimlik: kimlik(),
    urun_kimligi: uuid()
      .notNull()
      .references(() => urunler.kimlik, { onDelete: "restrict" }),
    // Başlangıç kataloğunun örnek yorumunda boştur.
    musteri_kimligi: uuid().references(() => musteriler.kimlik, { onDelete: "restrict" }),
    puan: integer().notNull(),
    baslik: text(),
    metin: text().notNull(),
    ad: text().notNull(),
    durum: text().notNull(),
    dogrulanmis_alici: boolean().notNull().default(false),
    ana_sayfada: boolean().notNull().default(false),
    // Servis clock_timestamp() ile yazar: aynı işlemde eklenen örnek yorumlarda da sonra eklenen daha yenidir.
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    // Kayıtla aynı olduğunu servis testi denetler (yorumSinirlari, yorumDurumlari).
    check("yorumlar_puan", sql`${tablo.puan} between 1 and 5`),
    check("yorumlar_durum", sql`${tablo.durum} in ('onay-bekliyor', 'yayinda', 'reddedildi')`),
    index("yorumlar_urun_durum_zaman").on(tablo.urun_kimligi, tablo.durum, tablo.olusturma_zamani),
    index("yorumlar_ana_sayfa").on(tablo.durum, tablo.ana_sayfada, tablo.olusturma_zamani),
    index("yorumlar_durum_zaman").on(tablo.durum, tablo.olusturma_zamani),
    uniqueIndex("yorumlar_urun_musteri")
      .on(tablo.urun_kimligi, tablo.musteri_kimligi)
      .where(sql`${tablo.musteri_kimligi} is not null`),
  ],
);
