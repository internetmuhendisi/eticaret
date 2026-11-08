// Ürün listesinin tek sorgusu (kart 0077, 0078): kategori, marka ve etiketin ürünleri buradan gelir.
// Çağıran yalnız ürünü süzen koşulu verir (bağlantı tablosu üzerinde exists); görünürlük, sayfa ve
// toplam sayı burada eklenir. Silinmiş ürün gelmez. Sıra en yeni önce (elle sıralama vitrin yönetimiyle
// gelir). Sayfa sonun ötesindeyse liste boş ve toplam 0 döner.
import { type SQL, sql } from "drizzle-orm";
import { listeSayfasi } from "../../kayitlar/liste.ts";
import type { VitrinYeri } from "../../kayitlar/urun.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { urunler } from "./model.ts";
import { vitrinKosulu } from "./vitrin.ts";

export type UrunListesiSecenekleri = {
  // Verilirse yalnız vitrinde bu yerde görünen ürünler gelir (vitrin.ts). Verilmezse silinmemiş bütün
  // ürünler gelir (panel).
  vitrin?: { yer: VitrinYeri; an?: Date };
  sayfa?: number;
  boyut?: number;
};

export type UrunListesi = { urunler: string[]; toplam: number };
export const bosUrunListesi = (): UrunListesi => ({ urunler: [], toplam: 0 });

export const urunListesi = async (
  vt: Veritabani,
  filtre: SQL,
  { vitrin, sayfa = 1, boyut = listeSayfasi.varsayilanBoyut }: UrunListesiSecenekleri = {},
): Promise<UrunListesi> => {
  const sinirliBoyut = Math.min(Math.max(Math.trunc(boyut), 1), listeSayfasi.enCokBoyut);
  const ofset = (Math.max(Math.trunc(sayfa), 1) - 1) * sinirliBoyut;
  const gorunurluk: SQL = vitrin === undefined ? sql`true` : vitrinKosulu(vitrin.yer, vitrin.an);
  const sonuc = await vt.execute<{ kimlik: string; toplam: string }>(sql`
    select ${urunler.kimlik} as kimlik, count(*) over () as toplam
    from ${urunler}
    where ${urunler.silinme_zamani} is null and ${filtre} and ${gorunurluk}
    order by ${urunler.olusturma_zamani} desc, ${urunler.kimlik}
    limit ${sinirliBoyut} offset ${ofset}`);
  return {
    urunler: sonuc.rows.map((satir) => satir.kimlik),
    toplam: Number(sonuc.rows[0]?.toplam ?? 0),
  };
};
