// Stok durumu (kart 0083, karar 0069): bir birimin satılabilir olup olmadığı, tükenip tükenmediği,
// düşük stokta olup olmadığı ve müşteriye ne yazılacağı yalnız buradan bulunur.
//
// Kurallar:
// - Takibi kapalı ürün her zaman satılabilir, tükenmez, düşük stokta olmaz; müşteriye "stokta" yazılır.
// - Takip açıksa stok sıfırsa birim tükenmiştir ve satılamaz. Ürün, silinmemiş birimlerinin hiçbirinde
//   stok kalmayınca tükenmiştir (vitrin listesi için tukenmisUrunKosulu).
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

// Sorgudaki ürün satırı (urunler tablosu, takma adsız) tükenmiş mi: takip açık ve silinmemiş hiçbir
// biriminde stok yok. Stok satırı olmayan birimin stoğu sıfırdır.
export const tukenmisUrunKosulu = (): SQL => sql`(${urunler.stok_takibi} and not exists (
  select 1 from ${urunBirimleri}
  join ${birimStoklari} on ${birimStoklari.birim_kimligi} = ${urunBirimleri.kimlik}
  where ${urunBirimleri.urun_kimligi} = ${urunler.kimlik}
    and ${urunBirimleri.silinme_zamani} is null and ${birimStoklari.miktar} > 0
))`;

// Birimlerin stok bilgisi tek sorguyla; olmayan birim haritada yoktur. Silinmiş birim de okunur:
// birimin satılıp satılamayacağına (silinmiş, görünmeyen ürün) sepet kendi koşuluyla bakar.
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
