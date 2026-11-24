// Blog yazısının vitrinde görünme koşulu (kart 0272, karar 0176): silinmemiş ve yayında ya da yayın zamanı gelmiş
// zamanlanmış yazı. Vitrinin listesi, yazı sayfası, adres çözümü, ana sayfanın blog bölümü ve vitrin görseli ucu
// yalnız bunu kullanır. Blogun açık olup olmadığı (site ayarı blogAcik) bu koşulun dışındadır: sayfa ve bağlam ayarı
// ayrıca okur.
import { and, eq, isNull, lte, or, type SQL, sql } from "drizzle-orm";
import { blogYazilari } from "./model.ts";

export const blogYazisiVitrinde = (an?: Date): SQL => {
  const simdi = an === undefined ? sql`now()` : sql`${an.toISOString()}::timestamptz`;
  const kosul = and(
    isNull(blogYazilari.silinme_zamani),
    or(
      eq(blogYazilari.durum, "yayinda"),
      and(eq(blogYazilari.durum, "zamanlanmis"), lte(blogYazilari.yayin_zamani, simdi)),
    ),
  );
  if (kosul === undefined) throw new Error("Blog koşulu kurulamadı.");
  return kosul;
};
