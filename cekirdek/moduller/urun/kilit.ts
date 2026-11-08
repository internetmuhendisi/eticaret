// Ürün yazmalarının işlem kilidi (kart 0076; kart 0078 kontrolü). Ürün servisi her yazmada alır.
//
// Birden çok grup satırını güncelleyen başka bir iş (kategori silme: kategoriyi ve alt kategorilerini
// günceller) de satırlara dokunmadan önce bu kilidi alır. Yoksa ürün değişikliği grup satırlarını bir
// sırayla paylaşımlı kilitlerken silme onları başka bir sırayla güncelleyebilir; iki işlem birbirini
// bekleyip kilitlenir (deadlock). Kilit kategori kilidinden sonra alınır: ürün servisi kategori kilidini
// hiç almaz, sıra hep aynıdır.
import { sql } from "drizzle-orm";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";

export const urunKilidiAl = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext('urun'))`);
