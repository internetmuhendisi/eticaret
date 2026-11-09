// Sitenin düzen sürümleri (kart 0106, karar 0081). Düzen, üst kısım, ana sayfa ve alt kısımdaki bölümlerdir
// (cekirdek/vitrin/bolum-kutuphanesi/duzen.ts). Her değişiklik bütün düzeni yeni bir sürüm olarak yazar; en büyük
// sıradaki sürüm vitrinde geçerlidir. Satırlar sonradan değiştirilemez ve silinemez (tetikleyici, değişiklik
// dosyası 0025): tema değişikliğinde önceki düzene dönmek (kart 0113) bu sürümlerle yapılır.
//
// Aranan alanlar:
// - sira: tekil indeksli; son sürüm buradan okunur.
import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, uniqueIndex } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const duzenSurumleri = pgTable(
  "duzen_surumleri",
  {
    kimlik: kimlik(),
    // 1'den başlayıp birer artar. İlk sürüm sitenin başlangıç düzenidir.
    sira: integer().notNull(),
    // Bütün düzen: her alanın bölümleri sırasıyla.
    duzen: jsonb().notNull(),
    zaman: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    uniqueIndex("duzen_surumleri_sira").on(tablo.sira),
    check("duzen_surumleri_sira_pozitif", sql`${tablo.sira} > 0`),
  ],
);
