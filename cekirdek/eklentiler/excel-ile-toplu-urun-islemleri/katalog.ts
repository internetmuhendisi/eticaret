// Ürünlerin dosyadaki hâli (kart 0315): verilen ürünler birimleriyle, ortak bilgileriyle, fiyatı ve stoğuyla, ürün
// sayısıyla artmayan sorgularla okunur ve düz değerlere çevrilir (sutunlar.ts). Dışa aktarma dosyayı, içe aktarma
// karşılaştırmayı bununla yapar: iki yön aynı yazılışı kullanır.
//
// Sözlük sitenin adlarıdır: kategoriler (yoluyla), markalar, etiketler, özellikler ve seçenekleri, ürün durumlarının
// adları. İçe aktarma adı kimliğe bununla çevirir; ad harf ayrımsız aranır.
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { type UrunDurumu, urunDurumlari } from "../../kayitlar/urun.ts";
import { yerelZamana } from "../../metinler/bicimleyici.ts";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { etiketler, urunEtiketleri } from "../../moduller/etiket/model.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { eskiAdresler } from "../../moduller/gorunurluk/model.ts";
import { kategoriler, urunKategorileri } from "../../moduller/kategori/model.ts";
import { markalar, urunMarkalari } from "../../moduller/marka/model.ts";
import {
  ozellikler,
  ozellikSecenekleri,
  urunOzellikDegerleri,
} from "../../moduller/ozellik/model.ts";
import { birimStoklariniOku } from "../../moduller/stok/durum.ts";
import { urunBirimleri, urunler } from "../../moduller/urun/model.ts";
import { birimDegerleri, secenekleriOku, type UrunSecenegi } from "../../moduller/urun/varyant.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import {
  type DuzBirim,
  type DuzOrtak,
  listeYazisi,
  secenekAnahtari,
  yolAyraci,
} from "./sutunlar.ts";

type Vt = Veritabani | VeritabaniIslemi;

export type AdliKayit = { kimlik: string; ad: string };
export type SozlukOzelligi = AdliKayit & {
  tur: "metin" | "sayi" | "evet-hayir" | "liste";
  secenekler: AdliKayit[];
};
export type Sozluk = {
  // Kategorinin yolu ("Giyim › Kadın") ve kimliği.
  kategoriler: AdliKayit[];
  markalar: AdliKayit[];
  etiketler: AdliKayit[];
  ozellikler: SozlukOzelligi[];
};

const anahtar = (ad: string) => ad.normalize("NFC").toLocaleLowerCase("tr");

export const adlaBul = (liste: readonly AdliKayit[], ad: string): AdliKayit | undefined => {
  const aranan = anahtar(ad);
  return liste.find((kayit) => anahtar(kayit.ad) === aranan);
};

export const sozlukOku = async (vt: Vt): Promise<Sozluk> => {
  const [kategoriSatirlari, markaSatirlari, etiketSatirlari, ozellikSatirlari, secenekSatirlari] =
    await Promise.all([
      vt
        .select({ kimlik: kategoriler.kimlik, ad: kategoriler.ad, ust: kategoriler.ust_kimligi })
        .from(kategoriler)
        .where(isNull(kategoriler.silinme_zamani)),
      vt
        .select({ kimlik: markalar.kimlik, ad: markalar.ad })
        .from(markalar)
        .where(isNull(markalar.silinme_zamani)),
      vt
        .select({ kimlik: etiketler.kimlik, ad: etiketler.ad })
        .from(etiketler)
        .where(isNull(etiketler.silinme_zamani)),
      vt
        .select({ kimlik: ozellikler.kimlik, ad: ozellikler.ad, tur: ozellikler.tur })
        .from(ozellikler)
        .where(isNull(ozellikler.silinme_zamani))
        .orderBy(asc(ozellikler.sira), asc(ozellikler.kimlik)),
      vt
        .select({
          kimlik: ozellikSecenekleri.kimlik,
          ad: ozellikSecenekleri.ad,
          ozellik: ozellikSecenekleri.ozellik_kimligi,
        })
        .from(ozellikSecenekleri)
        .where(isNull(ozellikSecenekleri.silinme_zamani))
        .orderBy(asc(ozellikSecenekleri.sira), asc(ozellikSecenekleri.kimlik)),
    ]);
  const ustler = new Map(kategoriSatirlari.map((k) => [k.kimlik, k]));
  const yol = (kimlik: string): string => {
    const adlar: string[] = [];
    let simdiki = ustler.get(kimlik);
    // Ağaç döngüsüzdür (veritabanı denetler); yine de derinlik sınırlı.
    for (let i = 0; simdiki !== undefined && i < 32; i += 1) {
      adlar.unshift(simdiki.ad);
      simdiki = simdiki.ust === null ? undefined : ustler.get(simdiki.ust);
    }
    return adlar.join(yolAyraci);
  };
  return {
    kategoriler: kategoriSatirlari.map((k) => ({ kimlik: k.kimlik, ad: yol(k.kimlik) })),
    markalar: markaSatirlari,
    etiketler: etiketSatirlari,
    ozellikler: ozellikSatirlari.map((o) => ({
      kimlik: o.kimlik,
      ad: o.ad,
      tur: o.tur as SozlukOzelligi["tur"],
      secenekler: secenekSatirlari
        .filter((s) => s.ozellik === o.kimlik)
        .map(({ kimlik, ad }) => ({ kimlik, ad })),
    })),
  };
};

