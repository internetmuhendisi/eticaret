// Müşteri ürünü satın aldı mı (kart 0139, 0234; karar 0109, 0145). "Yalnız satın alanlar yorum yapabilir" ayarı ve
// "Doğrulanmış alıcı" işareti yalnız bunu sorar. Müşterinin o ürünü içeren ve satın alma sayılan durumdaki
// (satinAlmaDurumlari: teslim edildi ya da kısmen iade edildi) bir siparişi varsa satın almıştır; kargodaki,
// iptal edilen ve tamamen iade edilen sipariş sayılmaz. Kısmi iadede ürünün kendisinin iadesi kart 0235'te bağlanır.
import { and, eq, inArray, sql } from "drizzle-orm";
import { satinAlmaDurumlari } from "../../kayitlar/siparis.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt } from "../../veritabani/kimlik.ts";
import { siparisKalemleri, siparisler } from "../siparis/model.ts";

export const satinAldiMi = async (
  vt: Veritabani | VeritabaniIslemi,
  musteri: string,
  urun: string,
): Promise<boolean> => {
  const [satir] = await vt
    .select({ var: sql<number>`1` })
    .from(siparisKalemleri)
    .innerJoin(siparisler, eq(siparisler.kimlik, siparisKalemleri.siparis_kimligi))
    .where(
      and(
        eq(siparisler.musteri_kimligi, kimligiDuzelt(musteri)),
        eq(siparisKalemleri.urun_kimligi, kimligiDuzelt(urun)),
        inArray(siparisler.durum, [...satinAlmaDurumlari]),
      ),
    )
    .limit(1);
  return satir !== undefined;
};
