// Mağaza yöneticilerinin hesapları, oturumları ve rolleri (kartlar 0025, 0026). Hesap ve oturum
// tablolarının biçimi ve aranan alanları ortak tanımdadır: cekirdek/moduller/oturum/model.ts.
//
// Aranan alanlar:
// - roller.kod: rol verilirken, benzersiz indeksli.
// - roller.tam_yetki: tam yetkili sahipler sayılırken. Tablo birkaç satırdır, indeks gerekmez.
// - rol_izinleri: rol ve izinle, birincil anahtar indeksiyle.
// - yonetici_rolleri.yonetici_kimligi: her istekte izin kontrolünde, birincil anahtarın başı.
// - yonetici_rolleri.rol_kimligi: bir rolü taşıyanlar bulunurken, indeksli.
import { boolean, index, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { hesapTablosu, oturumTablosu } from "../oturum/model.ts";

export const yoneticiler = hesapTablosu("yoneticiler");
export const yoneticiOturumlari = oturumTablosu("yonetici_oturumlari", () => yoneticiler.kimlik);

export const roller = pgTable(
  "roller",
  {
    kimlik: kimlik(),
    kod: text().notNull(),
    // Bütün yönetici izinlerini verir; yeni izin için rol_izinleri'ne satır gerekmez.
    tam_yetki: boolean().notNull().default(false),
    olusturulma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [uniqueIndex("roller_kod_benzersiz").on(tablo.kod)],
);

export const rolIzinleri = pgTable(
  "rol_izinleri",
  {
    rol_kimligi: uuid()
      .notNull()
      .references(() => roller.kimlik),
    // cekirdek/kayitlar/izinler.ts dosyasındaki izin adı.
    izin: text().notNull(),
  },
  (tablo) => [primaryKey({ columns: [tablo.rol_kimligi, tablo.izin] })],
);

export const yoneticiRolleri = pgTable(
  "yonetici_rolleri",
  {
    yonetici_kimligi: uuid()
      .notNull()
      .references(() => yoneticiler.kimlik, { onDelete: "cascade" }),
    rol_kimligi: uuid()
      .notNull()
      .references(() => roller.kimlik),
    olusturulma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    primaryKey({ columns: [tablo.yonetici_kimligi, tablo.rol_kimligi] }),
    index("yonetici_rolleri_rol").on(tablo.rol_kimligi),
  ],
);