// Ürün durumunun dosyadaki adı ve adından durumu (harf ayrımsız).
export const durumAdi = (durum: UrunDurumu): string => metin(`yonetim.urunler.durum.${durum}`);
export const durumBul = (ad: string): UrunDurumu | undefined =>
  urunDurumlari.find((durum) => anahtar(durumAdi(durum)) === anahtar(ad));

export type KatalogBirimi = {
  kimlik: string;
  // Değer kimlikleri, seçeneklerin sırasıyla; basit birimde boş.
  degerler: string[];
  // Seçeneklerin dosyadaki yazılışı ve satırı tanıyan anahtarı.
  seceneklerYazisi: string;
  secenekAnahtari: string;
  stokKodu: string | null;
  barkod: string | null;
  duz: Required<DuzBirim>;
  // Uygulamada görülen miktar olarak gider.
  stok: number;
};
export type KatalogUrunu = {
  kimlik: string;
  adresAdi: string;
  durum: UrunDurumu;
  secenekler: UrunSecenegi[];
  kategoriler: string[];
  marka: string | null;
  etiketler: string[];
  // Özelliklerin değerleri, servisin girdisindeki gibi (liste değerinde seçeneğin kimliği).
  ozellikler: { ozellik: string; deger: string | number | boolean }[];
  duz: DuzOrtak;
  birimler: KatalogBirimi[];
};

// Kuruşun dosyadaki düz değeri ve tutarın hücresi (sayı).
export const kurusYazisi = (kurus: number | null): string => (kurus === null ? "" : String(kurus));
export const zamanYazisi = (an: Date | null, saatDilimi: string): string =>
  an === null ? "" : yerelZamana(an, saatDilimi).replace("T", " ");

