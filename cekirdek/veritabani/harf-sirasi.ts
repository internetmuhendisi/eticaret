// Sitenin dilinin veritabanındaki harf sırası (kart 0262'de ürün listesi için yazıldı, kart 0267'de ortak yere
// taşındı): ada göre sıralamada Ç, C'den sonra; ı, i'den önce gelir. Dil koda sabit yazılmaz (site ayarı).
import { sql } from "drizzle-orm";
import type { Veritabani } from "./baglanti.ts";

// Dilin ICU harf sırası: "tr-TR" için "tr-x-icu". Veritabanında yoksa dilden bağımsız Unicode sırası ("und-x-icu").
// Ad sorguya tırnaklı tanımlayıcı olarak girer (sql.identifier).
export const harfSirasi = async (vt: Veritabani, dil: string): Promise<string> => {
  const birincil = dil.split("-")[0]?.toLowerCase() ?? "";
  if (!/^[a-z]{2,3}$/.test(birincil)) return "und-x-icu";
  const ad = `${birincil}-x-icu`;
  const bulunan = await vt.execute(sql`select 1 from pg_collation where collname = ${ad}`);
  return bulunan.rows.length > 0 ? ad : "und-x-icu";
};
