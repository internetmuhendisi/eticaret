// Arka plan iş kuyruğu (kart 0031, karar 0013, 0049). Kuyruk sitenin kendi veritabanındadır.
//
// Aranan alanlar:
// - calisma_zamani: sıradaki bekleyen iş bulunurken, bekleyenlerde indeksli.
// - kilit_bitis: sahibi ölen iş bulunurken, çalışanlarda indeksli.
// - bitis_zamani: biten işler silinirken, bitenlerde indeksli.
// - durum: hatalı işler listelenirken, hatalılarda indeksli.
// - tekillik_anahtari: aynı iş ikinci kez girmesin diye benzersiz.
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../veritabani/turler.ts";

export const arkaPlanIsleri = pgTable(
  "arka_plan_isleri",
  {
    kimlik: kimlik(),
    // cekirdek/arka-plan-isleri/isler.ts dosyasındaki işin türü.
    tur: text().notNull(),
    girdi: jsonb().notNull(),
    // cekirdek/kayitlar/arka-plan.ts dosyasındaki durum.
    durum: text().notNull(),
    deneme_sayisi: integer().notNull().default(0),
    en_cok_deneme: integer().notNull(),
    calisma_zamani: zaman().notNull().defaultNow(),
    kilit_sahibi: text(),
    kilit_bitis: zaman(),
    // Son hatanın maskelenmiş özeti.
    son_hata: text(),
    tekillik_anahtari: text().unique(),
    olusturulma_zamani: zaman().notNull().defaultNow(),
    bitis_zamani: zaman(),
  },
  (tablo) => [
    index("arka_plan_isleri_siradaki")
      .on(tablo.calisma_zamani)
      .where(sql`${tablo.durum} = 'bekliyor'`),
    index("arka_plan_isleri_kilit").on(tablo.kilit_bitis).where(sql`${tablo.durum} = 'calisiyor'`),
    index("arka_plan_isleri_biten").on(tablo.bitis_zamani).where(sql`${tablo.durum} = 'bitti'`),
    index("arka_plan_isleri_hatali")
      .on(tablo.olusturulma_zamani)
      .where(sql`${tablo.durum} = 'hata'`),
    check(
      "arka_plan_isleri_durum",
      sql`${tablo.durum} in ('bekliyor', 'calisiyor', 'bitti', 'hata')`,
    ),
  ],
);
