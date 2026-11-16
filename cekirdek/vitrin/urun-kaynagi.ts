// Ürün kaynaklarının ürünlerini getiren tek işlev (kart 0111, karar 0088). Ürün bölümleri ürünlerini
// yalnız buradan, vitrin bağlamı üzerinden alır; bölüm veritabanına kendisi gitmez.
//
// - Yalnız vitrinde liste yerinde görünen ürünler gelir (vitrinKosulu): taslak, gizli, arşiv, silinmiş ve
//   zamanı gelmemiş ürün gelmez; tükenen ürün mağaza sahibinin tukenenUrun ayarına uyar.
// - Her kaynak tek sorguyla süzülür (urun/liste.ts ve kategori servisinin sorgusu, sıra en yeni önce); bütün
//   kaynakların kartları birlikte urunKartlari ile gelir. Sorgu sayısı ürün sayısıyla artmaz.
// - Kategori kaynağı alt kategorilerin ürünlerini de getirir. Silinmiş kategori, marka ve etiketin ürünü
//   gelmez.
// - Elle seçimde ürünler seçilen sırayla gelir; görünmeyen ürün atlanır.
// - İndirimdekiler: indirimi kartta görünen (rozetli) ürünler, en yeni önce. Eski fiyatı gösterilemeyen (30 gün
//   kuralı) ya da indirimi yalnız satılamayan birleşimde olan ürün gelmez.
// - Fırsatlar (geri sayım): bitişi olan süren indirimler, kartın gösterdiği bitişe (fiyatAraliklari: satılabilir
//   birimlerin kartta görünen indirimlerinin en yakın bitişi) göre en yakın biten önce. Kartında bitiş olmayan
//   ürün (süresiz, gösterilemeyen ya da yalnız satılamayan birleşimdeki indirim) gelmez.

import { sql } from "drizzle-orm";
import type { Site } from "../ayar-semasi/site-klasoru";
import { listeSayfasi } from "../kayitlar/liste";
import { etiketServisi } from "../moduller/etiket/servis";
import { indirimdekiUrunKosulu } from "../moduller/fiyat/vitrin";
import { kategorininUrunleri } from "../moduller/kategori/servis";
import { siteninMagazaAyarlari } from "../moduller/magaza-ayarlari/servis";
import { markaServisi } from "../moduller/marka/servis";
import { urunListesi } from "../moduller/urun/liste";
import { vitrinStokSecenegi } from "../moduller/urun/vitrin";
import type { Veritabani } from "../veritabani/baglanti";
import { kimligiDuzelt } from "../veritabani/kimlik";
import { type UrunKaynagi, urunKaynagiAnahtari } from "./bolum-kutuphanesi/urun-kaynagi";
import type { UrunKartiVerisi } from "./urun-karti/tur";
import { urunKartlari } from "./urun-karti/veri";

export const kaynaklarinUrunleri = async (
  vt: Veritabani,
  site: Site,
  kaynaklar: readonly UrunKaynagi[],
  an: Date,
): Promise<Record<string, readonly UrunKartiVerisi[]>> => {
  const tekil = new Map(kaynaklar.map((kaynak) => [urunKaynagiAnahtari(kaynak), kaynak]));
  if (tekil.size === 0) return {};
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  const vitrin = { yer: "liste" as const, an, ...vitrinStokSecenegi(site, ayarlar) };
  const kimlikleri = async (kaynak: UrunKaynagi): Promise<readonly string[]> => {
    switch (kaynak.tur) {
      case "elle":
        // Şema aynı ürünü iki kez kabul etmez; harf farkıyla gelen eski bir değer de tek kart verir.
        return [...new Set(kaynak.urunler.map(kimligiDuzelt))];
      case "kategori":
        return (
          await kategorininUrunleri(vt, kaynak.kategori, {
            altKategoriler: true,
            vitrin,
            boyut: kaynak.adet,
          })
        ).urunler;
      case "marka":
        return (await markaServisi.urunleri(vt, kaynak.marka, { vitrin, boyut: kaynak.adet }))
          .urunler;
      case "etiket":
        return (await etiketServisi.urunleri(vt, kaynak.etiket, { vitrin, boyut: kaynak.adet }))
          .urunler;
      case "yeni":
        return (await urunListesi(vt, sql`true`, { vitrin, boyut: kaynak.adet })).urunler;
      case "indirimli":
      case "firsat":
        // Kartta indirimi görünmeyen ürün (eski fiyatı gösterilemeyen, indirimi yalnız satılamayan birleşimde
        // olan) iki kaynakta da süzülür; fırsatlarda sıra kartın bitişinden kurulur. Aday listenin sınırı bu
        // yüzden sayfanın en büyük boyutudur.
        return (
          await urunListesi(
            vt,
            indirimdekiUrunKosulu({
              an,
              paraBirimi: site.ayarlar.paraBirimi,
              yalnizBitisli: kaynak.tur === "firsat",
            }),
            { vitrin, boyut: listeSayfasi.enCokBoyut },
          )
        ).urunler;
    }
  };
  const listeler = await Promise.all(
    [...tekil].map(
      async ([anahtar, kaynak]) => [anahtar, kaynak, await kimlikleri(kaynak)] as const,
    ),
  );
  const kartlar = await urunKartlari(
    vt,
    site,
    listeler.flatMap(([, , kimlikler]) => kimlikler),
    { yer: "liste", an },
  );
  const kartlarim = new Map(kartlar.map((kart) => [kart.kimlik, kart]));
  return Object.fromEntries(
    listeler.map(([anahtar, kaynak, kimlikler]) => {
      const bulunan = kimlikler.flatMap((kimlik) => {
        const kart = kartlarim.get(kimligiDuzelt(kimlik));
        return kart === undefined ? [] : [kart];
      });
      if (kaynak.tur === "indirimli") {
        // İndirimi kartta görünen: rozeti olan (fiyatAraliklari'nın indirim oranı, kart 0111 kontrolü).
        return [
          anahtar,
          bulunan.filter((kart) => kart.fiyat?.indirim !== undefined).slice(0, kaynak.adet),
        ];
      }
      if (kaynak.tur !== "firsat") return [anahtar, bulunan];
      const bitis = (kart: UrunKartiVerisi) => kart.fiyat?.indirimBitisi?.getTime();
      return [
        anahtar,
        bulunan
          .filter((kart) => bitis(kart) !== undefined)
          .toSorted((a, b) => (bitis(a) ?? 0) - (bitis(b) ?? 0))
          .slice(0, kaynak.adet),
      ];
    }),
  );
};
