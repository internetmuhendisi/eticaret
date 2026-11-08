// Varyantlı ürün (kart 0085, karar 0071): seçenekler, değerleri ve birleşimler. Ürün servisi
// (servis.ts) bu işlemleri kendi işlem kilidiyle (yaz) dışarı verir; ürün başka bir yoldan değişmez.
//
// - Seçenek ve değer adları sitenin verisidir. Ad, büyük küçük harf ve noktalı noktasız i ayrımı
//   olmadan ürünün silinmemiş seçenekleri, seçeneğin silinmemiş değerleri arasında tekildir; tekillik
//   kilit altında ve veritabanında (ad anahtarı) aranır, tekil indeksler ikinci ağdır.
// - Her birleşim bir satılabilir birimdir (urun_birimleri): kendi stok kodu, barkodu, ağırlığı ve
//   ölçüleri olur; fiyat ve stok basit üründeki gibi birime bağlanır, fiyat ve stok servisi değişmez.
//   Birleşim her silinmemiş seçenekten tam bir değerdir; anahtarı (birlesim) değer kimliklerinin
//   sıralı hâlidir ve ürün başına silinmemişler arasında tekildir. Birleşim sonradan değişmez.
// - Basit ürünün tek birimi boş anahtar taşır. Basit ürüne ilk seçenek eklenince o birim silinmiş
//   işaretlenir (kullanıcı kararı), fiyat ve stok geçmişi kalır. Son seçenek silinince ürün yeniden
//   basit olur ve boş bir birim açılır.
// - Birleşimleri olan ürüne yeni seçenek eklenmez: var olan birleşimlerin o seçenekte değeri olmaz.
// - Silme işaretle yapılır. Değeri (ya da seçeneği) silinen birleşimler de silinmiş işaretlenir,
//   satırları kalır: geçmiş siparişler birimine bağlı kalır.
// - Her yazım değişiklik kaydına aynı işlemde girer; değerle birlikte silinen her birleşim kendi
//   satırıyla.
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan, DegisiklikIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { varyantSinirlari } from "../../kayitlar/urun.ts";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import {
  cakisma,
  dogrulamaHatasi,
  girdiyiDogrula,
  isKurali,
  kayitDegeri,
  stokKoduKullaniliyor,
} from "./dogrulama.ts";
import { galeriGorseliMi } from "./galeri.ts";
import {
  urunBirimiDegerleri,
  urunBirimleri,
  urunler,
  urunSecenekDegerleri,
  urunSecenekleri,
} from "./model.ts";
import {
  type BirlesimDegisikligi,
  type BirlesimGirdisi,
  birlesimDegisikligi,
  birlesimGirdisi,
  type DegerDegisikligi,
  type DegerGirdisi,
  degerDegisikligi,
  degerGirdisi,
  type SecenekDegisikligi,
  type SecenekGirdisi,
  secenekDegisikligi,
  secenekGirdisi,
} from "./semalar.ts";

export type SecenekDegeri = { kimlik: string; ad: string; sira: number; silindi: boolean };
export type UrunSecenegi = {
  kimlik: string;
  ad: string;
  sira: number;
  silindi: boolean;
  degerler: SecenekDegeri[];
};

