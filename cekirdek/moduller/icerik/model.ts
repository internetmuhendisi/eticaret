// Blog yazıları ve blog kategorileri (kart 0272, karar 0176).
//
// - Yazının içeriği biçimli metindir (HTML); vitrinde ürün açıklamasıyla aynı temizlikten geçer (aciklamayiTemizle).
// - Silme silinme işaretiyle yapılır, satır kalır. Adres adı ve kategori adı yalnız silinmemişler arasında tekildir.
// - Yazının adres adı değişince ya da yazı silinince eski adres saklanır (eski_adresler, tetikleyici blog_yazilari_eski_adres,
//   değişiklik 0055): vitrin eski adrese geleni yazının bugünkü adresine yönlendirir.
// - Silinen kategorinin yazıları kategorisiz kalır (servis yazar; yabancı anahtar silinmiş satırı göstermeye devam
//   etmesin diye servis alanı boşaltır).
//
// Aranan alanlar:
// - blog_yazilari.adres_adi: vitrinde yazı sayfası bu adla açılır. Silinmemişler arasında tekil (kısmi tekil indeks),
//   indeks aramayı da karşılar.
// - blog_yazilari (durum, yayin_zamani): vitrinin listesi ve ana sayfanın son yazıları, yayın zamanı en yeni önce.
// - blog_yazilari.kategori_kimligi: bir kategorinin yazıları (vitrinde ?kategori=, ana sayfa bölümünün kategorisi).
// - blog_yazilari.kapak_kimligi: vitrin görseli ucu bir dosyanın yayındaki bir yazının kapağı olup olmadığını sorar.
// - blog_kategorileri.adres_adi: vitrinde ?kategori= adres adıyla gelir. Silinmemişler arasında tekil.
import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { dosyalar } from "../dosya/model.ts";

export const blogKategorileri = pgTable(
  "blog_kategorileri",
  {
    kimlik: kimlik(),
    ad: text().notNull(),
    adres_adi: text().notNull(),
    // Küçük önce.
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("blog_kategorileri_adres_adi")
      .on(tablo.adres_adi)
      .where(sql`${tablo.silinme_zamani} is null`),
    uniqueIndex("blog_kategorileri_ad")
      .on(adAnahtariSql(tablo.ad))
      .where(sql`${tablo.silinme_zamani} is null`),
  ],
);

export const blogYazilari = pgTable(
  "blog_yazilari",
  {
    kimlik: kimlik(),
    baslik: text().notNull(),
    adres_adi: text().notNull(),
    ozet: text(),
    // Biçimli metin (HTML); boş yazı olabilir (taslak).
    icerik: text().notNull().default(""),
    // Kapak görseli ve alternatif metni birlikte vardır ya da yoktur.
    kapak_kimligi: uuid().references(() => dosyalar.kimlik, { onDelete: "restrict" }),
    kapak_metni: text(),
    kategori_kimligi: uuid().references(() => blogKategorileri.kimlik, { onDelete: "restrict" }),
    // Boşsa vitrinde mağaza adı.
    yazar: text(),
    durum: text().notNull(),
    // Yayında: ilk yayınlandığı an; zamanlanmış: yayınlanacağı an; taslak: boş ya da önceki yayın anı.
    yayin_zamani: zaman(),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("blog_yazilari_adres_adi")
      .on(tablo.adres_adi)
      .where(sql`${tablo.silinme_zamani} is null`),
    index("blog_yazilari_yayin").on(tablo.durum, tablo.yayin_zamani),
    index("blog_yazilari_kategori").on(tablo.kategori_kimligi),
    index("blog_yazilari_kapak").on(tablo.kapak_kimligi),
    // Kayıtla aynı olduğunu servis testi denetler (blogYaziDurumlari).
    check("blog_yazilari_durum", sql`${tablo.durum} in ('taslak', 'zamanlanmis', 'yayinda')`),
    check(
      "blog_yazilari_yayin_zamani",
      sql`${tablo.durum} = 'taslak' or ${tablo.yayin_zamani} is not null`,
    ),
    check(
      "blog_yazilari_kapak",
      sql`(${tablo.kapak_kimligi} is null) = (${tablo.kapak_metni} is null)`,
    ),
  ],
);
