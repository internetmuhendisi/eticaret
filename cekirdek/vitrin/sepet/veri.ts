// Sepetin vitrin verisi (kart 0212, karar 0135). Sepet sayfası ve sepet penceresi sepeti yalnız buradan alır: tutarlar
// sepetin tek hesabından (cekirdek/moduller/sepet/hesap.ts), fiyatın gösterimi fiyat gösterim işlevinden
// (gosterilecekFiyatlar, araliginiKur), görsel birimin görselinden (birimGorseli), yazılışlar sitenin
// biçimleyicisinden gelir. Burada hesap yapılmaz, yalnız ad, seçim, görsel ve yazılışlar eklenir.
//
// Veri tarayıcıya JSON olarak gider (herkese açık sepet ucu): tarih taşımaz, fiyat yalnız gösterimin alanlarıyla gelir.
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { fiyatGosterimServisi } from "../../moduller/fiyat/gosterim.ts";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis.ts";
import {
  type SepetHesabi,
  type SepetHesapSatiri,
  type SepetSatirUyarisi,
  sepetiHesapla,
} from "../../moduller/sepet/hesap.ts";
import type { SepetKalemi, VergiBolgeleri } from "../../moduller/sepet/semalar.ts";
import { birimGorseli, urunGalerileri } from "../../moduller/urun/galeri.ts";
import {
  urunBirimiDegerleri,
  urunBirimleri,
  urunler,
  urunSecenekDegerleri,
  urunSecenekleri,
} from "../../moduller/urun/model.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kayitAdresleri } from "../adresler.ts";
import type { GosterimFiyati } from "../urun-karti/fiyat-turu.ts";
import type { UrunKartiGorseli } from "../urun-karti/tur.ts";
import { kartGorseli } from "../urun-karti/veri.ts";

export type SepetGorunumuSatiri = Pick<
  SepetHesapSatiri,
  "birim" | "istenenAdet" | "adet" | "enAz" | "enCok" | "satilabilir"
> & {
  // Sayfası açılmayan birimde ad ve adres yoktur.
  urun?: { kimlik: string; ad: string; adres: string };
  // Birleşimin seçenekleri ürünün sırasıyla ("Renk: Lacivert"); basit üründe boş.
  secim: { secenek: string; deger: string }[];
  gorsel?: UrunKartiGorseli;
  // Fiyat değişikliğinde müşterinin son gördüğü fiyat yazılı olarak da gelir.
  uyarilar: (SepetSatirUyarisi & { eskiYazili?: string })[];
  // Satılabilir satırda birim fiyatı ve satırın tutarı.
  fiyat?: GosterimFiyati;
  birimTutari?: number;
  yaziliTutar?: string;
};

export type SepetGorunumu = {
  satirlar: SepetGorunumuSatiri[];
  adet: number;
  gosterim: SepetHesabi["gosterim"];
  kargo: SepetHesabi["kargo"]["tur"];
  vergiDokumu: { ad?: string; oran: string; yazili: string }[];
  yazili: { araToplam: string; kargo?: string; vergi: string; toplam: string };
  odemeyeGecilebilir: boolean;
};

// Fiyat gösteriminden tarayıcıya giden alanlar (tarihsiz).
const gosterimFiyati = (
  fiyat: NonNullable<ReturnType<ReturnType<typeof fiyatGosterimServisi>["araliginiKur"]>>,
): GosterimFiyati => ({
  tek: fiyat.tek,
  yaziliAralik: fiyat.yaziliAralik,
  enDusuk: {
    tutar: fiyat.enDusuk.tutar,
    yazili: fiyat.enDusuk.yazili,
    ...(fiyat.enDusuk.ekMetin === undefined ? {} : { ekMetin: fiyat.enDusuk.ekMetin }),
  },
  enYuksek: { tutar: fiyat.enYuksek.tutar },
});

