// Stok durumu (kart 0083, karar 0069): bir birimin satılabilir olup olmadığı, tükenip tükenmediği,
// düşük stokta olup olmadığı ve müşteriye ne yazılacağı yalnız buradan bulunur.
//
// Kurallar:
// - Silinmiş birim (ya da silinmiş ürünün birimi) satılamaz ve tükenmiş sayılır (kart 0083 kontrolü).
// - Takibi kapalı ürünün silinmemiş birimi her zaman satılabilir, tükenmez, düşük stokta olmaz;
//   müşteriye "stokta" yazılır.
// - Takip açıksa stok sıfırsa birim tükenmiştir ve satılamaz.
// - Ürün, satılabilir tek bir birimi kalmayınca tükenmiştir (vitrin listesi için tukenmisUrunKosulu).
//   İki kural aynı tanımı kullanır: birim, silinmemişse ve takip kapalıysa ya da stoğu varsa satılabilir.
//   Ürün düzeyindeki durum (varyantlı üründe birimlerin birleşimi) kart 0085 ile gelir.
// - Düşük stok: stok sıfırdan büyük ve eşiğe eşit ya da altında. Eşik ürünün kendi eşiği, yoksa mağaza
//   ayarı (dusukStokEsigi). Eşik 0 düşük stoğu kapatır.
// - Müşteriye yazılan: tükendiyse "tukendi"; stok sonAdetEsigi'ne eşit ya da altındaysa "son-adet" ve
//   kalan adet; değilse "stokta". sonAdetEsigi 0 kalan adeti hiç yazdırmaz.
//
// Tükenen ürünün vitrinde gizlenmesi ürünün vitrin koşulundadır (urun/vitrin.ts): koşul tükenmişliği
// buradaki tukenmisUrunKosulu ile sınar. İki kuralın aynı sonucu verdiğini test denetler.
import { eq, inArray, type SQL, sql } from "drizzle-orm";
import type { MagazaAyarlari } from "../../ayar-semasi/ayarlar.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { StokGosterimi } from "../../kayitlar/stok.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { birimStoklari } from "./model.ts";

export type StokDurumAyarlari = Pick<MagazaAyarlari, "dusukStokEsigi" | "sonAdetEsigi">;

export type BirimStokBilgisi = {
  miktar: number;
  takip: boolean;
  // Ürünün kendi düşük stok eşiği; null ise mağaza ayarı.
  dusukStokEsigi: number | null;
  // Birim ya da ürünü silinmiş.
  silinmis: boolean;
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
  if (stok.silinmis) {
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

// Sorgudaki ürün satırı tükenmiş mi: satılabilir tek bir birimi yok (silinmemiş, takip kapalı ya da
// stoğu var). Stok satırı olmayan birimin stoğu sıfırdır.
// Dış sorgudaki urunler tablosu takma adsız olmalıdır: sütunlar "urunler".… diye yazılır; takma adlı
// bir urunler içinde kullanılırsa koşul sessizce dıştaki satıra bağlanır (kart 0083 kontrolü).
export const tukenmisUrunKosulu = (): SQL => sql`(not exists (
  select 1 from ${urunBirimleri}
  left join ${birimStoklari} on ${birimStoklari.birim_kimligi} = ${urunBirimleri.kimlik}
  where ${urunBirimleri.urun_kimligi} = ${urunler.kimlik}
    and ${urunBirimleri.silinme_zamani} is null
    and (not ${urunler.stok_takibi} or ${birimStoklari.miktar} > 0)
))`;

// Birimlerin stok bilgisi tek sorguyla; olmayan birim haritada yoktur. Silinmiş birim de okunur ve
// silinmiş diye işaretlenir. Ürünün vitrinde görünüp görünmediğine (taslak, gizli) burada bakılmaz: o
// vitrinKosulu'nun işidir, sepet ikisini birlikte sınar.
export const birimStokBilgileri = async (
  vt: Veritabani,
  birimler: string[],
): Promise<Map<string, BirimStokBilgisi>> => {
  const gecerli = birimler.filter(kimlikMi);
  if (gecerli.length === 0) return new Map();
  const satirlar = await vt
    .select({
      birim: urunBirimleri.kimlik,
      miktar: sql<number>`coalesce(${birimStoklari.miktar}, 0)`.mapWith(Number),
      takip: urunler.stok_takibi,
      dusukStokEsigi: urunler.dusuk_stok_esigi,
      silinmis: sql<boolean>`(${urunBirimleri.silinme_zamani} is not null or ${urunler.silinme_zamani} is not null)`,
    })
    .from(urunBirimleri)
    .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
    .leftJoin(birimStoklari, eq(birimStoklari.birim_kimligi, urunBirimleri.kimlik))
    .where(inArray(urunBirimleri.kimlik, gecerli));
  return new Map(satirlar.map(({ birim, ...bilgi }) => [birim, bilgi]));
};

// Birimlerin stok durumu, verilen ayarlarla.
export const stokDurumlari = async (
  vt: Veritabani,
  birimler: string[],
  ayarlar: StokDurumAyarlari,
): Promise<Map<string, StokDurumu>> => {
  const bilgiler = await birimStokBilgileri(vt, birimler);
  return new Map([...bilgiler].map(([birim, bilgi]) => [birim, stokDurumu(bilgi, ayarlar)]));
};

// Sitenin mağaza ayarlarıyla birimlerin stok durumu: ayar ve stok iki sorguda, birim sayısıyla artmaz.
export const siteninStokDurumlari = async (vt: Veritabani, site: Site, birimler: string[]) =>
  stokDurumlari(vt, birimler, await siteninMagazaAyarlari(vt, site));
