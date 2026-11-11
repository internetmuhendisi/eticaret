// Ürün araması (kart 0137): aranan metnin sözcükleri, ürünün aramaya uyduğu koşul ve "en uygun" sıralamanın puanı.
// Liste, filtre, sayfa ve öteki sıralamalar vitrinin filtreli listesindendir (vitrin/urun-listesi/veri.ts); arama
// ona kapsam koşulunu ve puanı verir. Görünürlük orada uygulanır.
//
// - Harf kuralı metinler/arama-anahtari.ts'dedir: Türkçe harfler ve büyük küçük harf ayrımı yok sayılır.
// - Aranan metin sözcüklere bölünür. Her sözcük ürünün adında, markasının adında, kategorilerinden birinin adında ya
//   da bir biriminin stok kodunda geçmelidir (silinmiş marka, kategori ve birim sayılmaz).
// - "En uygun" puanı, büyükten küçüğe (testte yazılıdır, testler/arama.test.ts):
//   1. aranan metnin tamamı bir biriminin stok kodu (1000)
//   2. aranan metnin tamamı ürünün adı (500)
//   3. her sözcük için: ad sözcükle başlıyor (100) ya da adda geçiyor (50); markada geçiyor (20); bir kategoride
//      geçiyor (10); bir stok kodunda geçiyor (5)
//   Eşit puanda en yeni önce.
// - Sözcük karşılaştırması strpos ile yapılır: % ve _ gibi işaretler joker sayılmaz.
// - Arama metni ve sözcük sayısı sınırlıdır; sınırın ötesi kesilir.
import { type SQL, sql } from "drizzle-orm";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import { kategoriler, urunKategorileri } from "../kategori/model.ts";
import { markalar, urunMarkalari } from "../marka/model.ts";
import { urunBirimleri, urunler } from "./model.ts";

export const aramaSinirlari = { metin: 100, sozcuk: 8 } as const;

export type AramaSorgusu = {
  // Aranan metnin anahtarı (bütünü).
  tamami: string;
  sozcukler: readonly string[];
};

// Aranan metinden sorgu; metin boşsa ya da yalnız boşluksa sorgu yoktur.
export const aramaSorgusu = (metin: string): AramaSorgusu | undefined => {
  const tamami = aramaAnahtari(metin.slice(0, aramaSinirlari.metin));
  if (tamami === "") return undefined;
  const sozcukler = [...new Set(tamami.split(" "))].slice(0, aramaSinirlari.sozcuk);
  return { tamami, sozcukler };
};

const adda = (sozcuk: string) => sql`strpos(${aramaAnahtariSql(urunler.ad)}, ${sozcuk}) > 0`;
const markada = (sozcuk: string) => sql`exists (
  select 1 from ${urunMarkalari} join ${markalar} on ${markalar.kimlik} = ${urunMarkalari.grup_kimligi}
  where ${urunMarkalari.urun_kimligi} = ${urunler.kimlik} and ${markalar.silinme_zamani} is null
    and strpos(${aramaAnahtariSql(markalar.ad)}, ${sozcuk}) > 0)`;
const kategoride = (sozcuk: string) => sql`exists (
  select 1 from ${urunKategorileri} join ${kategoriler} on ${kategoriler.kimlik} = ${urunKategorileri.kategori_kimligi}
  where ${urunKategorileri.urun_kimligi} = ${urunler.kimlik} and ${kategoriler.silinme_zamani} is null
    and strpos(${aramaAnahtariSql(kategoriler.ad)}, ${sozcuk}) > 0)`;
const stokKodunda = (karsilastir: (anahtar: SQL) => SQL) => sql`exists (
  select 1 from ${urunBirimleri}
  where ${urunBirimleri.urun_kimligi} = ${urunler.kimlik} and ${urunBirimleri.silinme_zamani} is null
    and ${urunBirimleri.stok_kodu} is not null
    and ${karsilastir(aramaAnahtariSql(urunBirimleri.stok_kodu))})`;

// Ürünün aramaya uyduğu koşul (urunler satırı üzerinde): her sözcük bir alanda geçer.
export const aramaKosulu = (sorgu: AramaSorgusu): SQL =>
  sql.join(
    sorgu.sozcukler.map(
      (sozcuk) =>
        sql`(${adda(sozcuk)} or ${markada(sozcuk)} or ${kategoride(sozcuk)} or ${stokKodunda(
          (anahtar) => sql`strpos(${anahtar}, ${sozcuk}) > 0`,
        )})`,
    ),
    sql` and `,
  );

// "En uygun" sıralamanın puanı (büyük önce).
export const uygunlukPuani = (sorgu: AramaSorgusu): SQL => {
  const sozcukPuanlari = sorgu.sozcukler.map(
    (sozcuk) => sql`(case
      when starts_with(${aramaAnahtariSql(urunler.ad)}, ${sozcuk}) then 100
      when ${adda(sozcuk)} then 50 else 0 end)
    + (case when ${markada(sozcuk)} then 20 else 0 end)
    + (case when ${kategoride(sozcuk)} then 10 else 0 end)
    + (case when ${stokKodunda((anahtar) => sql`strpos(${anahtar}, ${sozcuk}) > 0`)} then 5 else 0 end)`,
  );
  return sql`((case when ${stokKodunda((anahtar) => sql`${anahtar} = ${sorgu.tamami}`)} then 1000 else 0 end)
    + (case when ${aramaAnahtariSql(urunler.ad)} = ${sorgu.tamami} then 500 else 0 end)
    + ${sql.join(sozcukPuanlari, sql` + `)})`;
};
