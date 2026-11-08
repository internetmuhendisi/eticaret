// Yüklenen dosyaların kaydı (kart 0072, karar 0058). Dosyanın kendisi sitenin dosya klasöründedir,
// adı kaydın kimliği ve türün uzantısıdır: kullanıcının verdiği ad hiçbir yerde kullanılmaz.
// Silinen dosya önce işaretlenir (silinme_zamani), dosyanın kendisi yerinde kalır.
//
// Aranan alanlar: yalnız kimlik (birincil anahtar). Dosya, onu kullanan kayıttan (logo, ürün
// görseli) kimliğiyle bulunur. Görselin boyutları da birer dosyadır (dosya_boyutlari).
import { integer, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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

// Bir görselin boyutları (kart 0087, karar 0073): her satır, kaynak görselden üretilen bir boyutun dosya
// kaydını gösterir. Boyutlar cekirdek/kayitlar/gorsel.ts kaydındadır. Kaynak ve boyutları aynı işlemde
// yazılır (gorselKaydet): boyutu eksik görsel yalnız kayda sonradan yeni boyut eklenince olur.
//
// Aranan alanlar: kaynak_kimligi birincil anahtarın ilk alanıdır, görselin boyutları oradan okunur.
// Bir dosya yalnız bir görselin boyutu olabilir (tekil indeks).
export const dosyaBoyutlari = pgTable(
  "dosya_boyutlari",
  {
    kaynak_kimligi: uuid()
      .notNull()
      .references(() => dosyalar.kimlik, { onDelete: "restrict" }),
    // cekirdek/kayitlar/gorsel.ts dosyasındaki boyut adı.
    boyut: text().notNull(),
    dosya_kimligi: uuid()
      .notNull()
      .references(() => dosyalar.kimlik, { onDelete: "restrict" }),
  },
  (tablo) => [
    primaryKey({ columns: [tablo.kaynak_kimligi, tablo.boyut] }),
    uniqueIndex("dosya_boyutlari_dosya").on(tablo.dosya_kimligi),
  ],
);
