// Ürünün ilgili ürünleri (kart 0079, karar 0065).
//
// Elle seçim ürün girdisinin `ilgiliUrunler` alanıyla ürün servisinden yazılır (servis.ts); seçim
// sırası tutulur. Vitrinde gösterilecek liste yalnız `ilgiliUrunleriGetir` ile bulunur:
// - Elle seçilenlerden vitrin listelerinde görünenler, seçim sırasıyla.
// - Onlardan hiçbiri görünmüyorsa (seçim yoksa da) ürünün kategorilerindeki öteki görünen ürünler, en
//   yeni önce (kullanıcı kararları).
// - En çok ilgiliUrunSiniri kadar (kullanıcı kararı). Elle seçilenlerin bir kısmı görünüyorsa liste
//   kategoriden tamamlanmaz.
// Görünürlük ürünün tek vitrin koşuluyladır (vitrin.ts, liste yeri): taslak, gizli, arşiv, zamanı
// gelmemiş ve silinmiş ürün girmez. Ürünün kendisi hiçbir zaman girmez. Ürünün kendi sayfası vitrinde
// açılmıyorsa (taslak, arşiv, silinmiş) liste boştur (kart 0079 kontrolü).
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { kategoriler, urunKategorileri } from "../kategori/model.ts";
import { urunIlgilileri, urunler } from "./model.ts";
import type { UrunHatasi } from "./semalar.ts";
import { type VitrinSecenekleri, vitrinKosulu } from "./vitrin.ts";

// Ürün sayfasında en çok kaç ilgili ürün görünür (kullanıcı kararı, karar 0065).
export const ilgiliUrunSiniri = 4;

// Ürünün elle seçtiği ilgili ürünler, seçim sırasıyla. Sonradan silinen ürün listede görünmez.
export const secilenIlgililer = async (
  vt: Veritabani | VeritabaniIslemi,
  urun: string,
): Promise<string[]> =>
  (
    await vt
      .select({ kimlik: urunIlgilileri.ilgili_kimligi })
      .from(urunIlgilileri)
      .innerJoin(urunler, eq(urunler.kimlik, urunIlgilileri.ilgili_kimligi))
      .where(and(eq(urunIlgilileri.urun_kimligi, urun), isNull(urunler.silinme_zamani)))
      .orderBy(asc(urunIlgilileri.sira))
  ).map((satir) => satir.kimlik);

// Seçim geçerli mi? Ürün kendisini seçemez, seçilenler var ve silinmemiş olmalı. Ürün yazmaları ürün
// kilidi altında olduğu için seçilen ürün bu arada silinemez.
export const ilgiliSecimHatasi = async (
  islem: VeritabaniIslemi,
  urun: string,
  liste: string[],
): Promise<UrunHatasi | undefined> => {
  if (liste.includes(urun)) return "ilgili-kendisi";
  if (liste.length === 0) return undefined;
  const bulunan = await islem
    .select({ kimlik: urunler.kimlik })
    .from(urunler)
    .where(and(inArray(urunler.kimlik, liste), isNull(urunler.silinme_zamani)));
  return bulunan.length === liste.length ? undefined : "ilgili-gecersiz";
};

// Seçimi baştan yazar: eski satırlar (sonradan silinen ürünlerinki de) kalkar, yeni liste sırasıyla
// girer.
export const ilgilileriYaz = async (
  islem: VeritabaniIslemi,
  urun: string,
  liste: string[],
): Promise<void> => {
  await islem.delete(urunIlgilileri).where(eq(urunIlgilileri.urun_kimligi, urun));
  if (liste.length === 0) return;
  await islem
    .insert(urunIlgilileri)
    .values(liste.map((ilgili, sira) => ({ urun_kimligi: urun, ilgili_kimligi: ilgili, sira })));
};

// Vitrindeki ilgili ürünler tek sorguyla (kural yukarıda). Seçenekler vitrin koşulununkidir: an ve
// tükenen ürün ayarı (kart 0083; "gizle"de tükenmiş ürün listeye girmez).
export const ilgiliUrunleriGetir = async (
  vt: Veritabani,
  urun: string,
  secenekler: VitrinSecenekleri,
): Promise<string[]> => {
  if (!kimlikMi(urun)) return [];
  const gorunur = vitrinKosulu("liste", secenekler);
  const sayfasiAcik = vitrinKosulu("sayfa", secenekler);
  const sonuc = await vt.execute<{ kimlik: string }>(sql`
    with kaynak as (
      select 1 from ${urunler} where ${urunler.kimlik} = ${urun}::uuid and ${sayfasiAcik}
    ),
    elle as (
      select ${urunler.kimlik} as kimlik, ${urunIlgilileri.sira} as sira
      from ${urunIlgilileri} join ${urunler} on ${urunler.kimlik} = ${urunIlgilileri.ilgili_kimligi}
      where ${urunIlgilileri.urun_kimligi} = ${urun}::uuid and ${urunler.kimlik} <> ${urun}::uuid
        and ${gorunur} and exists (select 1 from kaynak)
      order by ${urunIlgilileri.sira}
      limit ${ilgiliUrunSiniri}
    ),
    -- Elle seçilenlerden biri görünüyorsa boştur: iki kaynak aynı listede hiç birleşmez.
    kategoriden as (
      select ${urunler.kimlik} as kimlik,
        row_number() over (order by ${urunler.olusturma_zamani} desc, ${urunler.kimlik}) as sira
      from ${urunler}
      where ${urunler.kimlik} <> ${urun}::uuid and ${gorunur}
        and exists (select 1 from kaynak) and not exists (select 1 from elle)
        and exists (
          select 1 from ${urunKategorileri}
          where ${urunKategorileri.urun_kimligi} = ${urunler.kimlik}
            and ${urunKategorileri.kategori_kimligi} in (
              select kendi.kategori_kimligi from ${urunKategorileri} as kendi
              join ${kategoriler} on ${kategoriler.kimlik} = kendi.kategori_kimligi
              where kendi.urun_kimligi = ${urun}::uuid and ${kategoriler.silinme_zamani} is null
            )
        )
      order by ${urunler.olusturma_zamani} desc, ${urunler.kimlik}
      limit ${ilgiliUrunSiniri}
    )
    select kimlik from (
      select kimlik, sira from elle
      union all
      select kimlik, sira from kategoriden
    ) as liste
    order by sira`);
  return sonuc.rows.map((satir) => satir.kimlik);
};
