// İndirimdeki ürünün vitrin listesi koşulu (kart 0111, karar 0088). Ürün bölümlerinin "indirimdekiler" ve
// "fırsatlar" kaynakları ürünü bu koşulla süzer; ürün başına sorgu atılmaz.
//
// Kural gecerli.ts'teki indirimSuruyorMu ile aynıdır: indirimli fiyatı olan, başlangıcı gelmiş (boşsa hemen),
// bitişi gelmemiş (boşsa süresiz) bir fiyat. Yalnız silinmemiş birimler ve sitenin bugünkü para birimindeki
// fiyatlar sayılır (başka para birimindeki fiyat yok sayılır, gecerliFiyat). İki kuralın aynı sonucu verdiğini
// test denetler (testler/vitrin.test.ts).
//
// Kartta görünen indirim ve geri sayımın bitişi yine fiyatAraliklari'ndan gelir (gosterim.ts): orada yalnız
// satılabilir birimler sayılır. Bu koşul listeyi daraltır, kartın ne göstereceğine karar vermez.
import { type SQL, sql } from "drizzle-orm";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { birimFiyatlari } from "./model.ts";

export const indirimdekiUrunKosulu = ({
  an,
  paraBirimi,
  yalnizBitisli,
}: {
  an: Date;
  paraBirimi: string;
  // Geri sayım için: yalnız bitişi olan indirimler (kullanıcı kararı, süresiz indirim fırsatlarda görünmez).
  yalnizBitisli: boolean;
}): SQL => {
  const simdi = sql`${an.toISOString()}::timestamptz`;
  return sql`exists (
    select 1 from ${urunBirimleri}
      join ${birimFiyatlari} on ${birimFiyatlari.birim_kimligi} = ${urunBirimleri.kimlik}
    where ${urunBirimleri.urun_kimligi} = ${urunler.kimlik}
      and ${urunBirimleri.silinme_zamani} is null
      and ${birimFiyatlari.para_birimi} = ${paraBirimi}
      and ${birimFiyatlari.indirimli_fiyat} is not null
      and (${birimFiyatlari.indirim_baslangici} is null or ${birimFiyatlari.indirim_baslangici} <= ${simdi})
      and (${birimFiyatlari.indirim_bitisi} is null or ${simdi} < ${birimFiyatlari.indirim_bitisi})
      and (${!yalnizBitisli} or ${birimFiyatlari.indirim_bitisi} is not null)
  )`;
};
