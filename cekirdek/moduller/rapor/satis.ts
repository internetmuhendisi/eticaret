// Satış raporu (kart 0317, karar 0185 ve 0195). Raporların hangi siparişi ve iadeyi saydığı yalnız burada yazılır;
// ürün, müşteri ve kupon raporları (kart 0318) ve panodaki satış özeti (kart 0186) bu kuralları kullanır.
//
// Kurallar:
// - Satış ödemesi alınmış siparişlerdir, ödemenin alındığı günde sayılır (odeme_zamani: kartla ödemede sipariş
//   kurulurken, havalede onayda, kapıda ödemede teslimde, "elden"de girilirken). Ödeme bekleyen sipariş sayılmaz;
//   ödenmeden iptal edilen siparişin ödeme anı hiç olmaz.
// - İade ayrı satırda, iadenin tamamlandığı günde düşülür (sonuc_zamani, durum "tamamlandi"). Ödendikten sonra iptal
//   edilen sipariş ödeme gününde satışa girer, iptalin parası iptal gününde iade olarak düşülür: geçmiş günün rakamı
//   sonradan değişmez.
// - Tutarlar siparişin saklanan değerleridir, yeniden hesaplanmaz. Satış siparişin toplamıdır (kupon düşülmüş, kargo
//   ve vergi dahil); taksit farkı satış değildir. Bir siparişin iadeleri toplamını aşamaz: taksitli ödemenin tam iadesi
//   taksit farkını da döndürür (iade-hesabi.ts), aşan kısım sayılmaz (müşteri listesiyle aynı kural).
// - Kupon indirimi ürün indirimi ve ücretsiz kargo kuponunun verilmeyen kargo ücretidir; satıştan zaten düşülmüştür.
// - Vergi oran oran: satılan siparişlerin vergi dökümü eksi dönemdeki iadelerin vergi dökümü (ad ve oran aynıysa tek
//   satır). Matrah aynı biçimde.
// - Yalnız sitenin para birimindeki siparişler ve iadeleri sayılır.
// - Seri: dönem en çok raporSinirlari.gunlukEnCokGun günse günlük, daha uzunsa dönemin ilk gününden yedişer günlük;
//   satış ve sipariş sayısı. Günler sitenin saat dilimindedir.
import { sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { raporSinirlari } from "../../kayitlar/rapor.ts";
import type { IadeDurumu } from "../../kayitlar/siparis.ts";
import { gunEkle } from "../../metinler/bicimleyici.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { siparisIadeleri, siparisler } from "../siparis/model.ts";
import { donemAnlari, type GunAraligi, gunSayisi } from "./donem.ts";

type Vt = Veritabani | VeritabaniIslemi;

export type VergiSatiri = { ad: string | null; oran: number; matrah: number; vergi: number };

export type SatisOzeti = {
  siparisSayisi: number;
  // Satış: ödemesi alınmış siparişlerin toplamı.
  satis: number;
  kuponIndirimi: number;
  iade: number;
  iadeSayisi: number;
  netSatis: number;
  // Satış bölü sipariş sayısı, en küçük birime yuvarlanmış; siparişsiz dönemde yok.
  ortalamaSepet: number | null;
  // Ad ve oran sırasıyla; matrahı ve vergisi sıfır olan oran yok.
  vergiler: VergiSatiri[];
};

export type SeriNoktasi = GunAraligi & { satis: number; siparisSayisi: number };

export type SatisRaporu = {
  donem: GunAraligi;
  ozet: SatisOzeti;
  // Önceki dönemle karşılaştırma istenmediyse yok.
  onceki: { donem: GunAraligi; ozet: SatisOzeti } | null;
  seri: { tur: "gunluk" | "haftalik"; noktalar: SeriNoktasi[] };
};

const sayi = (deger: unknown): number => Number(deger ?? 0);
const tamamlandi: IadeDurumu = "tamamlandi";

export const satisRaporu = (site: Site) => {
  const { paraBirimi, saatDilimi } = site.ayarlar;

  // Dönemde ödenen siparişlerin sayıları.
  const satislar = async (vt: Vt, bas: Date, son: Date) => {
    const { rows } = await vt.execute<{
      adet: string;
      satis: string;
      kupon: string;
    }>(sql`
      select count(*) as adet,
        coalesce(sum(${siparisler.toplam}), 0) as satis,
        coalesce(sum(${siparisler.kupon_indirimi} + ${siparisler.kupon_kargo_indirimi}), 0) as kupon
      from ${siparisler}
      where ${siparisler.odeme_zamani} >= ${bas} and ${siparisler.odeme_zamani} < ${son}
        and ${siparisler.para_birimi} = ${paraBirimi}`);
    const [satir] = rows;
    return { adet: sayi(satir?.adet), satis: sayi(satir?.satis), kupon: sayi(satir?.kupon) };
  };

  // Dönemde tamamlanan iadeler. Siparişin iadeleri sırayla toplanır (tamamlanma anı, kimlik): her iade siparişin
  // toplamından kalanı kadar sayılır.
  const iadeler = async (vt: Vt, bas: Date, son: Date) => {
    const { rows } = await vt.execute<{ tutar: string; adet: string }>(sql`
      with donemdekiler as (
        select distinct ${siparisIadeleri.siparis_kimligi} as siparis
        from ${siparisIadeleri}
        where ${siparisIadeleri.durum} = ${tamamlandi}
          and ${siparisIadeleri.sonuc_zamani} >= ${bas} and ${siparisIadeleri.sonuc_zamani} < ${son}
      ),
      birikimli as (
        select i.tutar, i.sonuc_zamani, s.toplam,
          sum(i.tutar) over (partition by i.siparis_kimligi order by i.sonuc_zamani, i.kimlik) as birikim
        from siparis_iadeleri i
        join siparisler s on s.kimlik = i.siparis_kimligi
        where i.durum = ${tamamlandi} and s.para_birimi = ${paraBirimi}
          and i.siparis_kimligi in (select siparis from donemdekiler)
      )
      select coalesce(sum(greatest(0, least(birikim, toplam) - least(birikim - tutar, toplam))), 0) as tutar,
        count(*) filter (where tutar > 0) as adet
      from birikimli
      where sonuc_zamani >= ${bas} and sonuc_zamani < ${son}`);
    const [satir] = rows;
    return { tutar: sayi(satir?.tutar), adet: sayi(satir?.adet) };
  };

  // Oran oran vergi: satışların dökümü eksi iadelerin dökümü.
  const vergiler = async (vt: Vt, bas: Date, son: Date): Promise<VergiSatiri[]> => {
    const { rows } = await vt.execute<{
      ad: string | null;
      oran: string;
      matrah: string;
      vergi: string;
    }>(sql`
      with satirlar as (
        select d.ad, d.oran, d.matrah, d.vergi
        from ${siparisler}
        cross join lateral jsonb_to_recordset(${siparisler.vergi_dokumu})
          as d(ad text, oran bigint, matrah bigint, vergi bigint)
        where ${siparisler.odeme_zamani} >= ${bas} and ${siparisler.odeme_zamani} < ${son}
          and ${siparisler.para_birimi} = ${paraBirimi}
        union all
        select d.ad, d.oran, -d.matrah, -d.vergi
        from siparis_iadeleri i
        join siparisler s on s.kimlik = i.siparis_kimligi
        cross join lateral jsonb_to_recordset(i.vergi_dokumu)
          as d(ad text, oran bigint, matrah bigint, vergi bigint)
        where i.durum = ${tamamlandi} and i.sonuc_zamani >= ${bas} and i.sonuc_zamani < ${son}
          and s.para_birimi = ${paraBirimi}
      )
      select ad, oran, sum(matrah) as matrah, sum(vergi) as vergi
      from satirlar
      group by ad, oran
      having sum(matrah) <> 0 or sum(vergi) <> 0
      order by ad nulls first, oran`);
    return rows.map((satir) => ({
      ad: satir.ad,
      oran: sayi(satir.oran),
      matrah: sayi(satir.matrah),
      vergi: sayi(satir.vergi),
    }));
  };

  const ozet = async (vt: Vt, donem: GunAraligi): Promise<SatisOzeti> => {
    const { bas, son } = donemAnlari(donem, saatDilimi);
    const [s, i, v] = await Promise.all([
      satislar(vt, bas, son),
      iadeler(vt, bas, son),
      vergiler(vt, bas, son),
    ]);
    return {
      siparisSayisi: s.adet,
      satis: s.satis,
      kuponIndirimi: s.kupon,
      iade: i.tutar,
      iadeSayisi: i.adet,
      netSatis: s.satis - i.tutar,
      ortalamaSepet: s.adet === 0 ? null : Math.round(s.satis / s.adet),
      vergiler: v,
    };
  };

  // Günlük satış ve sipariş sayısı; seriye dönemin her günü girer (satışsız gün sıfırdır).
  const seri = async (vt: Vt, donem: GunAraligi): Promise<SatisRaporu["seri"]> => {
    const { bas, son } = donemAnlari(donem, saatDilimi);
    const { rows } = await vt.execute<{ gun: string; satis: string; adet: string }>(sql`
      select to_char(timezone(${saatDilimi}, ${siparisler.odeme_zamani}), 'YYYY-MM-DD') as gun,
        sum(${siparisler.toplam}) as satis, count(*) as adet
      from ${siparisler}
      where ${siparisler.odeme_zamani} >= ${bas} and ${siparisler.odeme_zamani} < ${son}
        and ${siparisler.para_birimi} = ${paraBirimi}
      group by 1`);
    const gunler = new Map(rows.map((satir) => [satir.gun, satir]));
    const uzunluk = gunSayisi(donem);
    const adim = uzunluk <= raporSinirlari.gunlukEnCokGun ? 1 : 7;
    const noktalar: SeriNoktasi[] = [];
    for (let i = 0; i < uzunluk; i += adim) {
      const baslangic = gunEkle(donem.baslangic, i);
      const bitis = gunEkle(donem.baslangic, Math.min(i + adim, uzunluk) - 1);
      let satis = 0;
      let siparisSayisi = 0;
      for (let gun = baslangic; gun <= bitis; gun = gunEkle(gun, 1)) {
        const satir = gunler.get(gun);
        satis += sayi(satir?.satis);
        siparisSayisi += sayi(satir?.adet);
      }
      noktalar.push({ baslangic, bitis, satis, siparisSayisi });
    }
    return { tur: adim === 1 ? "gunluk" : "haftalik", noktalar };
  };

  // Karşılaştırılan dönem çağırandandır (karsilastirmaDonemi, donem.ts); null ise karşılaştırma yok.
  const rapor = async (
    vt: Vt,
    donem: GunAraligi,
    onceki: GunAraligi | null,
  ): Promise<SatisRaporu> => {
    const [buOzet, oncekiOzet, buSeri] = await Promise.all([
      ozet(vt, donem),
      onceki === null ? Promise.resolve(null) : ozet(vt, onceki),
      seri(vt, donem),
    ]);
    return {
      donem,
      ozet: buOzet,
      onceki: onceki === null || oncekiOzet === null ? null : { donem: onceki, ozet: oncekiOzet },
      seri: buSeri,
    };
  };

  return { rapor, ozet };
};
