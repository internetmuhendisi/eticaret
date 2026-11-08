// Ürünün kategori, marka ve etiket bağlantıları (kart 0077, 0078). Üçü aynı kurallarla okunur ve
// yazılır; burada tek tanımdan yürür, ürün servisi (servis.ts) her biri için aynı işlevleri çağırır.
//
// - Yalnız silinmemiş gruba bağlanılır. Grup satırları paylaşımlı kilitle okunur: aynı anda silinen grup
//   bitene kadar beklenir, sonra silinmiş görülür.
// - Değişecek ürünün mevcut bağlantıları da paylaşımlı kilitle okunur: aynı anda silinen grup listeye
//   girmez, kayda bağlıymış gibi yazılmaz.
// - Marka tekildir: bağlantı tablosunun birincil anahtarı üründür, ürün kaydında tek kimlik durur.
import { inArray, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { etiketler, urunEtiketleri } from "../etiket/model.ts";
import { kategoriler, urunKategorileri } from "../kategori/model.ts";
import { markalar, urunMarkalari } from "../marka/model.ts";
import type { UrunHatasi } from "./semalar.ts";

type BaglantiTanimi = {
  // Ürün kaydındaki ve girdideki alan.
  alan: "kategoriler" | "marka" | "etiketler";
  grup: { kimlik: PgColumn; silinme: PgColumn };
  grupTablosu: typeof kategoriler | typeof markalar | typeof etiketler;
  baglanti: typeof urunKategorileri | typeof urunMarkalari | typeof urunEtiketleri;
  urunSutunu: PgColumn;
  grupSutunu: PgColumn;
  // Silinmiş ya da olmayan gruba bağlanmak istenince dönen kod.
  hata: UrunHatasi;
};

const tanim = (
  alan: BaglantiTanimi["alan"],
  grupTablosu: BaglantiTanimi["grupTablosu"],
  baglanti: BaglantiTanimi["baglanti"],
  grupSutunu: PgColumn,
  hata: UrunHatasi,
): BaglantiTanimi => ({
  alan,
  grup: { kimlik: grupTablosu.kimlik, silinme: grupTablosu.silinme_zamani },
  grupTablosu,
  baglanti,
  urunSutunu: baglanti.urun_kimligi,
  grupSutunu,
  hata,
});

export const baglantiTanimlari: readonly BaglantiTanimi[] = [
  tanim(
    "kategoriler",
    kategoriler,
    urunKategorileri,
    urunKategorileri.kategori_kimligi,
    "kategori-gecersiz",
  ),
  tanim("marka", markalar, urunMarkalari, urunMarkalari.grup_kimligi, "marka-gecersiz"),
  tanim("etiketler", etiketler, urunEtiketleri, urunEtiketleri.grup_kimligi, "etiket-gecersiz"),
];

const kimlikler = (satirlar: { kimlik: string }[]) =>
  satirlar.map((satir) => satir.kimlik).toSorted();

// Ürünün bağlı grupları, sıralı. Grup silinince bağlantı kalktığı için hepsi silinmemiştir.
export const bagliGruplar = async (
  vt: Veritabani | VeritabaniIslemi,
  t: BaglantiTanimi,
  urun: string,
): Promise<string[]> =>
  kimlikler(
    (
      await vt.execute<{ kimlik: string }>(
        sql`select ${t.grupSutunu} as kimlik from ${t.baglanti} where ${t.urunSutunu} = ${urun}::uuid`,
      )
    ).rows,
  );

// Değişecek ürünün bağlı grupları; grup satırları paylaşımlı kilitlenir.
export const kilitliBagliGruplar = async (
  islem: VeritabaniIslemi,
  t: BaglantiTanimi,
  urun: string,
): Promise<string[]> =>
  kimlikler(
    (
      await islem.execute<{ kimlik: string }>(sql`
        select ${t.grupSutunu} as kimlik from ${t.baglanti}
        join ${t.grupTablosu} on ${t.grup.kimlik} = ${t.grupSutunu}
        where ${t.urunSutunu} = ${urun}::uuid and ${t.grup.silinme} is null
        for share of ${t.grupTablosu}`)
    ).rows,
  );

// Bağlanacak gruplar var ve silinmemiş mi? Satırlar paylaşımlı kilitlenir.
export const gruplarGecerliMi = async (
  islem: VeritabaniIslemi,
  t: BaglantiTanimi,
  eklenecek: string[],
): Promise<boolean> => {
  if (eklenecek.length === 0) return true;
  const bulunan = await islem.execute(sql`
    select ${t.grup.kimlik} as kimlik from ${t.grupTablosu}
    where ${inArray(t.grup.kimlik, eklenecek)} and ${t.grup.silinme} is null
    for share`);
  return bulunan.rows.length === eklenecek.length;
};

export const gruplariBagla = async (
  islem: VeritabaniIslemi,
  t: BaglantiTanimi,
  urun: string,
  eklenecek: string[],
): Promise<void> => {
  if (eklenecek.length === 0) return;
  await islem.execute(sql`
    insert into ${t.baglanti} (${sql.identifier(t.urunSutunu.name)}, ${sql.identifier(t.grupSutunu.name)})
    values ${sql.join(
      eklenecek.map((grup) => sql`(${urun}::uuid, ${grup}::uuid)`),
      sql`, `,
    )}`);
};

export const gruplariKaldir = async (
  islem: VeritabaniIslemi,
  t: BaglantiTanimi,
  urun: string,
  kalkacak: string[],
): Promise<void> => {
  if (kalkacak.length === 0) return;
  await islem.execute(sql`
    delete from ${t.baglanti}
    where ${t.urunSutunu} = ${urun}::uuid and ${inArray(t.grupSutunu, kalkacak)}`);
};
