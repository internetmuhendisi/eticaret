// Ürünün düz grupları: marka ve etiket (kart 0078, karar 0064). İkisi aynı tablo biçimini, aynı
// bağlantı biçimini ve aynı servisi (grup-servisi.ts) kullanır; yalnız adları, izinleri, metinleri ve
// bağlantının tekilliği ayrıdır. Kategori ağaç olduğu için kendi modülündedir.
//
// Grup: ad, adres adı, açıklama ve logo (logo yalnız markada girilir, kart 0111). Ad (büyük küçük harf ve noktalı noktasız i ayrımsız,
// cekirdek/metinler/ad-anahtari.ts) ve adres adı silinmemişler arasında
// sitede tekildir. Silme silinme işaretiyle yapılır, satır kalır; ürün bağlantıları kalkar (kullanıcı
// kararı, grup-servisi.ts).
//
// Aranan alanlar:
// - <grup>.adres_adi: vitrinde grup sayfası bu adla açılır. Silinmemişler arasında tekil (kısmi tekil
//   indeks), indeks aramayı da karşılar.
// - ad anahtarı (ad-anahtari.ts): ad tekilliği (kısmi tekil indeks).
// - <bağlantı>.grup_kimligi: bir grubun ürünleri. urun_kimligi birincil anahtarın ilk alanıdır: bir
//   ürünün grupları birincil anahtardan okunur.
// - <grup>.logo_kimligi: vitrin görseli ucu markanın logosunu bu alanla arar (cekirdek/moduller/duzen/gorsel.ts);
//   sitede en çok birkaç yüz marka olduğu için indeks yoktur (kategori görseliyle aynı, karar 0087).
import { sql } from "drizzle-orm";
import { index, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { dosyalar } from "../dosya/model.ts";
import { urunler } from "./model.ts";

export const grupTablosu = <Ad extends string>(ad: Ad) =>
  pgTable(
    ad,
    {
      kimlik: kimlik(),
      ad: text().notNull(),
      adres_adi: text().notNull(),
      // Etiket için bugün girilmez (kart 0078); alan iki grupta aynı biçim için vardır.
      aciklama: text(),
      // Dosya deposundaki görsel (kart 0111). Etiket için girilmez; alan iki grupta aynı biçim için vardır.
      // Dosya silinme işaretiyle silindiği için bağ kalıcı silmeyi engeller.
      logo_kimligi: uuid().references(() => dosyalar.kimlik, { onDelete: "restrict" }),
      olusturma_zamani: zaman().notNull().defaultNow(),
      guncellenme_zamani: zaman().notNull().defaultNow(),
      silinme_zamani: zaman(),
    },
    (tablo) => [
      uniqueIndex(`${ad}_adi`)
        .on(adAnahtariSql(tablo.ad))
        .where(sql`${tablo.silinme_zamani} is null`),
      uniqueIndex(`${ad}_adres_adi`)
        .on(tablo.adres_adi)
        .where(sql`${tablo.silinme_zamani} is null`),
    ],
  );
export type GrupTablosu = ReturnType<typeof grupTablosu<string>>;

// Ürün ile grup arasındaki bağlantı. Tekil bağlantıda bir ürünün en çok bir grubu olur (marka):
// birincil anahtar yalnız üründür.
export const grupBaglantisi = <Ad extends string>(
  ad: Ad,
  grup: GrupTablosu,
  { tekil }: { tekil: boolean },
) =>
  pgTable(
    ad,
    {
      urun_kimligi: uuid()
        .notNull()
        .references(() => urunler.kimlik, { onDelete: "restrict" }),
      grup_kimligi: uuid()
        .notNull()
        .references(() => grup.kimlik, { onDelete: "restrict" }),
      olusturma_zamani: zaman().notNull().defaultNow(),
    },
    (tablo) => [
      tekil
        ? primaryKey({ columns: [tablo.urun_kimligi] })
        : primaryKey({ columns: [tablo.urun_kimligi, tablo.grup_kimligi] }),
      index(`${ad}_grup`).on(tablo.grup_kimligi),
    ],
  );
export type GrupBaglantisi = ReturnType<typeof grupBaglantisi<string>>;
