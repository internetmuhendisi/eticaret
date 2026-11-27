// Ürün raporu (kart 0318, karar 0196): dönemde satılan ürünler ve birleşimleri. Sayma kuralı raporların ortak kuralıdır
// (kural.ts): satış ödeme gününde, iade tamamlandığı günde.
//
// - Adet ve tutar dönemde satış sayılan siparişlerin kalemleridir. Tutar kalemin sipariş anındaki tutarıdır, kupon payı
//   düşülmez (karar 0185, taslak).
// - İade adedi dönemde tamamlanan iadelerin kalemleridir (satış başka dönemde olabilir).
// - Ad ve seçim kalemin sipariş anındaki adıdır (dönemdeki en son satış ya da iade); ürün sonradan silinse de adıyla
//   görünür. Silinmiş ürün işaretlidir.
// - Birleşim, ürünün birimidir: seçenekli üründe her birleşim kendi satırıdır, basit üründe birleşim satırı yoktur.
// - Sıra: tutar ya da adet, büyükten küçüğe; eşitte ad.
import { sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { donemAnlari, type GunAraligi } from "./donem.ts";
import { iadeKosulu, satisKosulu } from "./kural.ts";

type Vt = Veritabani | VeritabaniIslemi;

export const urunRaporuSiralamalari = ["tutar", "adet"] as const;
export type UrunRaporuSiralamasi = (typeof urunRaporuSiralamalari)[number];

export type UrunRaporuSayilari = { adet: number; tutar: number; iadeAdedi: number };
export type UrunRaporuBirlesimi = UrunRaporuSayilari & {
  birim: string;
  secim: { secenek: string; deger: string }[];
};
export type UrunRaporuSatiri = UrunRaporuSayilari & {
  urun: string;
  ad: string;
  silindi: boolean;
  // Yalnız seçenekli üründe.
  birlesimler: UrunRaporuBirlesimi[];
};

const sayi = (deger: unknown): number => Number(deger ?? 0);

export const urunRaporu = (site: Site) => {
  const { paraBirimi, saatDilimi } = site.ayarlar;
  const { adKarsilastir } = siteninBicimleyicisi(site.ayarlar);

  const satirlar = async (
    vt: Vt,
    donem: GunAraligi,
    siralama: UrunRaporuSiralamasi,
  ): Promise<UrunRaporuSatiri[]> => {
    const { bas, son } = donemAnlari(donem, saatDilimi);
    const { rows } = await vt.execute<{
      urun: string;
      birim: string;
      adet: string;
      tutar: string;
      iade: string;
      ad: string;
      secim: { secenek: string; deger: string }[];
      silindi: boolean;
      son: string;
    }>(sql`
      with satislar as (
        select k.urun_kimligi as urun, k.birim_kimligi as birim, k.adet, k.tutar, 0 as iade,
          k.urun_adi as ad, k.secim, s.odeme_zamani as an
        from siparis_kalemleri k
        join siparisler s on s.kimlik = k.siparis_kimligi
        where ${satisKosulu(paraBirimi, bas, son)}
        union all
        select k.urun_kimligi, k.birim_kimligi, 0, 0, (e->>'adet')::int,
          k.urun_adi, k.secim, i.sonuc_zamani
        from siparis_iadeleri i
        join siparisler s on s.kimlik = i.siparis_kimligi
        cross join lateral jsonb_array_elements(i.kalemler) e
        join siparis_kalemleri k on k.siparis_kimligi = i.siparis_kimligi and k.sira = (e->>'sira')::int
        where ${iadeKosulu(paraBirimi, bas, son)}
      )
      select t.urun, t.birim, sum(t.adet) as adet, sum(t.tutar) as tutar, sum(t.iade) as iade,
        (array_agg(t.ad order by t.an desc))[1] as ad,
        (array_agg(t.secim order by t.an desc))[1] as secim,
        max(t.an) as son,
        coalesce(u.silinme_zamani is not null, true) as silindi
      from satislar t
      left join urunler u on u.kimlik = t.urun
      group by t.urun, t.birim, u.silinme_zamani`);
    // Ürünün adı dönemdeki en son satış ya da iadedeki addır: en son satırı olan birleşimin adı.
    const urunler = new Map<string, UrunRaporuSatiri>();
    const sonAn = new Map<string, number>();
    for (const satir of rows) {
      const an = new Date(satir.son).getTime();
      if (an >= (sonAn.get(satir.urun) ?? Number.NEGATIVE_INFINITY)) {
        sonAn.set(satir.urun, an);
        const var_ = urunler.get(satir.urun);
        if (var_ !== undefined) var_.ad = satir.ad;
      }
      const birlesim: UrunRaporuBirlesimi = {
        birim: satir.birim,
        secim: satir.secim,
        adet: sayi(satir.adet),
        tutar: sayi(satir.tutar),
        iadeAdedi: sayi(satir.iade),
      };
      const urun = urunler.get(satir.urun) ?? {
        urun: satir.urun,
        ad: satir.ad,
        silindi: satir.silindi,
        adet: 0,
        tutar: 0,
        iadeAdedi: 0,
        birlesimler: [],
      };
      urun.adet += birlesim.adet;
      urun.tutar += birlesim.tutar;
      urun.iadeAdedi += birlesim.iadeAdedi;
      urun.birlesimler.push(birlesim);
      urunler.set(satir.urun, urun);
    }
    const karsilastir = (a: UrunRaporuSayilari & { ad: string }, b: typeof a) =>
      (siralama === "tutar"
        ? b.tutar - a.tutar || b.adet - a.adet
        : b.adet - a.adet || b.tutar - a.tutar) || adKarsilastir(a.ad, b.ad);
    return [...urunler.values()]
      .map((urun) => ({
        ...urun,
        birlesimler: urun.birlesimler.some((b) => b.secim.length > 0)
          ? urun.birlesimler.toSorted((a, b) =>
              karsilastir(
                { ...a, ad: a.secim.map((s) => s.deger).join(" ") },
                { ...b, ad: b.secim.map((s) => s.deger).join(" ") },
              ),
            )
          : [],
      }))
      .toSorted(karsilastir);
  };

  return { satirlar };
};
