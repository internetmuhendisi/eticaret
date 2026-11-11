// Aramanın harf kuralının tek tanımı (kart 0137): müşteri Türkçe harfleri yazmadan ve büyük küçük harf gözetmeden
// arar. "gomlek" "Gömlek"i, "SISLI" "Şişli"yi bulur. Aranan metin ve ürünün alanları aynı kuralla çevrilir.
//
// Kural: aşağıdaki tablodaki harfler karşılığına çevrilir, sonra küçük harfe inilir. Çevirme küçültmeden önce
// yapılır: veritabanının harf ayarı Türkçe olsa da "I" "ı"ya inmez. Tablo hem uygulamanın (aramaAnahtari) hem
// veritabanının (aramaAnahtariSql) kuralıdır; ikisinin her harfte aynı sonucu verdiği gerçek veritabanıyla
// test edilir (testler/arama-anahtari.test.ts). Tablo dışındaki harfler yalnız küçültülür; uygulama ile
// veritabanının küçültmesi bazı harflerde ayrışabilir (ad-anahtari.ts), aranan sözcük bu yüzden yalnız
// veritabanında karşılaştırılır.
//
// Ad tekilliğinin kuralı (ad-anahtari.ts) bundan farklıdır: orada "Şal" ile "Sal" iki ayrı addır, aramada
// aynıdır.
import { type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const aramaHarfleri: readonly (readonly [string, string])[] = [
  ["ı", "i"],
  ["İ", "i"],
  ["I", "i"],
  ["ş", "s"],
  ["Ş", "s"],
  ["ğ", "g"],
  ["Ğ", "g"],
  ["ü", "u"],
  ["Ü", "u"],
  ["ö", "o"],
  ["Ö", "o"],
  ["ç", "c"],
  ["Ç", "c"],
  ["â", "a"],
  ["Â", "a"],
  ["î", "i"],
  ["Î", "i"],
  ["û", "u"],
  ["Û", "u"],
];

const kaynak = aramaHarfleri.map(([harf]) => harf).join("");
const hedef = aramaHarfleri.map(([, karsilik]) => karsilik).join("");
const karsiliklar = new Map(aramaHarfleri);

// Aranan metnin anahtarı: birleşik yazılışa (NFC) indirilir, tablo uygulanır, küçültülür, boşluklar teke iner.
export const aramaAnahtari = (metin: string): string =>
  [...metin.normalize("NFC")]
    .map((harf) => karsiliklar.get(harf) ?? harf)
    .join("")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Alanın veritabanındaki anahtarı. Kayıtlar NFC biçimindedir (kayitMetni).
export const aramaAnahtariSql = (deger: AnyPgColumn | SQL): SQL =>
  sql`lower(translate(${deger}, ${kaynak}, ${hedef}))`;