// Ürünlerin seçenekleri ve değerleri tek sorguyla, sırasıyla (sıra, sonra açılış). silinmisler: false
// yalnız silinmemiş seçenekleri ve silinmemiş değerleri verir; seçeneği olmayan ürün haritada yoktur.
export const secenekleriOku = async (
  vt: Veritabani | VeritabaniIslemi,
  urunKimlikleri: string[],
  secenek: { silinmisler: boolean },
): Promise<Map<string, UrunSecenegi[]>> => {
  const sonuc = new Map<string, UrunSecenegi[]>();
  const gecerli = urunKimlikleri.filter(kimlikMi);
  if (gecerli.length === 0) return sonuc;
  const satirlar = await vt
    .select({
      urun: urunSecenekleri.urun_kimligi,
      kimlik: urunSecenekleri.kimlik,
      ad: urunSecenekleri.ad,
      sira: urunSecenekleri.sira,
      silinme: urunSecenekleri.silinme_zamani,
      deger: urunSecenekDegerleri.kimlik,
      degerAdi: urunSecenekDegerleri.ad,
      degerSirasi: urunSecenekDegerleri.sira,
      degerSilinme: urunSecenekDegerleri.silinme_zamani,
    })
    .from(urunSecenekleri)
    .leftJoin(
      urunSecenekDegerleri,
      and(
        eq(urunSecenekDegerleri.secenek_kimligi, urunSecenekleri.kimlik),
        secenek.silinmisler ? undefined : isNull(urunSecenekDegerleri.silinme_zamani),
      ),
    )
    .where(
      and(
        inArray(urunSecenekleri.urun_kimligi, gecerli),
        secenek.silinmisler ? undefined : isNull(urunSecenekleri.silinme_zamani),
      ),
    )
    .orderBy(
      asc(urunSecenekleri.sira),
      asc(urunSecenekleri.olusturma_zamani),
      asc(urunSecenekleri.kimlik),
      asc(urunSecenekDegerleri.sira),
      asc(urunSecenekDegerleri.olusturma_zamani),
      asc(urunSecenekDegerleri.kimlik),
    );
  const secenekler = new Map<string, UrunSecenegi>();
  for (const satir of satirlar) {
    let okunan = secenekler.get(satir.kimlik);
    if (okunan === undefined) {
      okunan = {
        kimlik: satir.kimlik,
        ad: satir.ad,
        sira: satir.sira,
        silindi: satir.silinme !== null,
        degerler: [],
      };
      secenekler.set(satir.kimlik, okunan);
      sonuc.set(satir.urun, [...(sonuc.get(satir.urun) ?? []), okunan]);
    }
    if (satir.deger !== null && satir.degerAdi !== null && satir.degerSirasi !== null) {
      okunan.degerler.push({
        kimlik: satir.deger,
        ad: satir.degerAdi,
        sira: satir.degerSirasi,
        silindi: satir.degerSilinme !== null,
      });
    }
  }
  return sonuc;
};

// Birimlerin değerlerinin kimlikleri, seçeneklerin sırasıyla; tek sorgu. Değeri olmayan (basit)
// birim haritada yoktur.
export const birimDegerleri = async (
  vt: Veritabani | VeritabaniIslemi,
  birimler: string[],
  secenekler: UrunSecenegi[],
): Promise<Map<string, string[]>> => {
  const sonuc = new Map<string, string[]>();
  if (birimler.length === 0 || secenekler.length === 0) return sonuc;
  const sira = new Map<string, number>();
  secenekler.forEach((secenek, i) => {
    for (const deger of secenek.degerler) sira.set(deger.kimlik, i);
  });
  for (const [birim, degerler] of await birimlerinDegerleri(vt, birimler)) {
    sonuc.set(
      birim,
      degerler.toSorted((a, b) => (sira.get(a) ?? 0) - (sira.get(b) ?? 0)),
    );
  }
  return sonuc;
};

// Birimlerin değer kimlikleri, sırasız; tek sorgu.
const birimlerinDegerleri = async (
  vt: Veritabani | VeritabaniIslemi,
  birimler: string[],
): Promise<Map<string, string[]>> => {
  const sonuc = new Map<string, string[]>();
  if (birimler.length === 0) return sonuc;
  const satirlar = await vt
    .select({ birim: urunBirimiDegerleri.birim_kimligi, deger: urunBirimiDegerleri.deger_kimligi })
    .from(urunBirimiDegerleri)
    .where(inArray(urunBirimiDegerleri.birim_kimligi, birimler));
  for (const { birim, deger } of satirlar) sonuc.set(birim, [...(sonuc.get(birim) ?? []), deger]);
  return sonuc;
};

// Birleşimin anahtarı: değer kimliklerinin sıralı hâli. Basit ürünün birimi boş anahtar taşır.
export const birlesimAnahtari = (degerler: string[]) => degerler.toSorted().join(",");
const basitBirimAnahtari = "";

type Yaz = <T>(
  vt: Veritabani | VeritabaniIslemi,
  is: (islem: VeritabaniIslemi) => Promise<T>,
) => Promise<T>;

// Birleşimin değişiklik kaydına giden alanları.
const birimAlanlari = {
  stokKodu: urunBirimleri.stok_kodu,
  barkod: urunBirimleri.barkod,
  agirlikGram: urunBirimleri.agirlik_gram,
  enMm: urunBirimleri.en_mm,
  boyMm: urunBirimleri.boy_mm,
  yukseklikMm: urunBirimleri.yukseklik_mm,
  sira: urunBirimleri.sira,
  // Birleşimin görseli: ürünün galerisindeki bir görsel öğesi (kart 0087, galeri.ts).
  gorsel: urunBirimleri.gorsel_kimligi,
};
type BirimKaydi = {
  stokKodu: string | null;
  barkod: string | null;
  agirlikGram: number | null;
  enMm: number | null;
  boyMm: number | null;
  yukseklikMm: number | null;
  sira: number;
  gorsel: string | null;
};
const birimSatiri = (kayit: BirimKaydi) => ({
  stok_kodu: kayit.stokKodu,
  barkod: kayit.barkod,
  agirlik_gram: kayit.agirlikGram,
  en_mm: kayit.enMm,
  boy_mm: kayit.boyMm,
  yukseklik_mm: kayit.yukseklikMm,
  sira: kayit.sira,
  gorsel_kimligi: kayit.gorsel,
});

