// Gönderilen e-postaların kaydı (kart 0032, karar 0050). İçerik tutulmaz, yalnız şablon adı. Değişkenler
// gönderim için durur, gönderilince silinir.
//
// Aranan alanlar:
// - alici: bir kişiye giden e-postalar bulunurken, indeksli.
// - olusturulma_zamani: süresi dolan kayıtlar silinirken, indeksli.
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const epostaKayitlari = pgTable(
  "eposta_kayitlari",
  {
    kimlik: kimlik(),
    alici: text().notNull(),
    // cekirdek/kayitlar/eposta.ts dosyasındaki şablon ve durum.
    sablon: text().notNull(),
    durum: text().notNull(),
    degiskenler: jsonb(),
    // Hatanın maskelenmiş özeti ya da gönderilmeme nedeni.
    son_hata: text(),
    olusturulma_zamani: zaman().notNull().defaultNow(),
    gonderilme_zamani: zaman(),
  },
  (tablo) => [
    index("eposta_kayitlari_alici").on(tablo.alici),
    index("eposta_kayitlari_olusturulma").on(tablo.olusturulma_zamani),
    check(
      "eposta_kayitlari_durum",
      sql`${tablo.durum} in ('bekliyor', 'gonderildi', 'gonderilmedi', 'basarisiz')`,
    ),
  ],
);
