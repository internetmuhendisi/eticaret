// Müşterilerin hesapları, oturumları ve onayları (kartlar 0025, 0033). Hesap ve oturum tablosunun biçimi
// ve aranan alanları ortak tanımdadır: cekirdek/moduller/oturum/model.ts.
//
// musteri_onaylari: müşterinin onayları, hangi metin sürümüne verildiğiyle. Satırlar sonradan değiştirilemez:
// güncelleme ve silme veritabanındaki tetikleyiciyle reddedilir (değişiklik dosyası 0008). İzin geri
// alınınca yeni satır yazılır, en yeni satır geçerlidir. Bu yüzden hesabın kalıcı silinmesi de reddedilir
// (karar 0051).
// Aranan alanlar: musteri_kimligi ve tur (bir müşterinin bir onayı bulunurken, indeksli).
//
// musteri_adresleri: müşterinin adres defteri (kart 0237, karar 0149). Kurallar adres servisindedir
// (cekirdek/moduller/musteri/adres.ts). Adres kişisel veridir: silinen adres işaretlenmez, kalıcı silinir;
// siparişteki adres kendi kopyasıdır, değişmez. Bir müşterinin her türde en çok bir varsayılan adresi olur
// (kısmi tekil indeksler, servis müşterinin satırını kilitleyerek de denetler).
// Aranan alanlar: musteri_kimligi (müşterinin adresleri, indeksli).
import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { hesapTablosu, oturumTablosu, sifreSifirlamaTablosu } from "../oturum/model.ts";

export const musteriler = hesapTablosu("musteriler");
export const musteriOturumlari = oturumTablosu("musteri_oturumlari", () => musteriler.kimlik);
export const musteriSifreSifirlamalari = sifreSifirlamaTablosu(
  "musteri_sifre_sifirlamalari",
  () => musteriler.kimlik,
);

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

export const musteriAdresleri = pgTable(
  "musteri_adresleri",
  {
    kimlik: kimlik(),
    musteri_kimligi: uuid()
      .notNull()
      .references(() => musteriler.kimlik, { onDelete: "restrict" }),
    // Adresin adı ("Ev", "İş").
    baslik: text().notNull(),
    ad: text().notNull(),
    soyad: text().notNull(),
    // Uluslararası biçimde (teslimat şeması çevirir); telefonun zorunluluğu mağaza ayarıdır.
    telefon: text(),
    ulke: text().notNull(),
    il: text(),
    ilce: text(),
    adres: text().notNull(),
    posta_kodu: text(),
    varsayilan_teslimat: boolean().notNull().default(false),
    varsayilan_fatura: boolean().notNull().default(false),
    // Servis clock_timestamp() ile yazar: sıra eklenme zamanıdır (en yeni önce).
    olusturulma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    index("musteri_adresleri_musteri").on(tablo.musteri_kimligi, tablo.olusturulma_zamani),
    uniqueIndex("musteri_adresleri_varsayilan_teslimat")
      .on(tablo.musteri_kimligi)
      .where(sql`${tablo.varsayilan_teslimat}`),
    uniqueIndex("musteri_adresleri_varsayilan_fatura")
      .on(tablo.musteri_kimligi)
      .where(sql`${tablo.varsayilan_fatura}`),
  ],
);
