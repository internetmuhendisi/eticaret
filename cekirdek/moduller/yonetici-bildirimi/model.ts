// Bekleyen stok uyarıları (kart 0241, karar 0154): sipariş bir birimin stoğunu eşiğin altına indirince stok düşürmeyle
// aynı işlemde bir satır yazılır. Uyarılar toplanır, saatte en çok bir e-postayla gider; e-posta gidince ya da bildirim
// kapalıyken iş satırı işlenmiş sayar. İşlenmiş satır saklama süresinden sonra silinir.
//
// Aranan alanlar: islenme_zamani boş olanlar (bekleyen uyarılar), kısmi indeks; gonderim_zamani (son gönderim),
// kısmi indeks.
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
import { yoneticiler } from "../ekip/model.ts";
import { urunBirimleri } from "../urun/model.ts";

export const stokUyarilari = pgTable(
  "stok_uyarilari",
  {
    kimlik: kimlik(),
    birim_kimligi: uuid()
      .notNull()
      .references(() => urunBirimleri.kimlik, { onDelete: "restrict" }),
    // cekirdek/kayitlar/yonetici-bildirimi.ts: stokUyarisiTurleri.
    tur: text().notNull(),
    // Düşürmeden sonraki miktar.
    miktar: integer().notNull(),
    olusturma_zamani: zaman().notNull().defaultNow(),
    // İş satırı işledi (e-postayla ya da bildirim kapalıyken). gonderim_zamani yalnız e-posta yazıldıysa dolar.
    islenme_zamani: zaman(),
    gonderim_zamani: zaman(),
  },
  (tablo) => [
    index("stok_uyarilari_bekleyen")
      .on(tablo.olusturma_zamani)
      .where(sql`${tablo.islenme_zamani} is null`),
    index("stok_uyarilari_gonderim")
      .on(tablo.gonderim_zamani)
      .where(sql`${tablo.gonderim_zamani} is not null`),
    check("stok_uyarilari_tur", sql`${tablo.tur} in ('dusuk', 'tukendi')`),
    check(
      "stok_uyarilari_gonderim",
      sql`${tablo.gonderim_zamani} is null or ${tablo.islenme_zamani} is not null`,
    ),
  ],
);

// Panelin içindeki bildirimler (kart 0280, karar 0198): olay anında, olayla aynı işlemde, o olayın iznine sahip her
// silinmemiş yöneticiye bir satır. Satır kişisel veri taşımaz: olayın türü, ilgili kaydın kimliği (sipariş, yorum,
// birim) ve kişisel olmayan özet (tutar, neden, miktar); metin okunurken kayıttan kurulur. Okunurken izin yeniden
// sorulur. Okunan satır `panelBildirimiSaklamaGun` gün sonra silinir, okunmamış silinmez.
//
// Aranan alanlar: yöneticinin okunmamışları (sayı), kısmi indeks; yöneticinin en yenileri (liste); okunma zamanı
// (temizlik), kısmi indeks. Aynı olay bir yöneticiye bir kez yazılır (yonetici_kimligi, anahtar).
export const panelBildirimleri = pgTable(
  "panel_bildirimleri",
  {
    kimlik: kimlik(),
    yonetici_kimligi: uuid()
      .notNull()
      .references(() => yoneticiler.kimlik, { onDelete: "cascade" }),
    // cekirdek/kayitlar/yonetici-bildirimi.ts: yoneticiBildirimleri.
    bildirim: text().notNull(),
    // Olayın anahtarı (e-postanınkiyle aynı): geçmiş satırı, yorum, stok uyarısı.
    anahtar: text().notNull(),
    // İlgili kayıt: sipariş (sipariş bildirimleri ve bekleyen iade), yorum, birim (stok); karşılaştırmada yok.
    kayit_kimligi: uuid(),
    ozet: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    olusturma_zamani: zaman().notNull().default(sql`clock_timestamp()`),
    okunma_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("panel_bildirimleri_anahtar").on(tablo.yonetici_kimligi, tablo.anahtar),
    index("panel_bildirimleri_liste").on(
      tablo.yonetici_kimligi,
      tablo.olusturma_zamani,
      tablo.kimlik,
    ),
    index("panel_bildirimleri_okunmamis")
      .on(tablo.yonetici_kimligi)
      .where(sql`${tablo.okunma_zamani} is null`),
    index("panel_bildirimleri_okunan")
      .on(tablo.okunma_zamani)
      .where(sql`${tablo.okunma_zamani} is not null`),
    check(
      "panel_bildirimleri_bildirim",
      sql`${tablo.bildirim} in ('yeni-siparis', 'havale-bildirimi', 'iade-talebi', 'iptal', 'stok', 'yorum', 'kartla-odeme-uyusmazligi', 'bekleyen-iade')`,
    ),
  ],
);
