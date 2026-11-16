// Stok durumu (kart 0083, karar 0069): bir birimin satılabilir olup olmadığı, tükenip tükenmediği,
// düşük stokta olup olmadığı ve müşteriye ne yazılacağı yalnız buradan bulunur.
//
// Kurallar:
// - Silinmiş birim (ya da silinmiş ürünün birimi) satılamaz ve tükenmiş sayılır (kart 0083 kontrolü).
// - Fiyatı olmayan birim satılamaz ve tükenmiş sayılır (kart 0155, karar 0133): stoğu olsa da, takibi kapalı
//   olsa da. Fiyatı var: fiyat satırı vardır ve sitenin para birimindedir (fiyat/gecerli.ts ile aynı kural).
// - Takibi kapalı ürünün silinmemiş, fiyatlı birimi her zaman satılabilir, tükenmez, düşük stokta olmaz;
//   müşteriye "stokta" yazılır.
// - Takip açıksa stok sıfırsa birim tükenmiştir ve satılamaz.
// - Ürün, satılabilir tek bir birimi kalmayınca tükenmiştir (vitrin listesi için tukenmisUrunKosulu).
//   Kurallar aynı tanımı kullanır: birim, silinmemişse, fiyatı varsa ve takip kapalıysa ya da stoğu varsa
//   satılabilir. Veritabanında tanım tektir (birimSatilabilirKosulu); listenin süzgeci ve filtrenin
//   "stoktakiler"i onu kullanır.
// - Ürünün genel durumu (kart 0085, kullanıcı kararı) silinmemiş birimlerinden çıkar (urunStokDurumu):
//   tek birimli üründe birimin durumudur; birden çok birimde biri satılabilirse "stokta", hiçbiri
//   satılamıyorsa "tukendi" yazılır. Kalan adet ("Son 3 ürün") ancak birleşim seçilince, birimin
//   durumunda görünür; düşük stok birim bazındadır.
// - Düşük stok: stok sıfırdan büyük ve eşiğe eşit ya da altında. Eşik ürünün kendi eşiği, yoksa mağaza
//   ayarı (dusukStokEsigi). Eşik 0 düşük stoğu kapatır.
// - Müşteriye yazılan: tükendiyse "tukendi"; stok sonAdetEsigi'ne eşit ya da altındaysa "son-adet" ve
//   kalan adet; değilse "stokta". sonAdetEsigi 0 kalan adeti hiç yazdırmaz.
//
// Tükenen ürünün vitrinde gizlenmesi ürünün vitrin koşulundadır (urun/vitrin.ts): koşul tükenmişliği
// buradaki tukenmisUrunKosulu ile sınar. İki kuralın aynı sonucu verdiğini test denetler.
import { and, eq, inArray, type SQL, sql } from "drizzle-orm";
import type { MagazaAyarlari } from "../../ayar-semasi/ayarlar.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { StokGosterimi } from "../../kayitlar/stok.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { birimFiyatlari } from "../fiyat/model.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { urunlerinBirimleri } from "../urun/varyant.ts";
import { birimStoklari } from "./model.ts";

// Mağaza sahibinin iki eşiği ve sitenin para birimi (fiyatı olan birim satılabilir).
export type StokDurumAyarlari = Pick<MagazaAyarlari, "dusukStokEsigi" | "sonAdetEsigi"> & {
  paraBirimi: string;
};

// Sitenin stok durumu ayarları: mağaza ayarlarının eşikleri ve sitenin para birimi.
export const siteninStokAyarlari = async (
  vt: Veritabani,
  site: Site,
): Promise<StokDurumAyarlari & MagazaAyarlari> => ({
  ...(await siteninMagazaAyarlari(vt, site)),
  paraBirimi: site.ayarlar.paraBirimi,
});

export type BirimStokBilgisi = {
  miktar: number;
  takip: boolean;
  // Ürünün kendi düşük stok eşiği; null ise mağaza ayarı.
  dusukStokEsigi: number | null;
  // Birim ya da ürünü silinmiş.
  silinmis: boolean;
  // Sitenin para biriminde fiyatı var.
  fiyatli: boolean;
};

export type StokDurumu = {
  takip: boolean;
  miktar: number;
  satilabilir: boolean;
  tukendi: boolean;
  dusukStok: boolean;
  // Müşteriye yazılan durum; "son-adet"te kalan adet de vardır. Metni stokGosterimMetinleri'nden.
  gosterim: { tur: Exclude<StokGosterimi, "son-adet"> } | { tur: "son-adet"; adet: number };
};

