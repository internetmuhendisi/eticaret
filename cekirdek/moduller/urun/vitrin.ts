// Bir ürünün vitrinde görünüp görünmediğini bulan tek koşul (kart 0076, karar 0062). Vitrin sayfası,
// listeler, arama ve site haritası ürünü yalnız bu koşulla süzer.
//
// Koşul durum tablosundan (cekirdek/kayitlar/urun.ts) kurulur: hangi durumun nerede göründüğü orada
// yazar, burada durum adı elle yazılmaz. Silinmiş ürün hiçbir yerde görünmez. Zamanlanmış ürün
// yayın zamanı geldiği anda görünür; durumu değiştiren bir iş gerekmez.
import { and, inArray, isNull, lte, or, type SQL, sql } from "drizzle-orm";
import { urunDurumlari, urunDurumVitrini, type VitrinYeri } from "../../kayitlar/urun.ts";
import { urunler } from "./model.ts";

// an verilmezse veritabanının şimdiki zamanı kullanılır: sunucuların saati farklı olsa da sonuç aynıdır.
export const vitrinKosulu = (yer: VitrinYeri, an?: Date): SQL => {
  const simdi = an === undefined ? sql`now()` : sql`${an.toISOString()}::timestamptz`;
  const gorunen = urunDurumlari.filter((durum) => urunDurumVitrini[durum][yer]);
  const herZaman = gorunen.filter((durum) => !urunDurumVitrini[durum].zamanli);
  const zamanli = gorunen.filter((durum) => urunDurumVitrini[durum].zamanli);
  const kosul = and(
    isNull(urunler.silinme_zamani),
    or(
      herZaman.length > 0 ? inArray(urunler.durum, herZaman) : sql`false`,
      zamanli.length > 0
        ? and(inArray(urunler.durum, zamanli), lte(urunler.yayin_zamani, simdi))
        : sql`false`,
    ),
  );
  if (kosul === undefined) throw new Error("Vitrin koşulu kurulamadı.");
  return kosul;
};
