// Gönderilen e-postaların kaydı (kart 0032, karar 0050). İçerik tutulmaz, yalnız şablon adı. Değişkenler
// gönderim için durur, gönderilince silinir.
//
// Aranan alanlar:
// - alici: bir kişiye giden e-postalar bulunurken, indeksli.
// - olusturulma_zamani: süresi dolan kayıtlar silinirken, indeksli.
// - olay_anahtari: aynı olayın ikinci e-postası yazılırken, tekil indeksli (boş olan çok olabilir).
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import type { BirimMetinleri, KayitliMetinler } from "./metin-birimleri.ts";

export const epostaKayitlari = pgTable(
  "eposta_kayitlari",
  {
    kimlik: kimlik(),
    alici: text().notNull(),
    // cekirdek/kayitlar/eposta.ts dosyasındaki şablon ve durum.
    sablon: text().notNull(),
    durum: text().notNull(),
    degiskenler: jsonb(),
    // Sipariş e-postasının olay anındaki verisi (kart 0240): tutarlar, kalemler, teslimat. Değişkenler gibi
    // gönderilince silinir.
    veri: jsonb(),
    // Aynı olay için ikinci e-posta yazılmaz (kart 0240): olayın kalıcı kaydının kimliği ("siparis-gecmisi:<kimlik>").
    olay_anahtari: text(),
    // Mağaza sahibinin bu şablonun birimleri için yazdığı metinler (kart 0279), e-posta kuyruğa girdiği anki hâliyle:
    // sonradan yapılan değişiklik kuyrukta bekleyen e-postayı değiştirmez. Gönderilince silinir.
    metinler: jsonb().$type<KayitliMetinler>(),
    // Hatanın maskelenmiş özeti ya da gönderilmeme nedeni.
    son_hata: text(),
    olusturulma_zamani: zaman().notNull().defaultNow(),
    gonderilme_zamani: zaman(),
  },
  (tablo) => [
    index("eposta_kayitlari_alici").on(tablo.alici),
    index("eposta_kayitlari_olusturulma").on(tablo.olusturulma_zamani),
    uniqueIndex("eposta_kayitlari_olay").on(tablo.olay_anahtari),
    check(
      "eposta_kayitlari_durum",
      sql`${tablo.durum} in ('bekliyor', 'gonderildi', 'gonderilmedi', 'basarisiz')`,
    ),
  ],
);

// Mağaza sahibinin e-posta metinleri (kart 0279, karar 0197): birim başına bir satır (kod, metin-birimleri.ts).
// Alan boşsa (null) çekirdeğin güncel varsayılan metni kullanılır; "varsayılana dön" alanları boşaltır, satır kalır
// (değişiklik kaydı aynı kimliğe bağlı kalsın). Sürüm her yazımda bir artar; ekran gördüğü sürümü gönderir, arada
// yazılmışsa çakışır.
export const epostaMetinleri = pgTable(
  "eposta_metinleri",
  {
    kimlik: kimlik(),
    kod: text().notNull(),
    konu: jsonb().$type<NonNullable<BirimMetinleri["konu"]>>(),
    giris: jsonb().$type<NonNullable<BirimMetinleri["giris"]>>(),
    kapanis: jsonb().$type<NonNullable<BirimMetinleri["kapanis"]>>(),
    surum: integer().notNull().default(0),
    degistiren_kimligi: uuid(),
    degisme_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [uniqueIndex("eposta_metinleri_kod").on(tablo.kod)],
);
