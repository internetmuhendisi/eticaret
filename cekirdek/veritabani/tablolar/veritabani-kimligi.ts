// Veritabanının hangi siteye ait olduğu (kart 0011). Tek satırdır, ilk güncellemede yazılır.
// Güncelleme komutu yanlış sitenin veritabanına değişiklik uygulamamak için buna bakar.
// Aranan alan: site_kod_adi (benzersiz indeksli).
import { pgTable, text } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../turler.ts";

export const veritabaniKimligi = pgTable("veritabani_kimligi", {
  kimlik: kimlik(),
  site_kod_adi: text().notNull().unique(),
  olusturulma_zamani: zaman().notNull().defaultNow(),
});
