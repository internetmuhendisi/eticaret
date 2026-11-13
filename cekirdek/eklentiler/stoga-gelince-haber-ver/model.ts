// Stoğa gelince haber ver talepleri (kart 0144, karar 0117). Müşteri tükenmiş bir birim (basit ürünün birimi ya
// da birleşim) için e-postasını bırakır; birim stoğa girince ona bir kez e-posta gider.
//
// - Aynı e-posta aynı birime bekleyen talep olarak bir kez yazılır (tekil indeks). Bildirim gittikten sonra
//   yeniden istenebilir.
// - E-posta gidince adres silinir, yalnız birim ve tarihler kalır (kullanıcı kararı): gönderilmiş talepte e-posta
//   boştur, bekleyende doludur (denetim).
// - Saklama süresi dolan talep (mağaza sahibinin ayarı) durumuna bakılmadan silinir.
// - Değişiklik kaydına girmez: mağazanın verisini değiştirmez, müşterinin kendi isteğidir.
//
// Aranan alanlar:
// - birim_kimligi, eposta (bekleyenler): aynı talep var mı ve birimin bekleyen talepleri (tekil kısmi indeks).
// - olusturma_zamani: saklama süresi dolanlar (indeksli).
import { sql } from "drizzle-orm";
import { check, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { urunBirimleri } from "../../moduller/urun/model.ts";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const stokBildirimiTalepleri = pgTable(
  "stok_bildirimi_talepleri",
  {
    kimlik: kimlik(),
    birim_kimligi: uuid()
      .notNull()
      .references(() => urunBirimleri.kimlik, { onDelete: "restrict" }),
    // Küçük harfe çevrilmiş adres (epostaSemasi). Gönderilince boşalır.
    eposta: text(),
    durum: text().notNull(),
    // Servis clock_timestamp() ile yazar: aynı işlemde yazılan taleplerde de önce gelen önce gönderilir.
    olusturma_zamani: zaman().notNull().defaultNow(),
    gonderilme_zamani: zaman(),
  },
  (tablo) => [
    // Kayıtla aynı olduğunu servis testi denetler (stokBildirimiDurumlari).
    check("stok_bildirimi_talepleri_durum", sql`${tablo.durum} in ('bekliyor', 'gonderildi')`),
    check(
      "stok_bildirimi_talepleri_eposta",
      sql`(${tablo.durum} = 'bekliyor' and ${tablo.eposta} is not null and ${tablo.gonderilme_zamani} is null) or (${tablo.durum} = 'gonderildi' and ${tablo.eposta} is null and ${tablo.gonderilme_zamani} is not null)`,
    ),
    uniqueIndex("stok_bildirimi_talepleri_bekleyen")
      .on(tablo.birim_kimligi, tablo.eposta)
      .where(sql`${tablo.durum} = 'bekliyor'`),
    index("stok_bildirimi_talepleri_zaman").on(tablo.olusturma_zamani),
  ],
);
