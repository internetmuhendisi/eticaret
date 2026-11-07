// Yönetici ve müşteri hesaplarının ortak tablo biçimi (kart 0025, karar 0039). Tablolar kendi
// modüllerinde açılır (ekip/model.ts, musteri/model.ts); ikisinin alanları burada tek yerde durur.
//
// Hesap tablosunda aranan alan: eposta. Silinmemiş hesaplarda benzersiz indeksli; silinen hesabın
// e-postası yeniden kullanılabilir. Kimlik birincil anahtardır.
//
// Oturum tablosunda aranan alanlar:
// - kisa_anahtar_ozeti: her istekte oturum doğrulanırken, benzersiz indeksli.
// - yenileme_anahtari_ozeti: anahtar yenilenirken, benzersiz indeksli.
// - onceki_yenileme_ozeti: eski anahtarın yeniden kullanımı yakalanırken, indeksli.
// - hesap_kimligi: bir hesabın oturumları bulunurken, indeksli.
//
// Şifre sıfırlama tablosunda aranan alanlar (kart 0034, karar 0052):
// - anahtar_ozeti: bağlantı kullanılırken, benzersiz indeksli.
// - hesap_kimligi: bir hesabın eski bağlantıları silinirken, indeksli.
import { type AnyPgColumn, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const hesapTablosu = (ad: string) =>
  pgTable(
    ad,
    {
      kimlik: kimlik(),
      // Küçük harfe çevrilmiş e-posta (semalar.ts).
      eposta: text().notNull(),
      sifre_ozeti: text().notNull(),
      olusturulma_zamani: zaman().notNull().defaultNow(),
      guncellenme_zamani: zaman().notNull().defaultNow(),
      silinme_zamani: zaman(),
    },
    (tablo) => [
      uniqueIndex(`${ad}_eposta_benzersiz`)
        .on(tablo.eposta)
        .where(sql`${tablo.silinme_zamani} is null`),
    ],
  );

export const oturumTablosu = (ad: string, hesap: () => AnyPgColumn) =>
  pgTable(
    ad,
    {
      kimlik: kimlik(),
      hesap_kimligi: uuid().notNull().references(hesap, { onDelete: "cascade" }),
      // Anahtarların kendisi tutulmaz, yalnız özetleri.
      kisa_anahtar_ozeti: text().notNull(),
      kisa_anahtar_bitis: zaman().notNull(),
      yenileme_anahtari_ozeti: text().notNull(),
      onceki_yenileme_ozeti: text(),
      yenileme_zamani: zaman(),
      // Hareketsizlik sınırı: her yenilemede ileri alınır.
      oturum_bitis: zaman().notNull(),
      kapanma_zamani: zaman(),
      // Yönetici oturumu ancak iki aşamadan geçince sayılır, boş olan reddedilir (karar 0044). Eski
      // sürümün yalnız şifreyle açtığı oturum bu alanı doldurmaz. Müşteride kullanılmaz, boş kalır.
      iki_asama_zamani: zaman(),
      olusturulma_zamani: zaman().notNull().defaultNow(),
    },
    (tablo) => [
      uniqueIndex(`${ad}_kisa_anahtar_benzersiz`).on(tablo.kisa_anahtar_ozeti),
      uniqueIndex(`${ad}_yenileme_anahtari_benzersiz`).on(tablo.yenileme_anahtari_ozeti),
      index(`${ad}_onceki_yenileme`).on(tablo.onceki_yenileme_ozeti),
      index(`${ad}_hesap`).on(tablo.hesap_kimligi),
    ],
  );

export const sifreSifirlamaTablosu = (ad: string, hesap: () => AnyPgColumn) =>
  pgTable(
    ad,
    {
      kimlik: kimlik(),
      hesap_kimligi: uuid().notNull().references(hesap, { onDelete: "cascade" }),
      // Anahtarın kendisi tutulmaz, yalnız özeti.
      anahtar_ozeti: text().notNull(),
      bitis: zaman().notNull(),
      kullanilma_zamani: zaman(),
      olusturulma_zamani: zaman().notNull().defaultNow(),
    },
    (tablo) => [
      uniqueIndex(`${ad}_anahtar_benzersiz`).on(tablo.anahtar_ozeti),
      index(`${ad}_hesap`).on(tablo.hesap_kimligi),
    ],
  );
