// Müşterilerin hesapları, oturumları ve onayları (kartlar 0025, 0033). Hesap ve oturum tablosunun biçimi
// ve aranan alanları ortak tanımdadır: cekirdek/moduller/oturum/model.ts.
//
// musteri_onaylari: müşterinin onayları, hangi metin sürümüne verildiğiyle. Satırlar sonradan değiştirilemez:
// güncelleme ve silme veritabanındaki tetikleyiciyle reddedilir (değişiklik dosyası 0008). İzin geri
// alınınca yeni satır yazılır, en yeni satır geçerlidir. Bu yüzden hesabın kalıcı silinmesi de reddedilir
// (karar 0051).
// Aranan alanlar: musteri_kimligi ve tur (bir müşterinin bir onayı bulunurken, indeksli).
import { boolean, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { hesapTablosu, oturumTablosu } from "../oturum/model.ts";

export const musteriler = hesapTablosu("musteriler");
export const musteriOturumlari = oturumTablosu("musteri_oturumlari", () => musteriler.kimlik);

export const musteriOnaylari = pgTable(
  "musteri_onaylari",
  {
    kimlik: kimlik(),
    musteri_kimligi: uuid()
      .notNull()
      .references(() => musteriler.kimlik),
    // cekirdek/kayitlar/musteri-onaylari.ts dosyasındaki onay türü.
    tur: text().notNull(),
    verildi: boolean().notNull(),
    metin_surumu: text().notNull(),
    zaman: zaman().notNull().defaultNow(),
  },
  (tablo) => [index("musteri_onaylari_musteri_tur").on(tablo.musteri_kimligi, tablo.tur)],
);
