// Kart ödemeleri (kart 0215, karar 0142). Müşteri "Kartla öde" ile "Siparişi onayla"ya basınca ödeme oturumu açılır,
// ödeme kuruluşunda ödeme formu başlatılır ve burada bir satır yazılır. Ödemenin sonucu yalnız ödeme kuruluşuna yapılan
// sorguyla öğrenilir (dönüş, imzalı bildirim ya da tarama); sonuç satıra yazılır.
//
// - Kart numarası, son kullanma tarihi ve güvenlik kodu sitenin sunucusuna gelmez, saklanmaz.
// - belirtec: ödeme kuruluşunun formu için verdiği belirteç (iyzico'nun token'ı). Dönüşte ve bildirimde gelir; satır
//   onunla bulunur. Tekildir.
// - odeme_kimligi: ödeme kuruluşunun ödeme kimliği (iyzico'nun paymentId'si); ödeme alınınca yazılır. Günlük
//   karşılaştırma ve iptal onunla yapılır.
// - tutar: oturumun toplamı (kuruş, sunucunun hesabı); odenen: müşterinin taksit farkıyla ödediği tutar.
// - ortam: ödemenin hangi ortamda (deneme ya da canlı) başlatıldığı: karşılaştırma aynı ortamın kayıtlarıyla yapılır.
// - Değişiklik kaydına girmez: mağazanın verisini değil, müşterinin ödemesini yazar. Ödenen satır siparişe bağlıdır ve
//   kalır. Siparişe dönmemiş oturum saklama süresinden sonra silinince (ödeme oturumu temizliği) satırı da silinir:
//   kişisel veri taşımaz, sonucu tarama ve günlük karşılaştırma o süreden önce işler.
//
// Aranan alanlar:
// - belirtec: dönüş ve bildirim, tekil indeks.
// - oturum_kimligi: bir oturumun ödemesi, tekil indeks (bir oturum bir ödeme).
// - durum, son_sorgu_zamani ve olusturma_zamani: sonucu bilinmeyen ödemeleri soran tarama, kısmi indeks (yalnız
//   başlatılmış).
// - sonuc_zamani: günlük karşılaştırma (o günün sonuçlanan ödemeleri), indeksli.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { odemeOturumlari } from "../../moduller/odeme/model.ts";
import { siparisler } from "../../moduller/siparis/model.ts";
import { kimlik, tutar, zaman } from "../../veritabani/turler.ts";

export const kartOdemeleri = pgTable(
  "kart_odemeleri",
  {
    kimlik: kimlik(),
    oturum_kimligi: uuid()
      .notNull()
      .references(() => odemeOturumlari.kimlik, { onDelete: "cascade" }),
    belirtec: text().notNull(),
    odeme_kimligi: text(),
    // cekirdek/kayitlar/eklentiler.ts: kartOdemesiDurumlari.
    durum: text().notNull(),
    ortam: text().notNull(),
    tutar: tutar().notNull(),
    para_birimi: text().notNull(),
    odenen: tutar(),
    taksit: integer(),
    siparis_kimligi: uuid().references(() => siparisler.kimlik, { onDelete: "restrict" }),
    olusturma_zamani: zaman().notNull().defaultNow(),
    sonuc_zamani: zaman(),
    // Sipariş alındı sayfasının erişim anahtarı belirteçle yalnız bir kez verilir (bağımsız kontrolün bulgusu): belirteci
    // sonradan ele geçiren siparişi açamaz, müşterinin erişimini düşüremez.
    erisim_verildi: boolean().notNull().default(false),
    // Taramanın bu ödemeyi en son sorduğu an: tarama en az sorulandan başlar, sonuçlanamayan ödemeler yenilerini
    // tıkamaz.
    son_sorgu_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("kart_odemeleri_belirtec").on(tablo.belirtec),
    uniqueIndex("kart_odemeleri_oturum").on(tablo.oturum_kimligi),
    index("kart_odemeleri_bekleyen")
      .on(tablo.son_sorgu_zamani, tablo.olusturma_zamani)
      .where(sql`${tablo.durum} = 'baslatildi'`),
    index("kart_odemeleri_sonuc").on(tablo.sonuc_zamani),
    // Kayıtla aynı olduğunu servis testi denetler (kartOdemesiDurumlari, kartlaOdemeOrtamlari).
    check(
      "kart_odemeleri_durum",
      sql`${tablo.durum} in ('baslatildi', 'odendi', 'basarisiz', 'iptal-edildi')`,
    ),
    check("kart_odemeleri_ortam", sql`${tablo.ortam} in ('deneme', 'canli')`),
    // Ödendiyse sipariş, ödeme kimliği, ödenen tutar ve taksit vardır; başlatılmışta sonuç yoktur.
    check(
      "kart_odemeleri_sonuc_alanlari",
      sql`(${tablo.durum} = 'odendi' and ${tablo.siparis_kimligi} is not null and ${tablo.odeme_kimligi} is not null and ${tablo.odenen} is not null and ${tablo.taksit} is not null and ${tablo.sonuc_zamani} is not null) or (${tablo.durum} = 'baslatildi' and ${tablo.siparis_kimligi} is null and ${tablo.sonuc_zamani} is null) or (${tablo.durum} in ('basarisiz', 'iptal-edildi') and ${tablo.siparis_kimligi} is null and ${tablo.sonuc_zamani} is not null)`,
    ),
    check(
      "kart_odemeleri_tutarlar",
      sql`${tablo.tutar} > 0 and (${tablo.odenen} is null or ${tablo.odenen} >= ${tablo.tutar}) and (${tablo.taksit} is null or ${tablo.taksit} between 1 and 12)`,
    ),
  ],
);
export type KartOdemesi = typeof kartOdemeleri.$inferSelect;
