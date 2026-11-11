// Vitrinin filtreli ürün listesi (kart 0136, karar 0102): kategori, marka ve etiket sayfası (arama kart 0137)
// listesini, filtre seçeneklerini ve sayılarını buradan alır.
//
// - Kapsam (kategori ağacı, marka, etiket) çağıranın koşuludur; görünürlük ve tükenen ürün ayarı vitrin
//   koşulundandır (urun/vitrin.ts, liste yeri). Kapsamdaki görünür ürünler sırasıyla tek sorguyla gelir:
//   önerilen (ürünün vitrin sırası, sonra en yeni önce) ya da en yeni önce.
// - Markalar, birimler (stok ve seçenek değerleriyle) ve filtrede kullanılan özellikler kapsamın üç sorgusuyla
//   gelir; filtre, sayılar ve sıralama filtre.ts'nin saf işlevleriyle hesaplanır. Fiyat yalnız fiyat filtresi
//   ya da sıralaması varken, kartın fiyatını veren işlevle (fiyatAraliklari) hesaplanır. Sorgu sayısı ürün
//   sayısıyla artmaz.
// - Bedel: kapsamdaki bütün ürünlerin filtre verisi belleğe okunur (karar 0105). Ölçümü testtedir.
import { and, asc, eq, isNull, type SQL, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru";
import type { ListeSiralamasi } from "../../kayitlar/liste";
import type { TukenenUrunDavranisi } from "../../kayitlar/stok";
import { adresAdiUret } from "../../metinler/adres-adi";
import { metinOkuyucu } from "../../metinler/metin";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { fiyatGosterimServisi } from "../../moduller/fiyat/gosterim";
import { markalar, urunMarkalari } from "../../moduller/marka/model";
import { ozellikler, ozellikSecenekleri, urunOzellikDegerleri } from "../../moduller/ozellik/model";
import { birimStoklari } from "../../moduller/stok/model";
import {
  bosFiltre,
  type FiltreAdayi,
  type FiltreBirimi,
  type FiltreGrubu,
  filtreyeUyarMi,
  fiyataGoreSirala,
  fiyatFiltresiVarMi,
  secenekSayisi,
  type UrunFiltresi,
} from "../../moduller/urun/filtre";
import {
  urunBirimiDegerleri,
  urunBirimleri,
  urunler,
  urunSecenekDegerleri,
  urunSecenekleri,
} from "../../moduller/urun/model";
import { vitrinKosulu } from "../../moduller/urun/vitrin";
import type { Veritabani } from "../../veritabani/baglanti";

export type FiltreSecenegi = { anahtar: string; ad: string; adet: number; secili: boolean };
export type FiltreSecenekGrubu = { anahtar: string; ad: string; secenekler: FiltreSecenegi[] };

export type FiltreSecenekleri = {
  markalar: FiltreSecenegi[];
  secenekler: FiltreSecenekGrubu[];
  ozellikler: FiltreSecenekGrubu[];
  // "Yalnız stoktakiler" seçeneğinin sayısı.
  stoktakiler: { adet: number; secili: boolean };
};

export type FiltreliListe = {
  // Sayfanın ürünleri, sırasıyla (kartları çağıran urunKartlari ile alır).
  urunler: string[];
  // Filtreye uyan ürün sayısı.
  toplam: number;
  // Kapsamdaki görünür ürün sayısı (filtresiz).
  kapsamToplami: number;
  sayfa: number;
  toplamSayfa: number;
  secenekler: FiltreSecenekleri;
};

export type FiltreliListeSecenekleri = {
  // Kapsamın koşulu, urunler satırı üzerinde (kategoriUrunKosulu, grup servisinin urunKosulu).
  kapsam: SQL;
  filtre?: UrunFiltresi;
  siralama: ListeSiralamasi;
  sayfa: number;
  boyut: number;
  // "Daha fazla göster": ilk sayfadan bu sayfanın sonuna kadar olan ürünler gelir.
  birikimli?: boolean;
  tukenenUrun: TukenenUrunDavranisi;
  an: Date;
};

// Okunur anahtar: addan üretilen adres adı; addan harf kalmazsa (Latin dışı yazı) adın kendisi.
const anahtarUret = (ad: string): string => adresAdiUret(ad) || ad.trim();

type Etiketler = Map<
  string,
  { ad: string; sira: number; degerler: Map<string, { ad: string; sira: number }> }
>;
const etiketEkle = (
  etiketler: Etiketler,
  grup: string,
  grupAdi: string,
  grupSirasi: number,
  deger: string,
  degerAdi: string,
  degerSirasi: number,
) => {
  const mevcut = etiketler.get(grup) ?? { ad: grupAdi, sira: grupSirasi, degerler: new Map() };
  mevcut.sira = Math.min(mevcut.sira, grupSirasi);
  etiketler.set(grup, mevcut);
  const degerEtiketi = mevcut.degerler.get(deger);
  if (degerEtiketi === undefined) mevcut.degerler.set(deger, { ad: degerAdi, sira: degerSirasi });
  else degerEtiketi.sira = Math.min(degerEtiketi.sira, degerSirasi);
};

const siraliGirdiler = <T extends { ad: string; sira: number }>(harita: Map<string, T>) =>
  [...harita.entries()].toSorted(([, a], [, b]) => a.sira - b.sira || a.ad.localeCompare(b.ad));

export const filtreliUrunListesi = async (
  vt: Veritabani,
  site: Site,
  secenek: FiltreliListeSecenekleri,
): Promise<FiltreliListe> => {
  const filtre = secenek.filtre ?? bosFiltre();
  const gorunur = vitrinKosulu("liste", { an: secenek.an, tukenenUrun: secenek.tukenenUrun });
  const adaySorgusu = sql`select ${urunler.kimlik} from ${urunler}
    where ${urunler.silinme_zamani} is null and ${secenek.kapsam} and ${gorunur}`;
  const sira =
    secenek.siralama === "onerilen"
      ? sql`${urunler.vitrin_sirasi} asc nulls last, ${urunler.olusturma_zamani} desc, ${urunler.kimlik}`
      : sql`${urunler.olusturma_zamani} desc, ${urunler.kimlik}`;

  const [sirali, markaSatirlari, birimSatirlari, ozellikSatirlari] = await Promise.all([
    vt.execute<{ kimlik: string }>(sql`
      select ${urunler.kimlik} as kimlik from ${urunler}
      where ${urunler.silinme_zamani} is null and ${secenek.kapsam} and ${gorunur}
      order by ${sira}`),
    vt
      .select({ urun: urunMarkalari.urun_kimligi, adresAdi: markalar.adres_adi, ad: markalar.ad })
      .from(urunMarkalari)
      .innerJoin(markalar, eq(markalar.kimlik, urunMarkalari.grup_kimligi))
      .where(
        and(
          isNull(markalar.silinme_zamani),
          sql`${urunMarkalari.urun_kimligi} in (${adaySorgusu})`,
        ),
      ),
    // Birim, stokta mı, ve seçenek değerleri (basit ürünün biriminin değeri yoktur: tek satır, değersiz).
    vt
      .select({
        urun: urunBirimleri.urun_kimligi,
        birim: urunBirimleri.kimlik,
        stokta: sql<boolean>`(not ${urunler.stok_takibi} or coalesce(${birimStoklari.miktar}, 0) > 0)`,
        secenek: urunSecenekleri.ad,
        secenekSirasi: urunSecenekleri.sira,
        deger: urunSecenekDegerleri.ad,
        degerSirasi: urunSecenekDegerleri.sira,
      })
      .from(urunBirimleri)
      .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
      .leftJoin(birimStoklari, eq(birimStoklari.birim_kimligi, urunBirimleri.kimlik))
      .leftJoin(urunBirimiDegerleri, eq(urunBirimiDegerleri.birim_kimligi, urunBirimleri.kimlik))
      .leftJoin(
        urunSecenekDegerleri,
        and(
          eq(urunSecenekDegerleri.kimlik, urunBirimiDegerleri.deger_kimligi),
          isNull(urunSecenekDegerleri.silinme_zamani),
        ),
      )
      .leftJoin(
        urunSecenekleri,
        and(
          eq(urunSecenekleri.kimlik, urunSecenekDegerleri.secenek_kimligi),
          isNull(urunSecenekleri.silinme_zamani),
        ),
      )
      .where(
        and(
          isNull(urunBirimleri.silinme_zamani),
          sql`${urunBirimleri.urun_kimligi} in (${adaySorgusu})`,
        ),
      ),
    // Filtrede kullanılan özelliklerin değerleri; silinmiş özellik ve seçenek gelmez.
    vt
      .select({
        urun: urunOzellikDegerleri.urun_kimligi,
        ozellik: ozellikler.ad,
        ozellikSirasi: ozellikler.sira,
        tur: ozellikler.tur,
        birim: ozellikler.birim,
        metin: urunOzellikDegerleri.metin_degeri,
        sayi: urunOzellikDegerleri.sayi_degeri,
        evetHayir: urunOzellikDegerleri.evet_hayir_degeri,
        secenek: ozellikSecenekleri.ad,
        secenekSirasi: ozellikSecenekleri.sira,
      })
      .from(urunOzellikDegerleri)
      .innerJoin(ozellikler, eq(ozellikler.kimlik, urunOzellikDegerleri.ozellik_kimligi))
      .leftJoin(
        ozellikSecenekleri,
        and(
          eq(ozellikSecenekleri.kimlik, urunOzellikDegerleri.secenek_kimligi),
          isNull(ozellikSecenekleri.silinme_zamani),
        ),
      )
      .where(
        and(
          isNull(ozellikler.silinme_zamani),
          eq(ozellikler.filtrede, true),
          sql`${urunOzellikDegerleri.urun_kimligi} in (${adaySorgusu})`,
        ),
      )
      .orderBy(asc(ozellikler.sira)),
  ]);

  // Aday ürünler, kapsamın sırasıyla.
  const adaylar = new Map<string, FiltreAdayi & { birimHaritasi: Map<string, FiltreBirimi> }>(
    sirali.rows.map(({ kimlik }) => [
      kimlik,
      { kimlik, stokta: false, birimler: [], ozellikler: {}, birimHaritasi: new Map() },
    ]),
  );
  const markaAdlari = new Map<string, string>();
  for (const satir of markaSatirlari) {
    const aday = adaylar.get(satir.urun);
    if (aday === undefined) continue;
    aday.marka = satir.adresAdi;
    markaAdlari.set(satir.adresAdi, satir.ad);
  }
  const secenekEtiketleri: Etiketler = new Map();
  for (const satir of birimSatirlari) {
    const aday = adaylar.get(satir.urun);
    if (aday === undefined) continue;
    const birim = aday.birimHaritasi.get(satir.birim) ?? { stokta: satir.stokta, degerler: {} };
    aday.birimHaritasi.set(satir.birim, birim);
    if (satir.stokta) aday.stokta = true;
    if (satir.secenek === null || satir.deger === null) continue;
    const grup = anahtarUret(satir.secenek);
    const deger = anahtarUret(satir.deger);
    birim.degerler = { ...birim.degerler, [grup]: deger };
    etiketEkle(
      secenekEtiketleri,
      grup,
      satir.secenek,
      satir.secenekSirasi ?? 0,
      deger,
      satir.deger,
      satir.degerSirasi ?? 0,
    );
  }
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const metin = metinOkuyucu(site.ayarlar.dil);
  const ozellikEtiketleri: Etiketler = new Map();
  for (const satir of ozellikSatirlari) {
    const aday = adaylar.get(satir.urun);
    if (aday === undefined) continue;
    const okunan = ((): { anahtar: string; ad: string; sira: number } | undefined => {
      switch (satir.tur) {
        case "liste":
          return satir.secenek === null
            ? undefined
            : {
                anahtar: anahtarUret(satir.secenek),
                ad: satir.secenek,
                sira: satir.secenekSirasi ?? 0,
              };
        case "evet-hayir":
          return satir.evetHayir === null
            ? undefined
            : satir.evetHayir
              ? { anahtar: "evet", ad: metin("vitrin.liste.evet"), sira: 0 }
              : { anahtar: "hayir", ad: metin("vitrin.liste.hayir"), sira: 1 };
        case "sayi": {
          if (satir.sayi === null) return undefined;
          const sayi = Number(satir.sayi);
          const ondalik = (String(satir.sayi).split(".")[1] ?? "").replace(/0+$/, "").length;
          const yazili = bicim.sayi(sayi, ondalik);
          return {
            anahtar: String(sayi),
            ad: satir.birim === null ? yazili : `${yazili} ${satir.birim}`,
            sira: sayi,
          };
        }
        case "metin":
          return satir.metin === null
            ? undefined
            : { anahtar: anahtarUret(satir.metin), ad: satir.metin, sira: 0 };
        default:
          return undefined;
      }
    })();
    if (okunan === undefined) continue;
    const grup = anahtarUret(satir.ozellik);
    aday.ozellikler = { ...aday.ozellikler, [grup]: okunan.anahtar };
    etiketEkle(
      ozellikEtiketleri,
      grup,
      satir.ozellik,
      satir.ozellikSirasi,
      okunan.anahtar,
      okunan.ad,
      okunan.sira,
    );
  }
  const hepsi: FiltreAdayi[] = [...adaylar.values()].map(({ birimHaritasi, ...aday }) => ({
    ...aday,
    birimler: [...birimHaritasi.values()],
  }));

  // Fiyat: yalnız gerekiyorsa, kartın fiyat işleviyle.
  const fiyatSiralamasi = secenek.siralama === "fiyat-artan" || secenek.siralama === "fiyat-azalan";
  const fiyatli =
    fiyatFiltresiVarMi(filtre) || fiyatSiralamasi
      ? await (async () => {
          const araliklar = await fiyatGosterimServisi(site).fiyatAraliklari(
            vt,
            hepsi.map((aday) => aday.kimlik),
            { an: secenek.an },
          );
          return hepsi.map((aday) => {
            const tutar = araliklar.get(aday.kimlik)?.enDusuk.tutar;
            return tutar === undefined ? aday : { ...aday, fiyat: tutar };
          });
        })()
      : hepsi;

  const uyanlar = fiyatli.filter((aday) => filtreyeUyarMi(aday, filtre));
  const sonuc =
    secenek.siralama === "fiyat-artan"
      ? fiyataGoreSirala(uyanlar, "artan")
      : secenek.siralama === "fiyat-azalan"
        ? fiyataGoreSirala(uyanlar, "azalan")
        : uyanlar;
  const boyut = Math.max(1, Math.trunc(secenek.boyut));
  const toplamSayfa = Math.max(1, Math.ceil(sonuc.length / boyut));
  const sayfa = Math.min(Math.max(1, Math.trunc(secenek.sayfa)), toplamSayfa);
  const sayfaninUrunleri = sonuc
    .slice(secenek.birikimli ? 0 : (sayfa - 1) * boyut, sayfa * boyut)
    .map((aday) => aday.kimlik);

  const say = (grup: FiltreGrubu, deger: string) => secenekSayisi(fiyatli, filtre, grup, deger);
  const markaSecenekleri = [...markaAdlari.entries()]
    .toSorted(([, a], [, b]) => a.localeCompare(b))
    .map(([anahtar, ad]) => ({
      anahtar,
      ad,
      adet: say({ tur: "marka" }, anahtar),
      secili: filtre.markalar.includes(anahtar),
    }));
  const grupSecenekleri = (
    etiketler: Etiketler,
    tur: "secenek" | "ozellik",
    secimler: Readonly<Record<string, readonly string[]>>,
  ): FiltreSecenekGrubu[] =>
    siraliGirdiler(etiketler).map(([anahtar, grup]) => ({
      anahtar,
      ad: grup.ad,
      secenekler: siraliGirdiler(grup.degerler).map(([deger, { ad }]) => ({
        anahtar: deger,
        ad,
        adet: say({ tur, anahtar }, deger),
        secili: secimler[anahtar]?.includes(deger) ?? false,
      })),
    }));

  return {
    urunler: sayfaninUrunleri,
    toplam: sonuc.length,
    kapsamToplami: hepsi.length,
    sayfa,
    toplamSayfa,
    secenekler: {
      markalar: markaSecenekleri,
      secenekler: grupSecenekleri(secenekEtiketleri, "secenek", filtre.secenekler),
      ozellikler: grupSecenekleri(ozellikEtiketleri, "ozellik", filtre.ozellikler),
      stoktakiler: {
        adet: say({ tur: "stok" }, ""),
        secili: filtre.stoktakiler,
      },
    },
  };
};
