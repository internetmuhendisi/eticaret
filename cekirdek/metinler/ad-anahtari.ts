// Adların karşılaştırma anahtarının tek tanımı (kart 0078, karar 0064): marka, etiket ve kategori adı
// tekilliğinde büyük küçük harf ve noktalı noktasız i ayrımı yapılmaz. "Şık" ile "ŞIK", "Deniz" ile
// "DENİZ" aynı addır.
//
// Standart küçük harfe çevirme "I" harfini "i", "İ" harfini birleşik noktalı i yapar. Bu yüzden önce İ,
// I ve ı harflerinin üçü de "i" yapılır, sonra küçültülür. Bedeli: "Kırmızı" ile "Kirmizi" de aynı ad
// sayılır. Kural dile bağlı değildir: başka dillerde I zaten i'ye küçülür.
//
// Anahtar yalnız veritabanında hesaplanır (tekil indeksler ve tekillik sorguları aynı ifadeyi
// kullanır). Uygulama kendi küçültmesiyle karşılaştırma yapmaz: JavaScript ile veritabanı bazı harfleri
// (örneğin Yunancadaki kelime sonu sigma) farklı küçültür (kart 0078 kontrolü). Ad değişince tekillik
// her zaman veritabanında aranır. Adlar kayda girmeden NFC biçimine çevrilir (kayitMetni): aynı görünen
// iki yazılış aynı addır.
import { type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const adAnahtariSql = (deger: AnyPgColumn | SQL | string): SQL =>
  sql`lower(translate(${deger}, 'İIı', 'iii'))`;