export const stokDurumu = (stok: BirimStokBilgisi, ayarlar: StokDurumAyarlari): StokDurumu => {
  const { miktar, takip } = stok;
  if (stok.silinmis || !stok.fiyatli) {
    return {
      takip,
      miktar,
      satilabilir: false,
      tukendi: true,
      dusukStok: false,
      gosterim: { tur: "tukendi" },
    };
  }
  if (!takip) {
    return {
      takip,
      miktar,
      satilabilir: true,
      tukendi: false,
      dusukStok: false,
      gosterim: { tur: "stokta" },
    };
  }
  const tukendi = miktar <= 0;
  const esik = stok.dusukStokEsigi ?? ayarlar.dusukStokEsigi;
  return {
    takip,
    miktar,
    satilabilir: !tukendi,
    tukendi,
    dusukStok: !tukendi && miktar <= esik,
    gosterim: tukendi
      ? { tur: "tukendi" }
      : miktar <= ayarlar.sonAdetEsigi
        ? { tur: "son-adet", adet: miktar }
        : { tur: "stokta" },
  };
};

// Sorgudaki birim satırı satılabilir mi (stokDurumu ile aynı tanım): silinmemiş, sitenin para biriminde
// fiyatı var, ürünün takibi kapalı ya da stoğu var. Stok satırı olmayan birimin stoğu sıfırdır. Ürünün
// silinmişliğine bakılmaz: ürünü vitrinKosulu süzer.
// Dış sorgudaki urun_birimleri ve urunler tabloları takma adsız olmalıdır: sütunlar "urunler".… diye yazılır;
// takma adlı bir tablo içinde kullanılırsa koşul sessizce dıştaki satıra bağlanır (kart 0083 kontrolü).
export const birimSatilabilirKosulu = (paraBirimi: string): SQL => sql`(
  ${urunBirimleri.silinme_zamani} is null
  and exists (
    select 1 from ${birimFiyatlari}
    where ${birimFiyatlari.birim_kimligi} = ${urunBirimleri.kimlik}
      and ${birimFiyatlari.para_birimi} = ${paraBirimi}
  )
  and (not ${urunler.stok_takibi} or coalesce((
    select ${birimStoklari.miktar} from ${birimStoklari}
    where ${birimStoklari.birim_kimligi} = ${urunBirimleri.kimlik}
  ), 0) > 0)
)`;

// Sorgudaki ürün satırı tükenmiş mi: satılabilir tek bir birimi yok (birimSatilabilirKosulu).
export const tukenmisUrunKosulu = (paraBirimi: string): SQL => sql`(not exists (
  select 1 from ${urunBirimleri}
  where ${urunBirimleri.urun_kimligi} = ${urunler.kimlik}
    and ${birimSatilabilirKosulu(paraBirimi)}
))`;

// Ürünün genel durumu. Yalnız silinmemiş birimler verilir; birimi olmayan ürün tükenmiştir.
export type UrunStokDurumu = Pick<StokDurumu, "satilabilir" | "tukendi" | "gosterim">;
export const urunStokDurumu = (birimler: StokDurumu[]): UrunStokDurumu => {
  const [tek] = birimler;
  if (birimler.length === 1 && tek !== undefined) {
    return { satilabilir: tek.satilabilir, tukendi: tek.tukendi, gosterim: tek.gosterim };
  }
  const satilabilir = birimler.some((birim) => birim.satilabilir);
  return {
    satilabilir,
    tukendi: !satilabilir,
    gosterim: { tur: satilabilir ? "stokta" : "tukendi" },
  };
};

