// Ödeme oturumları (kart 0213, karar 0140). Müşteri ödeme adımında "Siparişi onayla"ya basınca bilgileri burada
// durur; sepetin birimleri aynı işlemde stok ayırma süresi kadar ayrılır (stok_ayirmalari, cekirdek/moduller/stok/
// model.ts). Sipariş kart 0214'te oturumdan kurulur.
//
// - Tutar sunucunun hesabıdır (sepetiHesapla), tarayıcıdan gelmez. Sipariş kurulurken yeniden hesaplanır; burada
//   müşterinin onayladığı anki toplam durur.
// - Onaylar metin sürümüyle yazılır (cekirdek/kayitlar/musteri-onaylari.ts): ön bilgilendirme, mesafeli satış ve
//   pazarlama izni. Üye olmayan müşterinin hesabı olmadığı için onaylar oturumdadır.
// - Kişisel veri taşır (e-posta, adres, telefon): siparişe dönmeyen oturum süresi dolduktan sonra
//   odemeOturumuSaklamaSaat saat içinde zamanlı işle silinir, ayırmaları da onunla gider.
//
// Aranan alanlar:
// - kimlik: müşterinin önceki oturumu (yeniden basınca serbest bırakılır), sipariş kurulurken oturum.
// - bitis_zamani: süresi dolan oturumların temizliği, indeksli.
import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kimlik, tutar, zaman } from "../../veritabani/turler.ts";
import { musteriler } from "../musteri/model.ts";
import type { SepetKalemi } from "../sepet/semalar.ts";
import type { Fatura, Teslimat } from "./semalar.ts";

// beyan: onayı müşteri değil yönetici beyan etti (panelden elle sipariş, kart 0236, karar 0148): metinlerin müşteriye
// iletildiğini işaretleyen yöneticinin kimliği. Müşterinin kendi onayı sayılmaz.
export type OturumOnayi = { tur: string; verildi: boolean; metinSurumu: string; beyan?: string };

export const odemeOturumlari = pgTable(
  "odeme_oturumlari",
  {
    kimlik: kimlik(),
    // Giriş yapmış ya da ödemede hesap açan müşteri; üye olmayan müşteride boştur.
    musteri_kimligi: uuid().references(() => musteriler.kimlik, { onDelete: "restrict" }),
    eposta: text().notNull(),
    teslimat: jsonb().$type<Teslimat>().notNull(),
    fatura: jsonb().$type<Fatura>().notNull(),
    not: text(),
    // Sepetin kalemleri, sunucunun hesabından geçmiş adetlerle (birim ve adet).
    kalemler: jsonb().$type<Pick<SepetKalemi, "birim" | "adet">[]>().notNull(),
    toplam: tutar().notNull(),
    para_birimi: text().notNull(),
    // Sepette uygulanan kuponun kodu (kart 0312): eklentili ödemede sipariş kurulurken hesap bununla yeniden yapılır.
    kupon_kodu: text(),
    onaylar: jsonb().$type<OturumOnayi[]>().notNull(),
    olusturma_zamani: zaman().notNull().defaultNow(),
    // Stok ayırmasının bittiği an; oturum bu ana kadar siparişe dönebilir.
    bitis_zamani: zaman().notNull(),
    // Ödeme dışarıda başladı (eklentili yöntem, kart 0215): müşterinin yeniden onayı oturumu silmez (yalnız ayırmasını
    // bırakır), temizlik odemeOturumuDisaridaSaklamaGun gün sonra siler.
    odeme_disarida: boolean().notNull().default(false),
  },
  (tablo) => [
    index("odeme_oturumlari_bitis").on(tablo.bitis_zamani),
    check("odeme_oturumlari_toplam", sql`${tablo.toplam} >= 0`),
    check("odeme_oturumlari_bitis_sonra", sql`${tablo.bitis_zamani} > ${tablo.olusturma_zamani}`),
  ],
);

export type OdemeOturumu = typeof odemeOturumlari.$inferSelect;
