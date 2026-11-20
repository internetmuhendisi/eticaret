// Bekleyen stok uyarıları (kart 0241, karar 0154): sipariş bir birimin stoğunu eşiğin altına indirince stok düşürmeyle
// aynı işlemde bir satır yazılır. Uyarılar toplanır, saatte en çok bir e-postayla gider; e-posta gidince ya da bildirim
// kapalıyken iş satırı işlenmiş sayar. İşlenmiş satır saklama süresinden sonra silinir.
//
// Aranan alanlar: islenme_zamani boş olanlar (bekleyen uyarılar), kısmi indeks; gonderim_zamani (son gönderim),
// kısmi indeks.
import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { urunBirimleri } from "../urun/model.ts";

export const stokUyarilari = pgTable(
  "stok_uyarilari",
  {
    kimlik: kimlik(),
    birim_kimligi: uuid()
      .notNull()
      .references(() => urunBirimleri.kimlik, { onDelete: "restrict" }),
    // cekirdek/kayitlar/yonetici-bildirimi.ts: stokUyarisiTurleri.
    tur: text().notNull(),
    // Düşürmeden sonraki miktar.
    miktar: integer().notNull(),
    olusturma_zamani: zaman().notNull().defaultNow(),
    // İş satırı işledi (e-postayla ya da bildirim kapalıyken). gonderim_zamani yalnız e-posta yazıldıysa dolar.
    islenme_zamani: zaman(),
    gonderim_zamani: zaman(),
  },
  (tablo) => [
    index("stok_uyarilari_bekleyen")
      .on(tablo.olusturma_zamani)
      .where(sql`${tablo.islenme_zamani} is null`),
    index("stok_uyarilari_gonderim")
      .on(tablo.gonderim_zamani)
      .where(sql`${tablo.gonderim_zamani} is not null`),
    check("stok_uyarilari_tur", sql`${tablo.tur} in ('dusuk', 'tukendi')`),
    check(
      "stok_uyarilari_gonderim",
      sql`${tablo.gonderim_zamani} is null or ${tablo.islenme_zamani} is not null`,
    ),
  ],
);
