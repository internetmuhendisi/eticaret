// Siparişteki ürünlerin bugünkü görseli ve sayfası (kart 0238): Siparişlerim ve sipariş ayrıntısı. Kalemin adı, seçimi
// ve fiyatı siparişte saklıdır; burada yalnız görsel ve bağlantı eklenir. Sayfası bugün açılmayan ürünün (taslağa
// alınan, silinen) ne görseli ne bağlantısı vardır: ürün görseli ucu da onun görselini vermez. Görsel birimin
// görselidir (birimGorseli), sepetteki gibi. Sorgu sayısı kalem sayısıyla artmaz (üç sorgu).
import { and, inArray } from "drizzle-orm";
import { birimGorseli, urunGalerileri } from "../../moduller/urun/galeri.ts";
import { urunBirimleri, urunler } from "../../moduller/urun/model.ts";
import { vitrinKosulu } from "../../moduller/urun/vitrin.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kayitAdresleri } from "../adresler.ts";
import type { UrunKartiGorseli } from "../urun-karti/tur.ts";
import { kartGorseli } from "../urun-karti/veri.ts";

export type SiparisUrunu = { adres?: string; gorsel?: UrunKartiGorseli };

export const siparisUrunleri = async (
  vt: Veritabani,
  kalemler: readonly { birim: string; urun: string }[],
): Promise<Map<string, SiparisUrunu>> => {
  const sonuc = new Map<string, SiparisUrunu>();
  const urunKimlikleri = [...new Set(kalemler.map((kalem) => kalem.urun))];
  if (urunKimlikleri.length === 0) return sonuc;
  const acik = await vt
    .select({ kimlik: urunler.kimlik, adresAdi: urunler.adres_adi })
    .from(urunler)
    .where(
      and(
        inArray(urunler.kimlik, urunKimlikleri),
        // Sayfa yeri: tükenen ürünün sayfası da açılır, ayar etkisizdir.
        vitrinKosulu("sayfa", { tukenenUrun: "goster" }),
      ),
    );
  const acikHaritasi = new Map(acik.map((satir) => [satir.kimlik, satir.adresAdi]));
  const acikUrunler = [...acikHaritasi.keys()];
  const birimler = [
    ...new Set(
      kalemler.filter((kalem) => acikHaritasi.has(kalem.urun)).map((kalem) => kalem.birim),
    ),
  ];
  const [galeriler, birimSatirlari] = await Promise.all([
    urunGalerileri(vt, acikUrunler, { sadeceGorsel: true }),
    birimler.length === 0
      ? []
      : vt
          .select({ kimlik: urunBirimleri.kimlik, gorsel: urunBirimleri.gorsel_kimligi })
          .from(urunBirimleri)
          .where(inArray(urunBirimleri.kimlik, birimler)),
  ]);
  const birimGorselleri = new Map(birimSatirlari.map((satir) => [satir.kimlik, satir.gorsel]));
  for (const kalem of kalemler) {
    const adresAdi = acikHaritasi.get(kalem.urun);
    if (adresAdi === undefined) continue;
    const galeri = galeriler.get(kalem.urun);
    const secilen = birimGorselleri.get(kalem.birim);
    const gorsel =
      galeri === undefined
        ? undefined
        : birimGorseli(
            {
              galeri,
              birimler: [{ kimlik: kalem.birim, ...(secilen == null ? {} : { gorsel: secilen }) }],
            },
            kalem.birim,
          );
    const kart = gorsel === undefined ? undefined : kartGorseli(gorsel);
    sonuc.set(kalem.birim, {
      adres: kayitAdresleri.urun(adresAdi),
      ...(kart === undefined ? {} : { gorsel: kart }),
    });
  }
  return sonuc;
};