// Birimlerin stok bilgisi tek sorguyla; olmayan birim haritada yoktur. Silinmiş birim de okunur ve
// silinmiş diye işaretlenir. Ürünün vitrinde görünüp görünmediğine (taslak, gizli) burada bakılmaz: o
// vitrinKosulu'nun işidir, sepet ikisini birlikte sınar. Para birimi verilmezse fiyata bakılmaz (stok
// servisinin yalnız miktar ve takip okuması); fiyatlı her zaman false'tur.
const stokSatirlari = async (
  vt: Veritabani | VeritabaniIslemi,
  birimler: string[],
  paraBirimi: string | undefined,
): Promise<Map<string, BirimStokBilgisi>> => {
  const gecerli = birimler.filter(kimlikMi).map(kimligiDuzelt);
  if (gecerli.length === 0) return new Map();
  const satirlar = await vt
    .select({
      birim: urunBirimleri.kimlik,
      miktar: sql<number>`coalesce(${birimStoklari.miktar}, 0)`.mapWith(Number),
      takip: urunler.stok_takibi,
      dusukStokEsigi: urunler.dusuk_stok_esigi,
      silinmis: sql<boolean>`(${urunBirimleri.silinme_zamani} is not null or ${urunler.silinme_zamani} is not null)`,
      fiyatli: sql<boolean>`(${birimFiyatlari.birim_kimligi} is not null)`,
    })
    .from(urunBirimleri)
    .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
    .leftJoin(birimStoklari, eq(birimStoklari.birim_kimligi, urunBirimleri.kimlik))
    .leftJoin(
      birimFiyatlari,
      and(
        eq(birimFiyatlari.birim_kimligi, urunBirimleri.kimlik),
        paraBirimi === undefined ? sql`false` : eq(birimFiyatlari.para_birimi, paraBirimi),
      ),
    )
    .where(inArray(urunBirimleri.kimlik, gecerli));
  return new Map(satirlar.map(({ birim, ...bilgi }) => [birim, bilgi]));
};

// Birimlerin stok bilgisi ve sitenin para biriminde fiyatı olup olmadığı.
export const birimStokBilgileri = (
  vt: Veritabani | VeritabaniIslemi,
  birimler: string[],
  paraBirimi: string,
) => stokSatirlari(vt, birimler, paraBirimi);

// Birimlerin yalnız stoğu ve takibi (stok servisi): fiyata bakılmaz.
export const birimStoklariniOku = async (
  vt: Veritabani | VeritabaniIslemi,
  birimler: string[],
): Promise<Map<string, Pick<BirimStokBilgisi, "miktar" | "takip">>> =>
  new Map(
    [...(await stokSatirlari(vt, birimler, undefined))].map(([birim, { miktar, takip }]) => [
      birim,
      { miktar, takip },
    ]),
  );

// Birimlerin stok durumu, verilen ayarlarla.
export const stokDurumlari = async (
  vt: Veritabani | VeritabaniIslemi,
  birimler: string[],
  ayarlar: StokDurumAyarlari,
): Promise<Map<string, StokDurumu>> => {
  const bilgiler = await birimStokBilgileri(vt, birimler, ayarlar.paraBirimi);
  return new Map([...bilgiler].map(([birim, bilgi]) => [birim, stokDurumu(bilgi, ayarlar)]));
};

// Sitenin mağaza ayarlarıyla birimlerin stok durumu: ayar ve stok iki sorguda, birim sayısıyla artmaz.
export const siteninStokDurumlari = async (vt: Veritabani, site: Site, birimler: string[]) =>
  stokDurumlari(vt, birimler, await siteninStokAyarlari(vt, site));

// Ürünlerin genel stok durumu, verilen ayarlarla: birimler, stoklar üç sorguda, ürün sayısıyla artmaz.
// Olmayan ürün haritada yoktur; silinmemiş birimi olmayan ürün tükenmiştir.
export const urunStokDurumlari = async (
  vt: Veritabani,
  urunKimlikleri: string[],
  ayarlar: StokDurumAyarlari,
): Promise<Map<string, UrunStokDurumu>> => {
  const gecerli = urunKimlikleri.filter(kimlikMi).map(kimligiDuzelt);
  if (gecerli.length === 0) return new Map();
  const bulunan = await vt
    .select({ kimlik: urunler.kimlik })
    .from(urunler)
    .where(inArray(urunler.kimlik, gecerli));
  const birimleri = await urunlerinBirimleri(vt, gecerli);
  const durumlar = await stokDurumlari(vt, [...birimleri.values()].flat(), ayarlar);
  return new Map(
    bulunan.map(({ kimlik }) => [
      kimlik,
      urunStokDurumu(
        (birimleri.get(kimlik) ?? []).flatMap((birim) => {
          const durum = durumlar.get(birim);
          return durum === undefined ? [] : [durum];
        }),
      ),
    ]),
  );
};

// Sitenin mağaza ayarlarıyla ürünlerin genel stok durumu.
export const siteninUrunStokDurumlari = async (
  vt: Veritabani,
  site: Site,
  urunKimlikleri: string[],
) => urunStokDurumlari(vt, urunKimlikleri, await siteninStokAyarlari(vt, site));
