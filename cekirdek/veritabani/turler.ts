// Bütün tabloların ortak alan türleri (.claude/rules/veritabani.md, karar 0022).
// Tablolar kimlik, zaman ve tutar alanlarını yalnız buradan alır.
import { bigint, timestamp, uuid } from "drizzle-orm/pg-core";

// Tahmin edilemeyen benzersiz kimlik: rastgele UUID, veritabanı üretir.
export const kimlik = () => uuid().primaryKey().defaultRandom();

// Saat dilimli zaman. Gösterirken sitenin saat dilimine çevrilir (cekirdek/metinler/bicimleyici.ts).
export const zaman = () => timestamp({ withTimezone: true, mode: "date" });

// Para tutarı, para biriminin en küçük biriminde (kuruş) tam sayı (karar 0019). Tam sayı olduğu için
// yuvarlama hatası olmaz; JavaScript'te güvenli tam sayı sınırına kadar sayı olarak okunur.
export const tutar = () => bigint({ mode: "number" });

// Kimlik biçiminde bir metin mi? Dışarıdan gelen kimlik sorguya girmeden denetlenir: biçimi bozuk
// metin veritabanında beklenmeyen hataya (22P02) dönmesin, "bulunamadı" sayılsın (kart 0077).
const kimlikKalibi = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const kimlikMi = (deger: string): boolean => kimlikKalibi.test(deger);
