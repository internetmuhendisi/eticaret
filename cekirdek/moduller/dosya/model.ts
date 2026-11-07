// Yüklenen dosyaların kaydı (kart 0072, karar 0058). Dosyanın kendisi sitenin dosya klasöründedir,
// adı kaydın kimliği ve türün uzantısıdır: kullanıcının verdiği ad hiçbir yerde kullanılmaz.
// Silinen dosya önce işaretlenir (silinme_zamani), dosyanın kendisi yerinde kalır.
//
// Aranan alanlar: yalnız kimlik (birincil anahtar). Dosya, onu kullanan kayıttan (logo, ürün
// görseli) kimliğiyle bulunur.
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const dosyalar = pgTable("dosyalar", {
  kimlik: kimlik(),
  // cekirdek/kayitlar/dosya.ts dosyasındaki tür adı.
  tur: text().notNull(),
  boyut: integer().notNull(),
  genislik: integer().notNull(),
  yukseklik: integer().notNull(),
  // Saklanan içeriğin SHA-256 özeti: yedek ve geri yükleme dosyanın değişmediğini bununla ölçer.
  icerik_ozeti: text().notNull(),
  olusturma_zamani: zaman().notNull().defaultNow(),
  silinme_zamani: zaman(),
});
