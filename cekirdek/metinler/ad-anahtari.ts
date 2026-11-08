// Adların karşılaştırma anahtarının tek tanımı (kart 0078, karar 0064): marka, etiket ve kategori adı
// tekilliğinde büyük küçük harf ve noktalı noktasız i ayrımı yapılmaz. "Şık" ile "ŞIK", "Deniz" ile
// "DENİZ" aynı addır.
//
// Standart küçük harfe çevirme "I" harfini "i", "İ" harfini "i̇" (birleşik nokta) yapar; veritabanı ve
// JavaScript bu konuda farklı sonuç verir. Bu yüzden önce İ, I ve ı harflerinin üçü de "i" yapılır,
// sonra küçültülür. Bedeli: "Kırmızı" ile "Kirmizi" de aynı ad sayılır. Kural dile bağlı değildir:
// başka dillerde I zaten i'ye küçülür.
//
// Veritabanı tarafı (tekil indeksler ve sorgular) adAnahtariSql'i kullanır; ikisi aynı sonucu verir,
// bunu cekirdek/metinler/testler/ad-anahtari.test.ts gerçek veritabanıyla denetler.
import { type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const adAnahtari = (ad: string): string => ad.replace(/[İIı]/g, "i").toLowerCase();

export const adAnahtariSql = (deger: AnyPgColumn | SQL | string): SQL =>
  sql`lower(translate(${deger}, 'İIı', 'iii'))`;