const kaydet = (
  islem: VeritabaniIslemi,
  kim: DegisikligiYapan,
  tur: "urun-secenegi" | "urun-secenek-degeri" | "urun-birimi",
  olay: "eklendi" | "degisti" | "silindi",
  kimlik: string,
  eski: Record<string, unknown> | null,
  yeni: Record<string, unknown> | null,
) =>
  degisikligiKaydet(islem, {
    kim,
    islem: `${tur}.${olay}` satisfies DegisiklikIslemi,
    kayit: { tur, kimlik },
    eski,
    yeni,
  });

// Ürünün silinmemiş birimleri ve anahtarları.
const canliBirimler = (islem: VeritabaniIslemi, urun: string) =>
  islem
    .select({ kimlik: urunBirimleri.kimlik, birlesim: urunBirimleri.birlesim, ...birimAlanlari })
    .from(urunBirimleri)
    .where(and(eq(urunBirimleri.urun_kimligi, urun), isNull(urunBirimleri.silinme_zamani)));

// Birimleri silinmiş işaretler, her birini kendi satırıyla kayda yazar.
const birimleriSil = async (
  islem: VeritabaniIslemi,
  kim: DegisikligiYapan,
  urun: string,
  birimler: ({ kimlik: string; birlesim?: string } & BirimKaydi)[],
) => {
  if (birimler.length === 0) return;
  const kimlikler = birimler.map((birim) => birim.kimlik);
  await islem
    .update(urunBirimleri)
    .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
    .where(inArray(urunBirimleri.kimlik, kimlikler));
  // Kayıtta değerler kimlik sırasıyla yazılır (eklemedeki gibi).
  const degerler = await birimlerinDegerleri(islem, kimlikler);
  // Anahtar kayda girmez: değerler kendisi yazılır.
  for (const { kimlik, birlesim: _birlesim, ...birim } of birimler) {
    await kaydet(
      islem,
      kim,
      "urun-birimi",
      "silindi",
      kimlik,
      kayitDegeri({
        urun,
        degerler: (degerler.get(kimlik) ?? []).toSorted(),
        ...birim,
      }),
      null,
    );
  }
};

// Ürünün silinmemiş birleşimlerini (boş olmayan anahtar) kaydıyla siler: ürün silinirken (servis.ts)
// her birleşim, değer ve seçenek silmedeki gibi kendi satırıyla kayda girer.
export const urununBirlesimleriniSil = async (
  islem: VeritabaniIslemi,
  kim: DegisikligiYapan,
  urun: string,
) =>
  birimleriSil(
    islem,
    kim,
    urun,
    (await canliBirimler(islem, urun)).filter((birim) => birim.birlesim !== basitBirimAnahtari),
  );

