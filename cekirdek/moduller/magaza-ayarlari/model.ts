// Mağaza sahibinin ayarları (kart 0069, kararlar 0010 ve 0055). Her ayar ayrı bir satırdır: iki ayar
// aynı anda değişince biri ötekini ezmez. Satır ayar veritabanında ilk kez yokken başlangıç değeriyle
// açılır, sonra yalnız servisle değişir (servis.ts). Silinmez: şemadan çıkan ayarın satırı okunmaz.
//
// Aranan alanlar:
// - anahtar: ayar adıyla okunurken ve yazılırken, tekil indeksli. Bütün ayarlar birlikte okunur,
//   tablo ayar sayısı kadar satırdır.
import { jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const magazaAyarlari = pgTable(
  "magaza_ayarlari",
  {
    kimlik: kimlik(),
    // Ayar şemasındaki ad (cekirdek/ayar-semasi/ayarlar.ts, magazaAyarSemasi).
    anahtar: text().notNull(),
    // Ayarın değeri. null, boş bırakılabilen ayarın boş olduğunu söyler.
    deger: jsonb(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [uniqueIndex("magaza_ayarlari_anahtar").on(tablo.anahtar)],
);
