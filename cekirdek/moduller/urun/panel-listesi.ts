// Panelin ürün listesi (kart 0262, karar 0161): taslak, gizli ve arşiv dahil bütün silinmemiş ürünler; arama, süzgeç,
// sıralama ve sayfa sunucuda, tek sorguda. Satırın fiyatı ve stok durumu vitrinle aynı işlevlerden gelir
// (fiyatAraliklari, stokDurumlari): ürün sayısıyla artmayan birkaç sorgu, yalnız gösterilen sayfanın ürünleri için.
//
// - Arama: ad ve silinmemiş birimin stok kodu; harf kuralı aramanınkidir (aramaAnahtari: Türkçe harfsiz, büyük küçük
//   harf ayrımsız). Aranan metin alanın herhangi bir yerinde geçebilir (strpos: % ve _ joker değildir).
// - Süzgeçler: yayın durumu (birden çok), kategori (alt kategorileriyle, birden çok), marka (birden çok), stok durumu
//   (birden çok). Aynı süzgecin değerleri "ya da", süzgeçler "ve" ile birleşir. Silinmiş kategori ve marka sayılmaz.
// - Stok durumu (kayitlar/urun.ts, urunPanelStokDurumlari): tükendi tukenmisUrunKosulu ile (vitrinin tanımı), düşük
//   stokDurumu'nun düşük stok kuralıyla (stok sıfırdan büyük ve eşikte ya da altında; eşik ürünün, yoksa mağazanın;
//   eşik 0 kapatır), birim silinmemiş, fiyatlı ve takipli. İki tanımın satırın stok durumuyla aynı sonucu verdiğini test
//   denetler.
// - Toplu işlem: her ürün tekil işlemle (urunDegistir, urunSil) aynı yoldan, kendi işleminde; birinin hatası ötekileri
//   durdurmaz (TopluSonuc).
import { and, asc, count, desc, eq, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { PanelSayfaBoyu, TopluSonuc } from "../../kayitlar/liste.ts";
import {
  type UrunDurumu,
  type UrunPanelSiralamasi,
  type UrunPanelStokDurumu,
  type UrunTopluIslemi,
  urunDurumlari,
  urunTopluIslemleri,
} from "../../kayitlar/urun.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { harfSirasi } from "../../veritabani/harf-sirasi.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { birimFiyatlari } from "../fiyat/model.ts";
import { kategoriler, urunKategorileri } from "../kategori/model.ts";
import { kategoriUrunKosulu } from "../kategori/servis.ts";
import { markalar, urunMarkalari } from "../marka/model.ts";
import {
  birimSatilabilirKosulu,
  type StokDurumu,
  tukenmisUrunKosulu,
  urunStokDurumu,
} from "../stok/durum.ts";
import { birimStoklari } from "../stok/model.ts";
import { urunBirimleri, urunler } from "./model.ts";

export type UrunPanelListesiGirdisi = {
  ara?: string;
  durum?: readonly UrunDurumu[];
  kategori?: readonly string[];
  marka?: readonly string[];
  stok?: readonly UrunPanelStokDurumu[];
  siralama: UrunPanelSiralamasi;
  sayfa: number;
  sayfaBoyu: PanelSayfaBoyu;
};

export type UrunPanelAyarlari = {
  // Sitenin para birimi: fiyatı olan birim (stok/durum.ts) ve fiyat sıralaması.
  paraBirimi: string;
  // Mağazanın düşük stok eşiği (ürünün kendi eşiği yoksa).
  dusukStokEsigi: number;
  // Fiyat sıralamasındaki "bugün" (indirimin sürüp sürmediği).
  an: Date;
  // Sitenin dili (BCP 47, "tr-TR"): ada göre sıralamanın harf sırası (Ç, C'den sonra; ı, i'den önce).
  dil: string;
};

export type UrunPanelSatiri = {
  kimlik: string;
  ad: string;
  adresAdi: string;
  durum: UrunDurumu;
  yayinZamani: Date | null;
};

export type UrunPanelListesi = {
  satirlar: UrunPanelSatiri[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
  sayfaBoyu: number;
  // Yayın durumlarının sayıları, öteki süzgeçlere ve aramaya uyan ürünlerde (durum süzgecine bakılmaz).
  durumSayilari: Record<UrunDurumu, number>;
};

// Birimin satırının düşük stokta olduğu koşul (dış sorgudaki urun_birimleri ve urunler; stokDurumu ile aynı kural):
// silinmemiş, sitenin para biriminde fiyatlı, takipli, stoğu sıfırdan büyük ve eşikte ya da altında.
const birimDusukStokKosulu = (paraBirimi: string, dusukStokEsigi: number): SQL => sql`(
  ${urunBirimleri.silinme_zamani} is null
  and ${urunler.stok_takibi}
  and exists (
    select 1 from ${birimFiyatlari}
    where ${birimFiyatlari.birim_kimligi} = ${urunBirimleri.kimlik}
      and ${birimFiyatlari.para_birimi} = ${paraBirimi}
  )
  and coalesce((
    select ${birimStoklari.miktar} from ${birimStoklari}
    where ${birimStoklari.birim_kimligi} = ${urunBirimleri.kimlik}
  ), 0) between 1 and coalesce(${urunler.dusuk_stok_esigi}, ${dusukStokEsigi})
)`;

const dusukUrunKosulu = (ayarlar: UrunPanelAyarlari): SQL => sql`exists (
  select 1 from ${urunBirimleri}
  where ${urunBirimleri.urun_kimligi} = ${urunler.kimlik}
    and ${birimDusukStokKosulu(ayarlar.paraBirimi, ayarlar.dusukStokEsigi)}
)`;

// Ürünün panel stok durumunun koşulu (urunPanelStokDurumlari).
export const urunPanelStokKosulu = (
  durum: UrunPanelStokDurumu,
  ayarlar: UrunPanelAyarlari,
): SQL => {
  const tukendi = tukenmisUrunKosulu(ayarlar.paraBirimi);
  if (durum === "tukendi") return tukendi;
  if (durum === "dusuk") return sql`(not ${tukendi} and ${dusukUrunKosulu(ayarlar)})`;
  return sql`(not ${tukendi} and not ${dusukUrunKosulu(ayarlar)})`;
};

// Ürünün panel stok durumu, silinmemiş birimlerinin stok durumundan (stokDurumlari): satırın yazısı bununla, süzgeç
// urunPanelStokKosulu ile bulunur; ikisinin aynı sonucu verdiğini test denetler.
export const urunPanelStokDurumu = (birimler: readonly StokDurumu[]): UrunPanelStokDurumu =>
  urunStokDurumu([...birimler]).tukendi
    ? "tukendi"
    : birimler.some((birim) => birim.dusukStok)
      ? "dusuk"
      : "stokta";

// Silinmemiş birimlerin toplam stoğu; takibi kapalı üründe boş (sıralamada sonda).
const toplamStokSql = sql<number | null>`(case when ${urunler.stok_takibi} then (
  select coalesce(sum(coalesce(${birimStoklari.miktar}, 0)), 0) from ${urunBirimleri}
    left join ${birimStoklari} on ${birimStoklari.birim_kimligi} = ${urunBirimleri.kimlik}
  where ${urunBirimleri.urun_kimligi} = ${urunler.kimlik} and ${urunBirimleri.silinme_zamani} is null
) end)`;

// Bugünkü girilen en düşük fiyat: indirim sürüyorsa indirimli fiyat (gecerli.ts'teki indirimSuruyorMu ve
// fiyat/vitrin.ts'teki koşulla aynı kural), sitenin para biriminde. Satırda görünen fiyatın (fiyatAraliklari) aday
// kuralıyla: önce satılabilir birimler (birimSatilabilirKosulu), hiçbiri satılamıyorsa silinmemiş bütün fiyatlı
// birimler (bağımsız kontrolün bulgusu: tükenmiş ucuz birleşim sırayı bozuyordu). Fiyatı yoksa boş (sonda).
const enDusukFiyatSql = (ayarlar: UrunPanelAyarlari) => {
  const simdi = sql`${ayarlar.an.toISOString()}::timestamptz`;
  const enDusuk = (ek: SQL) => sql`(
    select min(case
      when ${birimFiyatlari.indirimli_fiyat} is not null
        and (${birimFiyatlari.indirim_baslangici} is null or ${birimFiyatlari.indirim_baslangici} <= ${simdi})
        and (${birimFiyatlari.indirim_bitisi} is null or ${simdi} < ${birimFiyatlari.indirim_bitisi})
      then ${birimFiyatlari.indirimli_fiyat} else ${birimFiyatlari.satis_fiyati} end)
    from ${urunBirimleri}
      join ${birimFiyatlari} on ${birimFiyatlari.birim_kimligi} = ${urunBirimleri.kimlik}
    where ${urunBirimleri.urun_kimligi} = ${urunler.kimlik}
      and ${urunBirimleri.silinme_zamani} is null
      and ${birimFiyatlari.para_birimi} = ${ayarlar.paraBirimi}
      and ${ek}
  )`;
  return sql<
    number | null
  >`coalesce(${enDusuk(birimSatilabilirKosulu(ayarlar.paraBirimi))}, ${enDusuk(sql`true`)})`;
};

// Aranan metin adda ya da silinmemiş bir birimin stok kodunda geçer.
const aramaKosulu = (aranan: string): SQL => sql`(
  strpos(${aramaAnahtariSql(urunler.ad)}, ${aranan}) > 0
  or exists (
    select 1 from ${urunBirimleri}
    where ${urunBirimleri.urun_kimligi} = ${urunler.kimlik}
      and ${urunBirimleri.silinme_zamani} is null
      and ${urunBirimleri.stok_kodu} is not null
      and strpos(${aramaAnahtariSql(urunBirimleri.stok_kodu)}, ${aranan}) > 0
  )
)`;

const gecerliKimlikler = (kimlikler: readonly string[] | undefined) =>
  (kimlikler ?? []).filter(kimlikMi).map(kimligiDuzelt);

export const urunPanelListesi = async (
  vt: Veritabani,
  girdi: UrunPanelListesiGirdisi,
  ayarlar: UrunPanelAyarlari,
): Promise<UrunPanelListesi> => {
  const aranan = aramaAnahtari(girdi.ara ?? "");
  const kategoriKimlikleri = gecerliKimlikler(girdi.kategori);
  const markaKimlikleri = gecerliKimlikler(girdi.marka);
  // Durum dışındaki koşullar: sayılar durum süzgecine bakmaz.
  const ortak: (SQL | undefined)[] = [
    isNull(urunler.silinme_zamani),
    aranan === "" ? undefined : aramaKosulu(aranan),
    kategoriKimlikleri.length === 0
      ? undefined
      : or(...kategoriKimlikleri.map((kategori) => kategoriUrunKosulu(kategori, true))),
    markaKimlikleri.length === 0
      ? undefined
      : sql`exists (
          select 1 from ${urunMarkalari} join ${markalar} on ${markalar.kimlik} = ${urunMarkalari.grup_kimligi}
          where ${urunMarkalari.urun_kimligi} = ${urunler.kimlik}
            and ${markalar.silinme_zamani} is null
            and ${inArray(urunMarkalari.grup_kimligi, markaKimlikleri)}
        )`,
    girdi.stok === undefined || girdi.stok.length === 0
      ? undefined
      : or(...girdi.stok.map((durum) => urunPanelStokKosulu(durum, ayarlar))),
  ];
  const durumKosulu =
    girdi.durum === undefined || girdi.durum.length === 0
      ? undefined
      : inArray(urunler.durum, [...girdi.durum]);
  const kosul = and(...ortak, durumKosulu);

  const sayilar = await vt
    .select({ durum: urunler.durum, sayi: count() })
    .from(urunler)
    .where(and(...ortak))
    .groupBy(urunler.durum);
  const durumSayilari = Object.fromEntries(urunDurumlari.map((durum) => [durum, 0])) as Record<
    UrunDurumu,
    number
  >;
  for (const satir of sayilar) durumSayilari[satir.durum as UrunDurumu] = satir.sayi;
  const toplam =
    girdi.durum === undefined || girdi.durum.length === 0
      ? Object.values(durumSayilari).reduce((a, b) => a + b, 0)
      : girdi.durum.reduce((a, durum) => a + durumSayilari[durum], 0);

  const boyut = girdi.sayfaBoyu;
  const sayfaSayisi = Math.max(1, Math.ceil(toplam / boyut));
  const sayfa = Math.min(Math.max(1, Math.trunc(girdi.sayfa)), sayfaSayisi);
  const ad = sql`${urunler.ad} collate ${sql.identifier(await harfSirasi(vt, ayarlar.dil))}`;
  const stok = toplamStokSql;
  const fiyat = enDusukFiyatSql(ayarlar);
  const sira: SQL[] = {
    "son-degisen": [desc(urunler.guncellenme_zamani)],
    "ad-artan": [asc(ad)],
    "ad-azalan": [desc(ad)],
    "stok-artan": [sql`${stok} asc nulls last`],
    "stok-azalan": [sql`${stok} desc nulls last`],
    "fiyat-artan": [sql`${fiyat} asc nulls last`],
    "fiyat-azalan": [sql`${fiyat} desc nulls last`],
  }[girdi.siralama];
  const satirlar = await vt
    .select({
      kimlik: urunler.kimlik,
      ad: urunler.ad,
      adresAdi: urunler.adres_adi,
      durum: urunler.durum,
      yayinZamani: urunler.yayin_zamani,
    })
    .from(urunler)
    .where(kosul)
    .orderBy(...sira, asc(urunler.kimlik))
    .limit(boyut)
    .offset((sayfa - 1) * boyut);
  return {
    satirlar: satirlar.map((satir) => ({ ...satir, durum: satir.durum as UrunDurumu })),
    toplam,
    sayfa,
    sayfaSayisi,
    sayfaBoyu: boyut,
    durumSayilari,
  };
};

// Toplu işlem: her ürün tekil işlemle aynı yoldan, kendi işleminde. Durum değişikliği urunDegistir'in kurallarıyla
// (yayın zamanı yalnız zamanlanmış üründe kalır), silme urunSil'le. İşlenemeyen ürün nedeninin koduyla döner.
export const urunTopluIslem = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  servis: {
    urunDegistir: (
      vt: Veritabani,
      kim: DegisikligiYapan,
      kimlik: string,
      girdi: { durum: UrunDurumu },
    ) => Promise<unknown>;
    urunSil: (vt: Veritabani, kim: DegisikligiYapan, kimlik: string) => Promise<unknown>;
  },
  girdi: { islem: UrunTopluIslemi; urunler: readonly string[] },
): Promise<TopluSonuc> => {
  const sonuc: TopluSonuc = { islenen: [], islenemeyen: [] };
  const { durum } = urunTopluIslemleri[girdi.islem];
  for (const kimlik of new Set(girdi.urunler.map(kimligiDuzelt))) {
    try {
      if (durum === null) await servis.urunSil(vt, kim, kimlik);
      else await servis.urunDegistir(vt, kim, kimlik, { durum });
      sonuc.islenen.push(kimlik);
    } catch (hata) {
      if (hata instanceof BilinenHata) {
        const ayrinti = Array.isArray(hata.ayrinti)
          ? (hata.ayrinti[0] as { kod?: unknown } | undefined)
          : undefined;
        sonuc.islenemeyen.push({
          anahtar: kimlik,
          kod: typeof ayrinti?.kod === "string" ? ayrinti.kod : hata.kod,
        });
      } else {
        hatayiKaydet(hata, { islem: "urun-toplu-islem" });
        sonuc.islenemeyen.push({ anahtar: kimlik, kod: "beklenmeyen" });
      }
    }
  }
  return sonuc;
};

// Satırın kategorileri: ürünlerin silinmemiş kategorilerinin adları, kategorinin sırasıyla. Tek sorgu.
export const urunlerinKategoriAdlari = async (
  vt: Veritabani,
  urunKimlikleri: string[],
): Promise<Map<string, string[]>> => {
  const sonuc = new Map<string, string[]>();
  if (urunKimlikleri.length === 0) return sonuc;
  const satirlar = await vt
    .select({ urun: urunKategorileri.urun_kimligi, ad: kategoriler.ad })
    .from(urunKategorileri)
    .innerJoin(kategoriler, eq(kategoriler.kimlik, urunKategorileri.kategori_kimligi))
    .where(
      and(
        inArray(urunKategorileri.urun_kimligi, urunKimlikleri),
        isNull(kategoriler.silinme_zamani),
      ),
    )
    .orderBy(asc(kategoriler.sira), asc(kategoriler.ad));
  for (const { urun, ad } of satirlar) sonuc.set(urun, [...(sonuc.get(urun) ?? []), ad]);
  return sonuc;
};

// Satırın birimleri: silinmemiş birimlerin kimliği ve stok kodu, birleşim sayısı için. Tek sorgu.
export const urunlerinPanelBirimleri = async (
  vt: Veritabani,
  urunKimlikleri: string[],
): Promise<Map<string, { kimlik: string; stokKodu: string | null; birlesim: string }[]>> => {
  const sonuc = new Map<string, { kimlik: string; stokKodu: string | null; birlesim: string }[]>();
  if (urunKimlikleri.length === 0) return sonuc;
  const satirlar = await vt
    .select({
      urun: urunBirimleri.urun_kimligi,
      kimlik: urunBirimleri.kimlik,
      stokKodu: urunBirimleri.stok_kodu,
      birlesim: urunBirimleri.birlesim,
    })
    .from(urunBirimleri)
    .where(
      and(
        inArray(urunBirimleri.urun_kimligi, urunKimlikleri),
        isNull(urunBirimleri.silinme_zamani),
      ),
    );
  for (const { urun, ...birim } of satirlar) sonuc.set(urun, [...(sonuc.get(urun) ?? []), birim]);
  return sonuc;
};