export const varyantIslemleri = (yaz: Yaz) => {
  // Silinmemiş ürün; yoksa bulunamadı.
  const urunuDenetle = async (islem: VeritabaniIslemi, urun: string) => {
    if (!kimlikMi(urun)) throw new BilinenHata("bulunamadi");
    const [satir] = await islem
      .select({ kimlik: urunler.kimlik })
      .from(urunler)
      .where(and(eq(urunler.kimlik, urun), isNull(urunler.silinme_zamani)));
    if (satir === undefined) throw new BilinenHata("bulunamadi");
  };

  // Birleşimin seçtiği öğe ürünün galerisinde silinmemiş bir görsel olmalı (kart 0087). Ürün kilidi
  // altında: galeriden silme de aynı kilidi alır.
  const birimGorseliniDenetle = async (islem: VeritabaniIslemi, urun: string, oge: string) => {
    if (!(await galeriGorseliMi(islem, urun, oge))) {
      throw dogrulamaHatasi([{ alan: "gorsel", kod: "birim-gorseli-gecersiz" }]);
    }
  };

  // Silinmemiş seçenek ve ürünü; yoksa bulunamadı.
  const secenegiBul = async (islem: VeritabaniIslemi, secenek: string) => {
    if (!kimlikMi(secenek)) throw new BilinenHata("bulunamadi");
    const [satir] = await islem
      .select({ kimlik: urunSecenekleri.kimlik, urun: urunSecenekleri.urun_kimligi })
      .from(urunSecenekleri)
      .innerJoin(urunler, eq(urunler.kimlik, urunSecenekleri.urun_kimligi))
      .where(
        and(
          eq(urunSecenekleri.kimlik, secenek),
          isNull(urunSecenekleri.silinme_zamani),
          isNull(urunler.silinme_zamani),
        ),
      );
    if (satir === undefined) throw new BilinenHata("bulunamadi");
    return satir;
  };

  // Silinmemiş değer, seçeneği ve ürünü; yoksa bulunamadı.
  const degeriBul = async (islem: VeritabaniIslemi, deger: string) => {
    if (!kimlikMi(deger)) throw new BilinenHata("bulunamadi");
    const [satir] = await islem
      .select({
        kimlik: urunSecenekDegerleri.kimlik,
        secenek: urunSecenekDegerleri.secenek_kimligi,
        urun: urunSecenekleri.urun_kimligi,
        ad: urunSecenekDegerleri.ad,
        sira: urunSecenekDegerleri.sira,
      })
      .from(urunSecenekDegerleri)
      .innerJoin(urunSecenekleri, eq(urunSecenekleri.kimlik, urunSecenekDegerleri.secenek_kimligi))
      .innerJoin(urunler, eq(urunler.kimlik, urunSecenekleri.urun_kimligi))
      .where(
        and(
          eq(urunSecenekDegerleri.kimlik, deger),
          isNull(urunSecenekDegerleri.silinme_zamani),
          isNull(urunSecenekleri.silinme_zamani),
          isNull(urunler.silinme_zamani),
        ),
      );
    if (satir === undefined) throw new BilinenHata("bulunamadi");
    return satir;
  };

  // Silinmemiş birleşim (boş olmayan anahtar) ve ürünü; basit ürünün birimi buradan değişmez.
  const birlesimiBul = async (islem: VeritabaniIslemi, birim: string) => {
    if (!kimlikMi(birim)) throw new BilinenHata("bulunamadi");
    const [satir] = await islem
      .select({ kimlik: urunBirimleri.kimlik, urun: urunBirimleri.urun_kimligi, ...birimAlanlari })
      .from(urunBirimleri)
      .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
      .where(
        and(
          eq(urunBirimleri.kimlik, birim),
          ne(urunBirimleri.birlesim, basitBirimAnahtari),
          isNull(urunBirimleri.silinme_zamani),
          isNull(urunler.silinme_zamani),
        ),
      );
    if (satir === undefined) throw new BilinenHata("bulunamadi");
    return satir;
  };

  const secenekAdiKullaniliyor = async (
    islem: VeritabaniIslemi,
    urun: string,
    ad: string,
    haric?: string,
  ) =>
    (
      await islem
        .select({ kimlik: urunSecenekleri.kimlik })
        .from(urunSecenekleri)
        .where(
          and(
            eq(urunSecenekleri.urun_kimligi, urun),
            sql`${adAnahtariSql(urunSecenekleri.ad)} = ${adAnahtariSql(ad)}`,
            isNull(urunSecenekleri.silinme_zamani),
            haric === undefined ? undefined : ne(urunSecenekleri.kimlik, haric),
          ),
        )
    ).length > 0;

  const degerAdiKullaniliyor = async (
    islem: VeritabaniIslemi,
    secenek: string,
    ad: string,
    haric?: string,
  ) =>
    (
      await islem
        .select({ kimlik: urunSecenekDegerleri.kimlik })
        .from(urunSecenekDegerleri)
        .where(
          and(
            eq(urunSecenekDegerleri.secenek_kimligi, secenek),
            sql`${adAnahtariSql(urunSecenekDegerleri.ad)} = ${adAnahtariSql(ad)}`,
            isNull(urunSecenekDegerleri.silinme_zamani),
            haric === undefined ? undefined : ne(urunSecenekDegerleri.kimlik, haric),
          ),
        )
    ).length > 0;

  // Sonraki sıra: verilmezse eklenen sona gelir.
  const sonrakiSira = async (
    islem: VeritabaniIslemi,
    tablo: typeof urunSecenekleri | typeof urunSecenekDegerleri | typeof urunBirimleri,
    kosul: ReturnType<typeof eq>,
  ) => {
    const [satir] = await islem
      .select({ sira: sql<number>`coalesce(max(${tablo.sira}) + 1, 0)`.mapWith(Number) })
      .from(tablo)
      .where(kosul);
    return satir?.sira ?? 0;
  };

  // Değerleri sırayla yazar; ad tekilliği her değer için veritabanında aranır (girdi içindeki tekrar
  // da yakalanır).
  const degerleriYaz = async (
    islem: VeritabaniIslemi,
    secenek: string,
    adlar: string[],
    ilkSira: number,
    alan: (i: number) => string,
  ) => {
    const yazilan: { kimlik: string; ad: string; sira: number }[] = [];
    for (const [i, ad] of adlar.entries()) {
      if (await degerAdiKullaniliyor(islem, secenek, ad)) {
        throw cakisma(alan(i), "deger-ad-tekrar");
      }
      const kimlik = randomUUID();
      const sira = ilkSira + i;
      await islem
        .insert(urunSecenekDegerleri)
        .values({ kimlik, secenek_kimligi: secenek, ad, sira });
      yazilan.push({ kimlik, ad, sira });
    }
    return yazilan;
  };

  // Yeni seçenek ve değerleri. Basit ürüne ilk seçenek eklenince basit birim silinmiş işaretlenir.
  const secenekEkle = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    urun: string,
    ham: SecenekGirdisi,
  ): Promise<string> => {
    const girdi = girdiyiDogrula(secenekGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      await urunuDenetle(islem, urun);
      const secenekler =
        (await secenekleriOku(islem, [urun], { silinmisler: false })).get(urun) ?? [];
      if (secenekler.length >= varyantSinirlari.secenek)
        throw isKurali("secenek", "secenek-siniri");
      const birimler = await canliBirimler(islem, urun);
      if (birimler.some((birim) => birim.birlesim !== basitBirimAnahtari)) {
        throw isKurali("secenek", "secenek-eklenemez");
      }
      if (await secenekAdiKullaniliyor(islem, urun, girdi.ad)) {
        throw cakisma("ad", "secenek-ad-tekrar");
      }
      await birimleriSil(
        islem,
        kim,
        urun,
        birimler.filter((birim) => birim.birlesim === basitBirimAnahtari),
      );
      const kimlik = randomUUID();
      const sira =
        girdi.sira ??
        (await sonrakiSira(islem, urunSecenekleri, eq(urunSecenekleri.urun_kimligi, urun)));
      await islem
        .insert(urunSecenekleri)
        .values({ kimlik, urun_kimligi: urun, ad: girdi.ad, sira });
      const degerler = await degerleriYaz(islem, kimlik, girdi.degerler, 0, (i) => `degerler.${i}`);
      await kaydet(
        islem,
        kim,
        "urun-secenegi",
        "eklendi",
        kimlik,
        null,
        kayitDegeri({ urun, ad: girdi.ad, sira, degerler: degerler.map((deger) => deger.ad) }),
      );
      // Her değer de kendi satırıyla: birleşimlerin kaydındaki değer kimlikleri bir ada bağlansın.
      for (const deger of degerler) {
        await kaydet(islem, kim, "urun-secenek-degeri", "eklendi", deger.kimlik, null, {
          urun,
          secenek: kimlik,
          ad: deger.ad,
          sira: deger.sira,
        });
      }
      return kimlik;
    });
  };

  const secenekDegistir = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    secenek: string,
    ham: SecenekDegisikligi,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(secenekDegisikligi.safeParse(ham));
    await yaz(vt, async (islem) => {
      const bulunan = await secenegiBul(islem, secenek);
      const [eski] = await islem
        .select({ ad: urunSecenekleri.ad, sira: urunSecenekleri.sira })
        .from(urunSecenekleri)
        .where(eq(urunSecenekleri.kimlik, secenek));
      if (eski === undefined) throw new BilinenHata("bulunamadi");
      const yeni = { ad: girdi.ad ?? eski.ad, sira: girdi.sira ?? eski.sira };
      const degisen = (["ad", "sira"] as const).filter((alan) => eski[alan] !== yeni[alan]);
      if (degisen.length === 0) return;
      if (
        degisen.includes("ad") &&
        (await secenekAdiKullaniliyor(islem, bulunan.urun, yeni.ad, secenek))
      ) {
        throw cakisma("ad", "secenek-ad-tekrar");
      }
      await islem
        .update(urunSecenekleri)
        .set({ ...yeni, guncellenme_zamani: sql`now()` })
        .where(eq(urunSecenekleri.kimlik, secenek));
      const sec = (kaynak: typeof yeni) =>
        Object.fromEntries(degisen.map((alan) => [alan, kaynak[alan]]));
      await kaydet(islem, kim, "urun-secenegi", "degisti", secenek, sec(eski), sec(yeni));
    });
  };

  // Seçeneği, değerlerini ve ürünün bütün birleşimlerini (her birleşimin bu seçenekte değeri vardır)
  // silinmiş işaretler. Son seçenek silinince ürün basit olur: boş bir birim açılır.
  const secenekSil = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    secenek: string,
  ): Promise<void> => {
    await yaz(vt, async (islem) => {
      const { urun } = await secenegiBul(islem, secenek);
      const [eski] = await islem
        .select({ ad: urunSecenekleri.ad, sira: urunSecenekleri.sira })
        .from(urunSecenekleri)
        .where(eq(urunSecenekleri.kimlik, secenek));
      const birimler = await canliBirimler(islem, urun);
      await birimleriSil(
        islem,
        kim,
        urun,
        birimler.filter((birim) => birim.birlesim !== basitBirimAnahtari),
      );
      const degerler = await islem
        .update(urunSecenekDegerleri)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(
          and(
            eq(urunSecenekDegerleri.secenek_kimligi, secenek),
            isNull(urunSecenekDegerleri.silinme_zamani),
          ),
        )
        .returning({
          kimlik: urunSecenekDegerleri.kimlik,
          ad: urunSecenekDegerleri.ad,
          sira: urunSecenekDegerleri.sira,
        });
      for (const { kimlik, ...deger } of degerler) {
        await kaydet(
          islem,
          kim,
          "urun-secenek-degeri",
          "silindi",
          kimlik,
          { urun, secenek, ...deger },
          null,
        );
      }
      await islem
        .update(urunSecenekleri)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(eq(urunSecenekleri.kimlik, secenek));
      await kaydet(
        islem,
        kim,
        "urun-secenegi",
        "silindi",
        secenek,
        kayitDegeri({ urun, ...eski }),
        null,
      );
      const kalan = (await secenekleriOku(islem, [urun], { silinmisler: false })).get(urun);
      if (kalan === undefined) {
        const kimlik = randomUUID();
        await islem
          .insert(urunBirimleri)
          .values({ kimlik, urun_kimligi: urun, birlesim: basitBirimAnahtari });
        await kaydet(islem, kim, "urun-birimi", "eklendi", kimlik, null, { urun });
      }
    });
  };

  const degerEkle = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    secenek: string,
    ham: DegerGirdisi,
  ): Promise<string> => {
    const girdi = girdiyiDogrula(degerGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      const { urun } = await secenegiBul(islem, secenek);
      const [sayi] = await islem
        .select({ sayi: count() })
        .from(urunSecenekDegerleri)
        .where(
          and(
            eq(urunSecenekDegerleri.secenek_kimligi, secenek),
            isNull(urunSecenekDegerleri.silinme_zamani),
          ),
        );
      if ((sayi?.sayi ?? 0) >= varyantSinirlari.deger) throw isKurali("ad", "deger-siniri");
      const sira =
        girdi.sira ??
        (await sonrakiSira(
          islem,
          urunSecenekDegerleri,
          eq(urunSecenekDegerleri.secenek_kimligi, secenek),
        ));
      const [deger] = await degerleriYaz(islem, secenek, [girdi.ad], sira, () => "ad");
      if (deger === undefined) throw new Error("Değer yazılmadı.");
      await kaydet(
        islem,
        kim,
        "urun-secenek-degeri",
        "eklendi",
        deger.kimlik,
        null,
        kayitDegeri({ urun, secenek, ad: deger.ad, sira: deger.sira }),
      );
      return deger.kimlik;
    });
  };

  const degerDegistir = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    deger: string,
    ham: DegerDegisikligi,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(degerDegisikligi.safeParse(ham));
    await yaz(vt, async (islem) => {
      const eski = await degeriBul(islem, deger);
      const yeni = { ad: girdi.ad ?? eski.ad, sira: girdi.sira ?? eski.sira };
      const degisen = (["ad", "sira"] as const).filter((alan) => eski[alan] !== yeni[alan]);
      if (degisen.length === 0) return;
      if (
        degisen.includes("ad") &&
        (await degerAdiKullaniliyor(islem, eski.secenek, yeni.ad, deger))
      ) {
        throw cakisma("ad", "deger-ad-tekrar");
      }
      await islem
        .update(urunSecenekDegerleri)
        .set({ ...yeni, guncellenme_zamani: sql`now()` })
        .where(eq(urunSecenekDegerleri.kimlik, deger));
      const sec = (kaynak: { ad: string; sira: number }) =>
        Object.fromEntries(degisen.map((alan) => [alan, kaynak[alan]]));
      await kaydet(islem, kim, "urun-secenek-degeri", "degisti", deger, sec(eski), sec(yeni));
    });
  };

  // Değeri ve onu taşıyan silinmemiş birleşimleri silinmiş işaretler.
  const degerSil = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    deger: string,
  ): Promise<void> => {
    await yaz(vt, async (islem) => {
      const eski = await degeriBul(islem, deger);
      // Seçeneğin son değeri silinmez: değeri olmayan seçenekle hiçbir birleşim açılamaz, ürün
      // satılamaz kalırdı. Seçeneği kaldırmak isteyen seçeneği siler.
      const [kalan] = await islem
        .select({ sayi: count() })
        .from(urunSecenekDegerleri)
        .where(
          and(
            eq(urunSecenekDegerleri.secenek_kimligi, eski.secenek),
            isNull(urunSecenekDegerleri.silinme_zamani),
          ),
        );
      if ((kalan?.sayi ?? 0) <= 1) throw isKurali("deger", "son-deger");
      const birimler = await islem
        .select({ kimlik: urunBirimleri.kimlik, ...birimAlanlari })
        .from(urunBirimleri)
        .innerJoin(urunBirimiDegerleri, eq(urunBirimiDegerleri.birim_kimligi, urunBirimleri.kimlik))
        .where(
          and(eq(urunBirimiDegerleri.deger_kimligi, deger), isNull(urunBirimleri.silinme_zamani)),
        );
      await birimleriSil(islem, kim, eski.urun, birimler);
      await islem
        .update(urunSecenekDegerleri)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(eq(urunSecenekDegerleri.kimlik, deger));
      await kaydet(
        islem,
        kim,
        "urun-secenek-degeri",
        "silindi",
        deger,
        kayitDegeri({ urun: eski.urun, secenek: eski.secenek, ad: eski.ad, sira: eski.sira }),
        null,
      );
    });
  };

  // Yeni birleşim: her silinmemiş seçenekten bir silinmemiş değer. Aynı birleşim ve aynı stok kodu
  // reddedilir.
  const birlesimEkle = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    urun: string,
    ham: BirlesimGirdisi,
  ): Promise<string> => {
    const girdi = girdiyiDogrula(birlesimGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      await urunuDenetle(islem, urun);
      const secenekler =
        (await secenekleriOku(islem, [urun], { silinmisler: false })).get(urun) ?? [];
      const secenegi = new Map(
        secenekler.flatMap((secenek) =>
          secenek.degerler.map((deger) => [deger.kimlik, secenek.kimlik] as const),
        ),
      );
      if (girdi.degerler.some((deger) => !secenegi.has(deger))) {
        throw dogrulamaHatasi([{ alan: "degerler", kod: "birlesim-gecersiz" }]);
      }
      const kapsanan = new Set(girdi.degerler.map((deger) => secenegi.get(deger)));
      if (
        secenekler.length === 0 ||
        kapsanan.size !== girdi.degerler.length ||
        kapsanan.size !== secenekler.length
      ) {
        throw dogrulamaHatasi([{ alan: "degerler", kod: "birlesim-eksik" }]);
      }
      const birimler = await canliBirimler(islem, urun);
      const anahtar = birlesimAnahtari(girdi.degerler);
      if (birimler.some((birim) => birim.birlesim === anahtar)) {
        throw cakisma("degerler", "birlesim-tekrar");
      }
      if (birimler.length >= varyantSinirlari.birlesim) {
        throw isKurali("degerler", "birlesim-siniri");
      }
      if (girdi.stokKodu !== undefined && (await stokKoduKullaniliyor(islem, girdi.stokKodu))) {
        throw cakisma("stokKodu", "stok-kodu-tekrar");
      }
      if (girdi.gorsel !== undefined) await birimGorseliniDenetle(islem, urun, girdi.gorsel);
      const kimlik = randomUUID();
      const kayit: BirimKaydi = {
        stokKodu: girdi.stokKodu ?? null,
        barkod: girdi.barkod ?? null,
        agirlikGram: girdi.agirlikGram ?? null,
        enMm: girdi.enMm ?? null,
        boyMm: girdi.boyMm ?? null,
        yukseklikMm: girdi.yukseklikMm ?? null,
        gorsel: girdi.gorsel ?? null,
        sira:
          girdi.sira ??
          (await sonrakiSira(islem, urunBirimleri, eq(urunBirimleri.urun_kimligi, urun))),
      };
      await islem
        .insert(urunBirimleri)
        .values({ kimlik, urun_kimligi: urun, birlesim: anahtar, ...birimSatiri(kayit) });
      await islem
        .insert(urunBirimiDegerleri)
        .values(girdi.degerler.map((deger) => ({ birim_kimligi: kimlik, deger_kimligi: deger })));
      await kaydet(
        islem,
        kim,
        "urun-birimi",
        "eklendi",
        kimlik,
        null,
        kayitDegeri({ urun, degerler: girdi.degerler.toSorted(), ...kayit }),
      );
      return kimlik;
    });
  };

  // Birleşimin alanları: yalnız verilen alan değişir, null boşaltır. Değerleri değişmez.
  const birlesimDegistir = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    birim: string,
    ham: BirlesimDegisikligi,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(birlesimDegisikligi.safeParse(ham));
    await yaz(vt, async (islem) => {
      const { kimlik: _kimlik, urun, ...eski } = await birlesimiBul(islem, birim);
      const verilen = Object.fromEntries(
        Object.entries(girdi).filter(([, deger]) => deger !== undefined),
      ) as Partial<BirimKaydi>;
      const yeni: BirimKaydi = { ...eski, ...verilen };
      const degisen = (Object.keys(yeni) as (keyof BirimKaydi)[]).filter(
        (alan) => eski[alan] !== yeni[alan],
      );
      if (degisen.length === 0) return;
      if (
        yeni.stokKodu !== null &&
        yeni.stokKodu.toLowerCase() !== eski.stokKodu?.toLowerCase() &&
        (await stokKoduKullaniliyor(islem, yeni.stokKodu, birim))
      ) {
        throw cakisma("stokKodu", "stok-kodu-tekrar");
      }
      if (yeni.gorsel !== null && yeni.gorsel !== eski.gorsel) {
        await birimGorseliniDenetle(islem, urun, yeni.gorsel);
      }
      await islem
        .update(urunBirimleri)
        .set({ ...birimSatiri(yeni), guncellenme_zamani: sql`now()` })
        .where(eq(urunBirimleri.kimlik, birim));
      const sec = (kaynak: BirimKaydi) =>
        kayitDegeri(Object.fromEntries(degisen.map((alan) => [alan, kaynak[alan]])), true);
      await kaydet(islem, kim, "urun-birimi", "degisti", birim, sec(eski), sec(yeni));
    });
  };

  const birlesimSil = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    birim: string,
  ): Promise<void> => {
    await yaz(vt, async (islem) => {
      const { urun, ...kayit } = await birlesimiBul(islem, birim);
      await birimleriSil(islem, kim, urun, [kayit]);
    });
  };

  return {
    secenekEkle,
    secenekDegistir,
    secenekSil,
    degerEkle,
    degerDegistir,
    degerSil,
    birlesimEkle,
    birlesimDegistir,
    birlesimSil,
  };
};

