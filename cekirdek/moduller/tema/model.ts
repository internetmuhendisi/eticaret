// Sitenin tema sürümleri (kart 0105). Mağaza sahibinin seçtiği tema ve tema ayarları her yayında yeni bir
// sürüm olarak yazılır; en büyük sıradaki sürüm vitrinde geçerlidir. Satırlar sonradan değiştirilemez ve
// silinemez (tetikleyici, değişiklik dosyası 0024): önceki bir sürüme dönmek, onun kopyasını yeni sürüm
// olarak yazmaktır, geçmiş kaybolmaz.
//
// Aranan alanlar:
// - sira: tekil indeksli; son sürüm ve sürüm listesi buradan okunur.
import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const temaSurumleri = pgTable(
  "tema_surumleri",
  {
    kimlik: kimlik(),
    // 1'den başlayıp birer artar. İlk sürüm sitenin başlangıç değeridir.
    sira: integer().notNull(),
    // Temanın kodu (hazır ya da siteye özel tema).
    tema: text().notNull(),
    // Mağaza sahibinin tema ayarları (cekirdek/temalar/ayarlar.ts).
    ayarlar: jsonb().notNull(),
    // Bu sürüm önceki bir sürüme dönüşse o sürümün sırası.
    geri_donulen_sira: integer(),
    // Bu sürüm yazılmadan hemen önce geçerli olan düzen sürümünün sırası (kart 0113). Bir sürüm geçerliyken
    // düzenin son hâli, bir sonraki tema sürümünün bu alanıdır: tema kodu değişen geri dönüş düzeni oradan
    // getirir. Kart 0113'ten önce yazılan sürümlerde boştur.
    onceki_duzen_sira: integer(),
    zaman: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    uniqueIndex("tema_surumleri_sira").on(tablo.sira),
    check("tema_surumleri_sira_pozitif", sql`${tablo.sira} > 0`),
    check(
      "tema_surumleri_geri_donulen",
      sql`${tablo.geri_donulen_sira} is null or (${tablo.geri_donulen_sira} > 0 and ${tablo.geri_donulen_sira} < ${tablo.sira})`,
    ),
    check(
      "tema_surumleri_onceki_duzen",
      sql`${tablo.onceki_duzen_sira} is null or ${tablo.onceki_duzen_sira} > 0`,
    ),
  ],
);