export const sepetGorunumu = async (
  vt: Veritabani,
  site: Site,
  kalemler: readonly SepetKalemi[],
  { an = new Date(), adresler = {} }: { an?: Date; adresler?: VergiBolgeleri } = {},
): Promise<SepetGorunumu> => {
  const hesap = await sepetiHesapla(vt, site, kalemler, { an, adresler });
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const gosterim = fiyatGosterimServisi(site);
  const satilanlar = hesap.satirlar
    .filter((satir) => satir.satilabilir)
    .map((satir) => satir.birim);
  const urunKimlikleri = [
    ...new Set(hesap.satirlar.flatMap((satir) => (satir.urun === undefined ? [] : [satir.urun]))),
  ];
  const birimler = hesap.satirlar.flatMap((satir) =>
    satir.urun === undefined ? [] : [satir.birim],
  );
  const [urunSatirlari, birimSatirlari, degerler, galeriler, fiyatlar, ayarlar] = await Promise.all(
    [
      urunKimlikleri.length === 0
        ? []
        : vt
            .select({ kimlik: urunler.kimlik, ad: urunler.ad, adresAdi: urunler.adres_adi })
            .from(urunler)
            .where(inArray(urunler.kimlik, urunKimlikleri)),
      birimler.length === 0
        ? []
        : vt
            .select({ kimlik: urunBirimleri.kimlik, gorsel: urunBirimleri.gorsel_kimligi })
            .from(urunBirimleri)
            .where(inArray(urunBirimleri.kimlik, birimler)),
      birimler.length === 0
        ? []
        : vt
            .select({
              birim: urunBirimiDegerleri.birim_kimligi,
              secenek: urunSecenekleri.ad,
              deger: urunSecenekDegerleri.ad,
            })
            .from(urunBirimiDegerleri)
            .innerJoin(
              urunSecenekDegerleri,
              eq(urunSecenekDegerleri.kimlik, urunBirimiDegerleri.deger_kimligi),
            )
            .innerJoin(
              urunSecenekleri,
              and(eq(urunSecenekleri.kimlik, urunSecenekDegerleri.secenek_kimligi)),
            )
            .where(inArray(urunBirimiDegerleri.birim_kimligi, birimler))
            .orderBy(asc(urunSecenekleri.sira), asc(urunSecenekleri.kimlik)),
      urunGalerileri(vt, urunKimlikleri, { sadeceGorsel: true }),
      gosterim.gosterilecekFiyatlar(vt, satilanlar, { an }),
      siteninMagazaAyarlari(vt, site),
    ],
  );
  const urunHaritasi = new Map(urunSatirlari.map((satir) => [satir.kimlik, satir]));
  const birimGorselleri = new Map(birimSatirlari.map((satir) => [satir.kimlik, satir.gorsel]));

  const satirlar = hesap.satirlar.map((satir): SepetGorunumuSatiri => {
    const urun = satir.urun === undefined ? undefined : urunHaritasi.get(satir.urun);
    const galeri = satir.urun === undefined ? undefined : galeriler.get(satir.urun);
    const secilen = birimGorselleri.get(satir.birim);
    const gorsel =
      galeri === undefined
        ? undefined
        : birimGorseli(
            {
              galeri,
              birimler: [{ kimlik: satir.birim, ...(secilen == null ? {} : { gorsel: secilen }) }],
            },
            satir.birim,
          );
    const kart = gorsel === undefined ? undefined : kartGorseli(gorsel);
    const birimFiyati = fiyatlar.get(satir.birim);
    const aralik = birimFiyati === undefined ? undefined : gosterim.araliginiKur([birimFiyati]);
    return {
      birim: satir.birim,
      istenenAdet: satir.istenenAdet,
      adet: satir.adet,
      enAz: satir.enAz,
      enCok: satir.enCok,
      satilabilir: satir.satilabilir,
      ...(urun === undefined
        ? {}
        : {
            urun: { kimlik: urun.kimlik, ad: urun.ad, adres: kayitAdresleri.urun(urun.adresAdi) },
          }),
      secim: degerler
        .filter((deger) => deger.birim === satir.birim)
        .map(({ secenek, deger }) => ({ secenek, deger })),
      ...(kart === undefined ? {} : { gorsel: kart }),
      uyarilar: satir.uyarilar.map((uyari) =>
        uyari.kod === "fiyat-degisti"
          ? { ...uyari, eskiYazili: bicim.para(uyari.eskiTutar) }
          : uyari,
      ),
      ...(aralik === undefined || !satir.satilabilir ? {} : { fiyat: gosterimFiyati(aralik) }),
      ...(satir.birimTutari === undefined ? {} : { birimTutari: satir.birimTutari }),
      ...(satir.tutar === undefined ? {} : { yaziliTutar: bicim.para(satir.tutar) }),
    };
  });

  return {
    satirlar,
    adet: hesap.adet,
    gosterim: hesap.gosterim,
    kargo: hesap.kargo.tur,
    vergiDokumu: hesap.vergi.dokum.map((satir) => {
      const ad = satir.ad ?? ayarlar.vergiAdi;
      return {
        ...(ad === undefined ? {} : { ad }),
        // Oran milyonda bir birimindedir (vergi/semalar.ts).
        oran: bicim.yuzde(satir.oran / 10_000),
        yazili: bicim.para(satir.vergi),
      };
    }),
    yazili: {
      araToplam: bicim.para(hesap.araToplam),
      ...(hesap.kargo.tur === "ucretli" ? { kargo: bicim.para(hesap.kargo.tutar) } : {}),
      vergi: bicim.para(hesap.vergi.toplam),
      toplam: bicim.para(hesap.toplam),
    },
    odemeyeGecilebilir: hesap.odemeyeGecilebilir,
  };
};
