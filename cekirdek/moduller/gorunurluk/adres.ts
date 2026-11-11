// Vitrin adresinin çözülmesi (kart 0135, karar 0103). Kategori, marka, etiket ve ürün sayfası adresteki
// adres adını yalnız bununla kayda çevirir.
//
// Sıra:
// 1. Adres adı kalıba uymuyorsa sorgu atılmaz, kayıt yoktur.
// 2. Adı bu olan ve vitrinde sayfası açılan kayıt varsa odur. Ürün yayın durumuyla (vitrinKosulu, sayfa
//    yeri) süzülür; kategori, marka ve etiket silinmemişse açılır.
// 3. Yoksa eski adreslerde aranır: adı bir zamanlar bu olan kayıt hâlâ açılıyorsa onun bugünkü adına
//    yönlendirilir. Zincir yoktur, yönlendirme tek adımdır.
// 4. Hiçbiri değilse kayıt yoktur, sayfa "bulunamadı"dır.
import { and, eq, isNull } from "drizzle-orm";
import type { AdresliKayitTuru } from "../../kayitlar/adres.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { etiketler } from "../etiket/model.ts";
import { kategoriler } from "../kategori/model.ts";
import { markalar } from "../marka/model.ts";
import { urunler } from "../urun/model.ts";
import { vitrinKosulu } from "../urun/vitrin.ts";
import { eskiAdresler } from "./model.ts";

export type AdresliKayit = {
  kimlik: string;
  ad: string;
  adresAdi: string;
  aciklama: string | null;
};

export type AdresSonucu =
  | { sonuc: "kayit"; kayit: AdresliKayit }
  | { sonuc: "yonlendir"; adresAdi: string }
  | { sonuc: "yok" };

// Her türün tablosu, açıklama alanı ve vitrinde açılma koşulu. Ürünün sayfası tükenmiş olsa da açılır
// (karar 0069); tükenen ürün ayarı yalnız listeleri etkiler, bu yüzden burada "goster" verilir.
const kaynaklar = (an: Date | undefined) =>
  ({
    kategori: {
      tablo: kategoriler,
      aciklama: kategoriler.aciklama,
      acik: isNull(kategoriler.silinme_zamani),
    },
    marka: { tablo: markalar, aciklama: markalar.aciklama, acik: isNull(markalar.silinme_zamani) },
    etiket: {
      tablo: etiketler,
      aciklama: etiketler.aciklama,
      acik: isNull(etiketler.silinme_zamani),
    },
    urun: {
      tablo: urunler,
      aciklama: urunler.kisa_aciklama,
      acik: vitrinKosulu("sayfa", { ...(an === undefined ? {} : { an }), tukenenUrun: "goster" }),
    },
  }) as const satisfies Record<AdresliKayitTuru, unknown>;

export const adresAdiGecerliMi = (adresAdi: string): boolean =>
  adresAdi.length <= adresAdiUzunlugu && adresAdiKalibi.test(adresAdi);

export const kayitAdresiniCoz = async (
  vt: Veritabani,
  tur: AdresliKayitTuru,
  adresAdi: string,
  { an }: { an?: Date } = {},
): Promise<AdresSonucu> => {
  if (!adresAdiGecerliMi(adresAdi)) return { sonuc: "yok" };
  const { tablo, aciklama, acik } = kaynaklar(an)[tur];
  const alanlar = { kimlik: tablo.kimlik, ad: tablo.ad, adresAdi: tablo.adres_adi, aciklama };
  const [kayit] = await vt
    .select(alanlar)
    .from(tablo)
    .where(and(eq(tablo.adres_adi, adresAdi), acik))
    .limit(1);
  if (kayit !== undefined) return { sonuc: "kayit", kayit };
  // Eski ad türün tablosuna kimlikle bağlanır; kimlikler tablolar arasında da tekil olduğu için başka türün
  // satırı eşleşmez. Tür koşulu doğruluk için değil, aramanın (kayit_turu, adres_adi) indeksini kullanması içindir.
  const [eski] = await vt
    .select({ adresAdi: tablo.adres_adi })
    .from(eskiAdresler)
    .innerJoin(tablo, eq(tablo.kimlik, eskiAdresler.kayit_kimligi))
    .where(and(eq(eskiAdresler.kayit_turu, tur), eq(eskiAdresler.adres_adi, adresAdi), acik))
    .limit(1);
  return eski === undefined ? { sonuc: "yok" } : { sonuc: "yonlendir", adresAdi: eski.adresAdi };
};
