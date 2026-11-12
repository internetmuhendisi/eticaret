// Müşterinin favorileri (kart 0140, karar 0110). Yalnız girişli müşterinin favorileri burada durur; üye olmayan
// müşterininkiler tarayıcısındadır (cekirdek/vitrin/favori-durumu.ts) ve giriş yapınca buraya birleşir.
//
// - Bir müşteri bir ürünü bir kez favoriler: (müşteri, ürün) birincil anahtardır.
// - Favori ürün düzeyindedir, birleşim (renk, beden) saklanmaz.
// - Sıra eklenme zamanıdır, en yeni önce.
// - Değişiklik kaydına girmez: müşterinin kendi tercihidir, mağazanın verisini değiştirmez.
//
// Aranan alanlar:
// - musteri_kimligi, eklenme_zamani: müşterinin favorileri en yeni önce (birincil anahtarın başı ve indeks).
import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { zaman } from "../../veritabani/turler.ts";
import { musteriler } from "../musteri/model.ts";
import { urunler } from "../urun/model.ts";

export const favoriler = pgTable(
  "favoriler",
  {
    musteri_kimligi: uuid()
      .notNull()
      .references(() => musteriler.kimlik, { onDelete: "restrict" }),
    urun_kimligi: uuid()
      .notNull()
      .references(() => urunler.kimlik, { onDelete: "restrict" }),
    // Servis clock_timestamp() ile yazar: aynı işlemde birleşen favorilerde de sonra eklenen daha yenidir.
    eklenme_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    primaryKey({ columns: [tablo.musteri_kimligi, tablo.urun_kimligi] }),
    index("favoriler_musteri_zaman").on(tablo.musteri_kimligi, tablo.eklenme_zamani),
  ],
);
