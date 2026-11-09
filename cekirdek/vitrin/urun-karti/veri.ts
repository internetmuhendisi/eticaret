// Ürün kartlarının verisi (kart 0109, karar 0085). Kartta görünen her bilgi çekirdeğin tek işlevinden gelir,
// burada ikinci bir hesap yapılmaz:
//
// - Görünürlük vitrinKosulu ile (çağıranın yeri: liste ya da sayfa). Görünmeyen ürünün kartı yoktur;
//   zamanlanmış ürün yayın zamanına kadar görünmez, zamanı gelince yayında gibidir.
// - Fiyat ya da fiyat aralığı ve indirim oranı fiyatAraliklari ile (karar 0067, 0071).
// - Stok durumu urunStokDurumu ile (karar 0069).
// - Görsel anaGorseller ile; adresler ürün görseli ucundandır, boyutları kayıttandır (karar 0073).
// - Marka silinmemiş markanın adıdır.
//
// Bütün ürünler birkaç sorguyla gelir, ürün başına sorgu atılmaz. Sonuç verilen sırayla döner.
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { GorselBoyutu } from "../../kayitlar/gorsel.ts";
import type { VitrinYeri } from "../../kayitlar/urun.ts";
import { fiyatGosterimServisi } from "../../moduller/fiyat/gosterim.ts";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis.ts";
import { markalar, urunMarkalari } from "../../moduller/marka/model.ts";
import { urunStokDurumlari } from "../../moduller/stok/durum.ts";
import { anaGorseller, type GaleriGorseli } from "../../moduller/urun/galeri.ts";
import { urunler } from "../../moduller/urun/model.ts";
import { vitrinKosulu } from "../../moduller/urun/vitrin.ts";
import { urunGorseliAdresi } from "../../moduller/urun/vitrin-gorseli.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { kayitAdresleri } from "../adresler.ts";
import type { UrunKartiGorseli, UrunKartiVerisi } from "./tur.ts";

// Kartın kullandığı boyutlar, küçükten büyüğe; tarayıcı yerine göre seçer. Tam boyut ürün sayfasınındır.
const kartBoyutlari: readonly GorselBoyutu[] = ["kucuk", "orta", "buyuk"];

export const kartGorseli = (gorsel: GaleriGorseli): UrunKartiGorseli | undefined => {
  const kaynaklar = kartBoyutlari.flatMap((boyut) => {
    const dosya = gorsel.boyutlar[boyut];
    return dosya === undefined
      ? []
      : [{ adres: urunGorseliAdresi(gorsel.kimlik, boyut), genislik: dosya.genislik }];
  });
  const olcu = gorsel.boyutlar.orta ?? gorsel.boyutlar.buyuk ?? gorsel.boyutlar.kucuk;
  if (kaynaklar.length === 0 || olcu === undefined) return undefined;
  return {
    alternatifMetin: gorsel.alternatifMetin,
    kaynaklar,
    genislik: olcu.genislik,
    yukseklik: olcu.yukseklik,
  };
};

export const urunKartlari = async (
  vt: Veritabani,
  site: Site,
  urunKimlikleri: readonly string[],
  secenekler: { yer: VitrinYeri; an?: Date },
): Promise<UrunKartiVerisi[]> => {
  // Kimlik büyük harfle de gelebilir (kart 0119); veritabanı küçük harfle döner.
  const gecerli = [
    ...new Set(urunKimlikleri.filter(kimlikMi).map((kimlik) => kimlik.toLowerCase())),
  ];
  if (gecerli.length === 0) return [];
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  const an = secenekler.an;
  const satirlar = await vt
    .select({
      kimlik: urunler.kimlik,
      ad: urunler.ad,
      adresAdi: urunler.adres_adi,
      marka: markalar.ad,
    })
    .from(urunler)
    .leftJoin(urunMarkalari, eq(urunMarkalari.urun_kimligi, urunler.kimlik))
    .leftJoin(
      markalar,
      and(eq(markalar.kimlik, urunMarkalari.grup_kimligi), isNull(markalar.silinme_zamani)),
    )
    .where(
      and(
        inArray(urunler.kimlik, gecerli),
        vitrinKosulu(secenekler.yer, {
          ...(an === undefined ? {} : { an }),
          tukenenUrun: ayarlar.tukenenUrun,
        }),
      ),
    );
  const gorunenler = satirlar.map((satir) => satir.kimlik);
  const [gorseller, fiyatlar, stoklar] = await Promise.all([
    anaGorseller(vt, gorunenler),
    fiyatGosterimServisi(site).fiyatAraliklari(vt, gorunenler, an === undefined ? {} : { an }),
    urunStokDurumlari(vt, gorunenler, ayarlar),
  ]);
  const bulunan = new Map(satirlar.map((satir) => [satir.kimlik, satir]));
  return gecerli.flatMap((kimlik) => {
    const satir = bulunan.get(kimlik);
    if (satir === undefined) return [];
    const ana = gorseller.get(satir.kimlik);
    const gorsel = ana === undefined ? undefined : kartGorseli(ana);
    const fiyat = fiyatlar.get(satir.kimlik);
    return [
      {
        kimlik: satir.kimlik,
        ad: satir.ad,
        adres: kayitAdresleri.urun(satir.adresAdi),
        ...(satir.marka === null ? {} : { marka: satir.marka }),
        ...(gorsel === undefined ? {} : { gorsel }),
        ...(fiyat === undefined ? {} : { fiyat }),
        tukendi: stoklar.get(satir.kimlik)?.tukendi ?? true,
      },
    ];
  });
};
