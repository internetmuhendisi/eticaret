// Kupon raporu (kart 0318, karar 0196). Kuponlu sipariş, dönemde satış sayılan (kural.ts: ödeme gününde) ve kupon
// kullanmış siparişlerdir.
//
// - Kupon başına: kullanım (sipariş sayısı), verilen indirim (ürün indirimi ve ücretsiz kargo kuponunun verilmeyen
//   kargo ücreti), kuponlu satış (siparişlerin toplamı) ve iade sonrası (o siparişlerin dönemden bağımsız bütün
//   tamamlanmış iadeleri düşülmüş; bir siparişin iadeleri toplamını aşmaz). İade sonrası bir kupon grubunun getirdiğidir,
//   satış raporunun gün kuralından ayrıdır (kuponun sayfasıyla aynı, kart 0313).
// - Kupon siparişe bağlanan kullanımdan bulunur (kupon_kullanimlari); kod siparişteki koddur. Kuponu silinmiş ya da
//   kullanımı bulunmayan sipariş koduyla gruplanır, kuponun sayfasına bağlantısı yoktur.
// - Sıra: kullanım, sonra indirim, büyükten küçüğe; eşitte kod.
import { sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { donemAnlari, type GunAraligi } from "./donem.ts";
import { iadeSonrasiTutar, satisKosulu } from "./kural.ts";

type Vt = Veritabani | VeritabaniIslemi;

export type KuponOzeti = {
  kuponluSiparis: number;
  // Dönemde satış sayılan bütün siparişler (kuponlu siparişin payı için).
  butunSiparis: number;
  indirim: number;
  satis: number;
  iadeSonrasi: number;
};

export type KuponRaporuSatiri = {
  // Kuponun kimliği; kullanımı bulunmayan siparişte yok.
  kupon: string | null;
  kod: string;
  kullanim: number;
  indirim: number;
  satis: number;
  iadeSonrasi: number;
};

const sayi = (deger: unknown): number => Number(deger ?? 0);

export const kuponRaporu = (site: Site) => {
  const { paraBirimi, saatDilimi } = site.ayarlar;

  const kuponlular = (bas: Date, son: Date) => sql`
    select s.kimlik, s.kupon_kodu as kod, s.toplam,
      s.kupon_indirimi + s.kupon_kargo_indirimi as indirim,
      ${iadeSonrasiTutar()} as iade_sonrasi,
      (select ku.kupon_kimligi from kupon_kullanimlari ku where ku.siparis_kimligi = s.kimlik limit 1) as kupon
    from siparisler s
    where ${satisKosulu(paraBirimi, bas, son)} and s.kupon_kodu is not null`;

  const ozet = async (vt: Vt, donem: GunAraligi): Promise<KuponOzeti> => {
    const { bas, son } = donemAnlari(donem, saatDilimi);
    const { rows } = await vt.execute<{
      adet: string;
      butun: string;
      indirim: string;
      satis: string;
      iade_sonrasi: string;
    }>(sql`
      with k as (${kuponlular(bas, son)})
      select count(*) as adet, coalesce(sum(indirim), 0) as indirim, coalesce(sum(toplam), 0) as satis,
        coalesce(sum(iade_sonrasi), 0) as iade_sonrasi,
        (select count(*) from siparisler s where ${satisKosulu(paraBirimi, bas, son)}) as butun
      from k`);
    const [satir] = rows;
    return {
      kuponluSiparis: sayi(satir?.adet),
      butunSiparis: sayi(satir?.butun),
      indirim: sayi(satir?.indirim),
      satis: sayi(satir?.satis),
      iadeSonrasi: sayi(satir?.iade_sonrasi),
    };
  };

  const satirlar = async (vt: Vt, donem: GunAraligi): Promise<KuponRaporuSatiri[]> => {
    const { bas, son } = donemAnlari(donem, saatDilimi);
    const { rows } = await vt.execute<{
      kupon: string | null;
      kod: string;
      adet: string;
      indirim: string;
      satis: string;
      iade_sonrasi: string;
    }>(sql`
      with k as (${kuponlular(bas, son)})
      select k.kupon, coalesce(min(kp.kod), min(k.kod)) as kod, count(*) as adet,
        sum(k.indirim) as indirim, sum(k.toplam) as satis, sum(k.iade_sonrasi) as iade_sonrasi
      from k
      left join kuponlar kp on kp.kimlik = k.kupon and kp.silinme_zamani is null
      group by k.kupon, case when k.kupon is null then k.kod end
      order by count(*) desc, sum(k.indirim) desc, 2`);
    return rows.map((satir) => ({
      kupon: satir.kupon,
      kod: satir.kod,
      kullanim: sayi(satir.adet),
      indirim: sayi(satir.indirim),
      satis: sayi(satir.satis),
      iadeSonrasi: sayi(satir.iade_sonrasi),
    }));
  };

  return { ozet, satirlar };
};