export const urunleriOku = async (
  vt: Vt,
  site: Site,
  sozluk: Sozluk,
  kimlikler: readonly string[],
): Promise<KatalogUrunu[]> => {
  if (kimlikler.length === 0) return [];
  const liste = [...kimlikler];
  const dil = site.ayarlar.dil;
  const b = siteninBicimleyicisi(site.ayarlar);
  const [urunSatirlari, birimSatirlari, secenekler, kategoriBag, markaBag, etiketBag, ozellikBag] =
    await Promise.all([
      vt
        .select({
          kimlik: urunler.kimlik,
          ad: urunler.ad,
          adresAdi: urunler.adres_adi,
          durum: urunler.durum,
        })
        .from(urunler)
        .where(and(inArray(urunler.kimlik, liste), isNull(urunler.silinme_zamani))),
      vt
        .select({
          kimlik: urunBirimleri.kimlik,
          urun: urunBirimleri.urun_kimligi,
          stokKodu: urunBirimleri.stok_kodu,
          barkod: urunBirimleri.barkod,
        })
        .from(urunBirimleri)
        .where(
          and(inArray(urunBirimleri.urun_kimligi, liste), isNull(urunBirimleri.silinme_zamani)),
        )
        .orderBy(
          asc(urunBirimleri.sira),
          asc(urunBirimleri.olusturma_zamani),
          asc(urunBirimleri.kimlik),
        ),
      secenekleriOku(vt, liste, { silinmisler: false }),
      vt
        .select({ urun: urunKategorileri.urun_kimligi, kimlik: urunKategorileri.kategori_kimligi })
        .from(urunKategorileri)
        .where(inArray(urunKategorileri.urun_kimligi, liste)),
      vt
        .select({ urun: urunMarkalari.urun_kimligi, kimlik: urunMarkalari.grup_kimligi })
        .from(urunMarkalari)
        .where(inArray(urunMarkalari.urun_kimligi, liste)),
      vt
        .select({ urun: urunEtiketleri.urun_kimligi, kimlik: urunEtiketleri.grup_kimligi })
        .from(urunEtiketleri)
        .where(inArray(urunEtiketleri.urun_kimligi, liste)),
      vt
        .select({
          urun: urunOzellikDegerleri.urun_kimligi,
          ozellik: urunOzellikDegerleri.ozellik_kimligi,
          metin: urunOzellikDegerleri.metin_degeri,
          sayi: urunOzellikDegerleri.sayi_degeri,
          evetHayir: urunOzellikDegerleri.evet_hayir_degeri,
          secenek: urunOzellikDegerleri.secenek_kimligi,
        })
        .from(urunOzellikDegerleri)
        .where(inArray(urunOzellikDegerleri.urun_kimligi, liste)),
    ]);
  const birimKimlikleri = birimSatirlari.map((birim) => birim.kimlik);
  const tumSecenekler = [...secenekler.values()].flat();
  const [degerler, fiyatlar, stoklar] = await Promise.all([
    birimDegerleri(vt, birimKimlikleri, tumSecenekler),
    siteninFiyatServisi(site).fiyatlariOku(vt, birimKimlikleri),
    birimStoklariniOku(vt, birimKimlikleri),
  ]);
  const adlar = (liste2: readonly AdliKayit[], kimlikler2: readonly string[]) =>
    kimlikler2.flatMap((k) => {
      const kayit = liste2.find((x) => x.kimlik === k);
      return kayit === undefined ? [] : [kayit.ad];
    });
  const sira = new Map(liste.map((k, i) => [k, i]));
  return urunSatirlari
    .toSorted((a, b2) => (sira.get(a.kimlik) ?? 0) - (sira.get(b2.kimlik) ?? 0))
    .map((urun) => {
      const urunSecenekleri = secenekler.get(urun.kimlik) ?? [];
      const degerAdlari = new Map(
        urunSecenekleri.flatMap((s) =>
          s.degerler.map((d) => [d.kimlik, { secenek: s.ad, ad: d.ad }]),
        ),
      );
      const urunKategorileri2 = kategoriBag
        .filter((k) => k.urun === urun.kimlik)
        .map((k) => k.kimlik);
      const marka = markaBag.find((m) => m.urun === urun.kimlik)?.kimlik ?? null;
      const urunEtiketleri2 = etiketBag.filter((e) => e.urun === urun.kimlik).map((e) => e.kimlik);
      const ozellikDegerleri = ozellikBag.filter((o) => o.urun === urun.kimlik);
      const ozellikYazilari = sozluk.ozellikler.flatMap((ozellik) => {
        const satir = ozellikDegerleri.find((o) => o.ozellik === ozellik.kimlik);
        if (satir === undefined) return [];
        const yazi =
          satir.secenek !== null
            ? (ozellik.secenekler.find((s) => s.kimlik === satir.secenek)?.ad ?? "")
            : satir.sayi !== null
              ? b.sayi(satir.sayi, String(satir.sayi).split(".")[1]?.length ?? 0)
              : satir.evetHayir !== null
                ? metin(satir.evetHayir ? "eklenti.excel.evet" : "eklenti.excel.hayir")
                : (satir.metin ?? "");
        return yazi === "" ? [] : [`${ozellik.ad}: ${yazi}`];
      });
      const duz: DuzOrtak = {
        ad: urun.ad,
        durum: durumAdi(urun.durum as UrunDurumu),
        kategoriler: listeYazisi(adlar(sozluk.kategoriler, urunKategorileri2), dil),
        marka: marka === null ? "" : (adlar(sozluk.markalar, [marka])[0] ?? ""),
        etiketler: listeYazisi(adlar(sozluk.etiketler, urunEtiketleri2), dil),
        ozellikler: listeYazisi(ozellikYazilari, dil),
      };
      const birimler = birimSatirlari
        .filter((birim) => birim.urun === urun.kimlik)
        .map((birim): KatalogBirimi => {
          const birimDegerKimlikleri = degerler.get(birim.kimlik) ?? [];
          const secenekDegerleri = birimDegerKimlikleri.flatMap((d) => {
            const bulunan = degerAdlari.get(d);
            return bulunan === undefined ? [] : [{ ad: bulunan.secenek, deger: bulunan.ad }];
          });
          const fiyat = fiyatlar.get(birim.kimlik);
          const ayniPara = fiyat !== undefined && fiyat.paraBirimi === site.ayarlar.paraBirimi;
          const stok = stoklar.get(birim.kimlik)?.miktar ?? 0;
          return {
            kimlik: birim.kimlik,
            degerler: birimDegerKimlikleri,
            seceneklerYazisi: secenekDegerleri.map((s) => `${s.ad}: ${s.deger}`).join("; "),
            secenekAnahtari: secenekAnahtari(secenekDegerleri),
            stokKodu: birim.stokKodu,
            barkod: birim.barkod,
            stok,
            duz: {
              stokKodu: birim.stokKodu ?? "",
              barkod: birim.barkod ?? "",
              satisFiyati: ayniPara ? kurusYazisi(fiyat.satisFiyati) : "",
              indirimliFiyat: ayniPara ? kurusYazisi(fiyat.indirimliFiyat) : "",
              indirimBaslangici: ayniPara
                ? zamanYazisi(fiyat.indirimBaslangici, site.ayarlar.saatDilimi)
                : "",
              indirimBitisi: ayniPara
                ? zamanYazisi(fiyat.indirimBitisi, site.ayarlar.saatDilimi)
                : "",
              stok: String(stok),
            },
          };
        });
      return {
        kimlik: urun.kimlik,
        adresAdi: urun.adresAdi,
        durum: urun.durum as UrunDurumu,
        secenekler: urunSecenekleri,
        kategoriler: urunKategorileri2,
        marka,
        etiketler: urunEtiketleri2,
        ozellikler: ozellikDegerleri.flatMap((o) => {
          const deger = o.secenek ?? (o.sayi !== null ? o.sayi : (o.evetHayir ?? o.metin));
          return deger === null ? [] : [{ ozellik: o.ozellik, deger }];
        }),
        duz,
        birimler,
      };
    });
};

