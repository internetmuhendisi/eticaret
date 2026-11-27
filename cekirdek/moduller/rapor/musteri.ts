// Müşteri raporu (kart 0318, karar 0196). Sayma kuralı raporların ortak kuralıdır (kural.ts): sipariş ödeme gününde
// sayılır.
//
// - Yeni müşteri: dönemde satış sayılan siparişi olan ve ondan önce hiç ödenmiş siparişi olmayan üye. Dönen müşteri:
//   dönemde siparişi olan ve dönemden önce de ödenmiş siparişi olan üye. İkisinin toplamı dönemde alışveriş yapan
//   üyelerdir.
// - Üye olmadan verilen siparişler yalnız sayılır, kişi olarak listelenmez.
// - En çok alışveriş yapanlar: üyeler, dönemdeki satışlarının toplamıyla (iade düşülmez), büyükten küçüğe; eşitte
//   sipariş sayısı, sonra kimlik. Ad üyenin kişisel bilgisi silinmemiş en son siparişinin teslimat adıdır; hiçbir
//   siparişinde kalmadıysa ad yoktur (sipariş sayılara yine girer). Hesabı kapatılmış üye işaretlidir.
import { sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { donemAnlari, type GunAraligi } from "./donem.ts";
import { satisKosulu } from "./kural.ts";

type Vt = Veritabani | VeritabaniIslemi;

export type MusteriOzeti = {
  yeni: number;
  donen: number;
  // Üyelerin dönemdeki sipariş sayısı ve üye olmadan verilenler.
  uyeSiparisi: number;
  misafirSiparisi: number;
};

export type MusteriRaporuSatiri = {
  musteri: string;
  ad: string | null;
  hesapKapali: boolean;
  siparisSayisi: number;
  tutar: number;
};

const sayi = (deger: unknown): number => Number(deger ?? 0);

export const musteriRaporu = (site: Site) => {
  const { paraBirimi, saatDilimi } = site.ayarlar;

  const ozet = async (vt: Vt, donem: GunAraligi): Promise<MusteriOzeti> => {
    const { bas, son } = donemAnlari(donem, saatDilimi);
    const { rows } = await vt.execute<{
      yeni: string;
      donen: string;
      uye: string;
      misafir: string;
    }>(sql`
      with donemde as (
        select s.musteri_kimligi as musteri, count(*) as adet
        from siparisler s
        where ${satisKosulu(paraBirimi, bas, son)}
        group by s.musteri_kimligi
      ),
      uyeler as (
        select d.musteri, d.adet, exists (
          select 1 from siparisler o
          where o.musteri_kimligi = d.musteri and o.odeme_zamani < ${bas} and o.para_birimi = ${paraBirimi}
        ) as donen
        from donemde d
        where d.musteri is not null
      )
      select
        (select count(*) from uyeler where not donen) as yeni,
        (select count(*) from uyeler where donen) as donen,
        (select coalesce(sum(adet), 0) from uyeler) as uye,
        (select coalesce(sum(adet), 0) from donemde where musteri is null) as misafir`);
    const [satir] = rows;
    return {
      yeni: sayi(satir?.yeni),
      donen: sayi(satir?.donen),
      uyeSiparisi: sayi(satir?.uye),
      misafirSiparisi: sayi(satir?.misafir),
    };
  };

  const enCokAlanlar = async (vt: Vt, donem: GunAraligi): Promise<MusteriRaporuSatiri[]> => {
    const { bas, son } = donemAnlari(donem, saatDilimi);
    const { rows } = await vt.execute<{
      musteri: string;
      ad: string | null;
      kapali: boolean;
      adet: string;
      tutar: string;
    }>(sql`
      with donemde as (
        select s.musteri_kimligi as musteri, count(*) as adet, sum(s.toplam) as tutar
        from siparisler s
        where ${satisKosulu(paraBirimi, bas, son)} and s.musteri_kimligi is not null
        group by s.musteri_kimligi
      )
      select d.musteri, d.adet, d.tutar, m.silinme_zamani is not null as kapali,
        (select nullif(trim(coalesce(o.teslimat->>'ad', '') || ' ' || coalesce(o.teslimat->>'soyad', '')), '')
          from siparisler o
          where o.musteri_kimligi = d.musteri and o.kisisel_veri_silinme_zamani is null
          order by o.olusturma_zamani desc, o.kimlik desc
          limit 1) as ad
      from donemde d
      join musteriler m on m.kimlik = d.musteri
      order by d.tutar desc, d.adet desc, d.musteri`);
    return rows.map((satir) => ({
      musteri: satir.musteri,
      ad: satir.ad,
      hesapKapali: satir.kapali,
      siparisSayisi: sayi(satir.adet),
      tutar: sayi(satir.tutar),
    }));
  };

  return { ozet, enCokAlanlar };
};
