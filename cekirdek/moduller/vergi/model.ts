// Vergi sınıfları ve oran tablosu (kart 0074, karar 0060). Yapı ülkeye bağlı değildir: sınıfları,
// oranları ve adları site tanımlar. İlk değerler sitenin başlangıç verisinden bir kez yazılır (servis.ts).
//
// Silme silinme işaretiyle yapılır, satır kalır: silinmiş sınıfa bağlı ürün sınıfsız kalmaz, vergisi
// başka bir sınıfa geçirilene kadar o sınıfın oranlarıyla hesaplanır. Silinmiş sınıfa oran eklenmez,
// sınıf ve oranları değiştirilmez. Silinmiş sınıfın oranları kendiliğinden silinmez.
//
// Aranan alanlar:
// - vergi_siniflari.ad: silinmemiş sınıflar arasında tekildir (kısmi tekil indeks). Sınıflar ayrıca
//   hep birlikte okunur, sitede en çok onlarca sınıf olur.
// - vergi_oranlari.sinif_kimligi: bir sınıfın oranları okunurken ve vergi hesabında (kart 0075).
//   Bölge alanları (ulke, il, posta_kodu) sınıfın birkaç satırı içinde süzülür, ayrı indeks gerekmez.
import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const vergiSiniflari = pgTable(
  "vergi_siniflari",
  {
    kimlik: kimlik(),
    ad: text().notNull(),
    // Ekranda ve seçim listelerinde sıra; küçük önce.
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("vergi_siniflari_ad").on(tablo.ad).where(sql`${tablo.silinme_zamani} is null`),
  ],
);

export const vergiOranlari = pgTable(
  "vergi_oranlari",
  {
    kimlik: kimlik(),
    sinif_kimligi: uuid()
      .notNull()
      .references(() => vergiSiniflari.kimlik, { onDelete: "restrict" }),
    // Bölge: ülke kodu (ISO 3166-1), isteğe bağlı il kodu (ISO 3166-2) ve posta kodu (cekirdek/bolgeler/).
    ulke: text().notNull(),
    il: text(),
    posta_kodu: text(),
    // Milyonda bir biriminde oran: %18 = 180000 (semalar.ts). Küsuratlı sayı kullanılmaz.
    oran_milyonda: integer().notNull(),
    // Boşsa mağazanın vergi adı (vergiAdi ayarı) kullanılır.
    ad: text(),
    // Aynı bölgedeki oranların dökümdeki sırası; küçük önce.
    sira: integer().notNull().default(0),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    index("vergi_oranlari_sinif").on(tablo.sinif_kimligi),
    check(
      "vergi_oranlari_oran_siniri",
      sql`${tablo.oran_milyonda} >= 0 and ${tablo.oran_milyonda} <= 1000000`,
    ),
  ],
);