// Ürün kodlarından (adres adı) ürünlerin kimlikleri: silinmemiş ürünün adres adı, yoksa ürünün eski adresi (adı
// değişmiş ürün eski dosyayla da bulunur). Kod harf ayrımsızdır (adres adı küçük harftir).
export const urunKodlariniBul = async (
  vt: Vt,
  kodlar: readonly string[],
): Promise<Map<string, string>> => {
  const liste = [...new Set(kodlar.map((kod) => kod.toLocaleLowerCase("tr")))];
  const sonuc = new Map<string, string>();
  if (liste.length === 0) return sonuc;
  const [yasayan, eski] = await Promise.all([
    vt
      .select({ kod: urunler.adres_adi, kimlik: urunler.kimlik })
      .from(urunler)
      .where(and(inArray(urunler.adres_adi, liste), isNull(urunler.silinme_zamani))),
    vt
      .select({ kod: eskiAdresler.adres_adi, kimlik: eskiAdresler.kayit_kimligi })
      .from(eskiAdresler)
      .innerJoin(urunler, eq(urunler.kimlik, eskiAdresler.kayit_kimligi))
      .where(
        and(
          eq(eskiAdresler.kayit_turu, "urun"),
          inArray(eskiAdresler.adres_adi, liste),
          isNull(urunler.silinme_zamani),
        ),
      ),
  ]);
  for (const { kod, kimlik } of eski) sonuc.set(kod, kimlik);
  for (const { kod, kimlik } of yasayan) sonuc.set(kod, kimlik);
  return sonuc;
};