// Ürünlerin silinmemiş birimleri, sırasıyla; tek sorgu. Ürünün genel stok durumu ve fiyat aralığı
// (kart 0085) birimlerden bununla çıkar. Ürünün kendisinin silinmişliğine bakılmaz: stok durumu
// silinmiş ürünün birimini zaten satılamaz sayar, vitrin ürünü kendi koşuluyla süzer.
export const urunlerinBirimleri = async (
  vt: Veritabani | VeritabaniIslemi,
  urunKimlikleri: string[],
): Promise<Map<string, string[]>> => {
  const sonuc = new Map<string, string[]>();
  const gecerli = urunKimlikleri.filter(kimlikMi);
  if (gecerli.length === 0) return sonuc;
  const satirlar = await vt
    .select({ urun: urunBirimleri.urun_kimligi, birim: urunBirimleri.kimlik })
    .from(urunBirimleri)
    .where(and(inArray(urunBirimleri.urun_kimligi, gecerli), isNull(urunBirimleri.silinme_zamani)))
    .orderBy(
      asc(urunBirimleri.sira),
      asc(urunBirimleri.olusturma_zamani),
      asc(urunBirimleri.kimlik),
    );
  for (const { urun, birim } of satirlar) sonuc.set(urun, [...(sonuc.get(urun) ?? []), birim]);
  return sonuc;
};
