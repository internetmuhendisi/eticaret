// Ürünü okuyan ve değiştiren tek yol (kart 0076, karar 0062).
//
// - Basit ürün: ürün ve tek satılabilir birimi aynı işlemde yazılır. Stok kodu, barkod, ağırlık ve
//   ölçüler birimdedir (model.ts); bugün girdi ikisini birlikte taşır, varyantlar (0085) birimleri ayrı
//   yazar.
// - Yarış: bütün yazmalar aynı işlem kilidini alır (pg_advisory_xact_lock; kilit veritabanına özeldir).
//   Tekillik kilit altında aranır, kısmi tekil indeksler ikinci ağdır.
// - Silme silinme işaretiyle yapılır; ürün ve birimleri birlikte işaretlenir, kodu ve adı serbest kalır.
// - Her yazım değişiklik kaydına aynı veritabanı işleminde girer (karar 0045).
// - Yayın zamanı sitenin saat diliminde yazılır, an olarak saklanır.
//
// İzin kapıda denetlenir (izinler.ts); servis yalnız kimin yaptığını kayda yazar. Girdi şemadan
// geçmemişse servis yine şemadan geçirir: başka bir yoldan gelen ham değer tabloya yazılmaz.
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { type UrunDurumu, urunDurumVitrini, type VitrinYeri } from "../../kayitlar/urun.ts";
import { bosAdresAdi } from "../../metinler/adres-adi.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import {
  siteninVeritabani,
  type Veritabani,
  type VeritabaniIslemi,
} from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { vergiSiniflari } from "../vergi/model.ts";
import {
  baglantiTanimlari,
  bagliGruplar,
  gruplarGecerliMi,
  gruplariBagla,
  gruplariKaldir,
  kilitliBagliGruplar,
} from "./baglantilar.ts";
import { ilgilileriYaz, ilgiliSecimHatasi, secilenIlgililer } from "./ilgili.ts";
import { urunKilidiAl } from "./kilit.ts";
import { urunBirimleri, urunler } from "./model.ts";
import {
  type UrunDegisikligi,
  type UrunGirdisi,
  type UrunHatasi,
  urunDegisikligi,
  urunGirdisi,
  urunHatalari,
} from "./semalar.ts";
import { vitrinKosulu } from "./vitrin.ts";

export type UrunBirimi = {
  kimlik: string;
  stokKodu?: string;
  barkod?: string;
  agirlikGram?: number;
  enMm?: number;
  boyMm?: number;
  yukseklikMm?: number;
  sira: number;
  silindi: boolean;
};

export type Urun = {
  kimlik: string;
  ad: string;
  kisaAciklama?: string;
  uzunAciklama?: string;
  adresAdi: string;
  durum: UrunDurumu;
  yayinZamani?: Date;
  kargoGerekmez: boolean;
  // Stok takibi açık mı (kart 0082). Stoğun kendisi stok modülündedir.
  stokTakibi: boolean;
  enAzAdet: number;
  enCokAdet?: number;
  // Boşsa (null) ürün vergisizdir.
  vergiSinifi: string | null;
  // Bağlı kategorilerin (kart 0077) ve etiketlerin (kart 0078) kimlikleri, sıralı.
  kategoriler: string[];
  etiketler: string[];
  // Markanın kimliği; null markasız (kart 0078).
  marka: string | null;
  // Elle seçilen ilgili ürünler, seçim sırasıyla; silinmiş olanlar görünmez (kart 0079).
  ilgiliUrunler: string[];
  silindi: boolean;
  birimler: UrunBirimi[];
};

// Ürünün ve tek biriminin düz hâli: girdi bu biçime çevrilir, alanlar arası kurallar buna uygulanır,
// değişiklik kaydı bundan yazılır.
type UrunKaydi = {
  ad: string;
  kisaAciklama: string | null;
  uzunAciklama: string | null;
  adresAdi: string | null;
  durum: UrunDurumu;
  yayinZamani: Date | null;
  kargoGerekmez: boolean;
  stokTakibi: boolean;
  enAzAdet: number;
  enCokAdet: number | null;
  vergiSinifi: string | null;
  stokKodu: string | null;
  barkod: string | null;
  agirlikGram: number | null;
  enMm: number | null;
  boyMm: number | null;
  yukseklikMm: number | null;
  // Bağlantılar (baglantilar.ts): sıralı kategori ve etiket kimlikleri, markanın kimliği.
  kategoriler: string[];
  etiketler: string[];
  marka: string | null;
  // Elle seçilen ilgili ürünler, seçim sırasıyla (ilgili.ts). Sıralanmaz: sıra seçimin parçasıdır.
  ilgiliUrunler: string[];
};

// Bağlantı alanının kimlik listesi: marka tekildir, kayıtta tek kimlik durur.
type Alan = "kategoriler" | "marka" | "etiketler";
const gruplari = (kayit: UrunKaydi, alan: Alan): string[] =>
  alan === "marka" ? (kayit.marka === null ? [] : [kayit.marka]) : kayit[alan];
const kayitAlanlari = [
  "ad",
  "kisaAciklama",
  "uzunAciklama",
  "adresAdi",
  "durum",
  "yayinZamani",
  "kargoGerekmez",
  "stokTakibi",
  "enAzAdet",
  "enCokAdet",
  "vergiSinifi",
  "stokKodu",
  "barkod",
  "agirlikGram",
  "enMm",
  "boyMm",
  "yukseklikMm",
  "kategoriler",
  "etiketler",
  "marka",
  "ilgiliUrunler",
] as const satisfies readonly (keyof UrunKaydi)[];

type Sorun = { alan: string; kod: string };
const dogrulamaHatasi = (sorunlar: Sorun[]) => new BilinenHata("dogrulama", sorunlar);
const cakisma = (alan: string, kod: UrunHatasi) => new BilinenHata("cakisma", [{ alan, kod }]);

// Şemadan geçmeyen girdi doğrulama hatasıdır: her sorunun alanı ve kodu (vergi modülüyle aynı biçim).
const bilinenKodlar = new Set<string>(urunHatalari);
const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw dogrulamaHatasi(
    sonuc.error.issues.map((sorun) => ({
      alan: sorun.path.join("."),
      kod: bilinenKodlar.has(sorun.message) ? sorun.message : sorun.code,
    })),
  );
};

// Alanlar arası kurallar birleşmiş kayda uygulanır. Zamanlanmış olmayan ürünün yayın zamanı silinir.
const kurallariDenetle = (kayit: UrunKaydi): UrunKaydi => {
  const sorunlar: Sorun[] = [];
  const zamanli = urunDurumVitrini[kayit.durum].zamanli;
  if (zamanli && kayit.yayinZamani === null) {
    sorunlar.push({ alan: "yayinZamani", kod: "yayin-zamani-gerekli" });
  }
  if (kayit.enCokAdet !== null && kayit.enCokAdet < kayit.enAzAdet) {
    sorunlar.push({ alan: "enCokAdet", kod: "adet-siniri" });
  }
  if (sorunlar.length > 0) throw dogrulamaHatasi(sorunlar);
  return zamanli ? kayit : { ...kayit, yayinZamani: null };
};

// Değişiklik kaydına giden değer: boş alan yazılmaz, zaman ISO metnidir. Boş liste eklemede ve silmede
// yazılmaz; değişiklikte yazılır (listenin boşaldığı görünsün).
const kayitDegeri = (kayit: Partial<UrunKaydi>, bosListe = false): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(kayit)
      .filter(
        ([, deger]) =>
          deger !== null &&
          deger !== undefined &&
          (bosListe || !(Array.isArray(deger) && deger.length === 0)),
      )
      .map(([alan, deger]) => [alan, deger instanceof Date ? deger.toISOString() : deger]),
  );

const urunSatiri = (kayit: UrunKaydi & { adresAdi: string }) => ({
  ad: kayit.ad,
  kisa_aciklama: kayit.kisaAciklama,
  uzun_aciklama: kayit.uzunAciklama,
  adres_adi: kayit.adresAdi,
  durum: kayit.durum,
  yayin_zamani: kayit.yayinZamani,
  kargo_gerekmez: kayit.kargoGerekmez,
  stok_takibi: kayit.stokTakibi,
  en_az_adet: kayit.enAzAdet,
  en_cok_adet: kayit.enCokAdet,
  vergi_sinifi_kimligi: kayit.vergiSinifi,
});

const birimSatiri = (kayit: UrunKaydi) => ({
  stok_kodu: kayit.stokKodu,
  barkod: kayit.barkod,
  agirlik_gram: kayit.agirlikGram,
  en_mm: kayit.enMm,
  boy_mm: kayit.boyMm,
  yukseklik_mm: kayit.yukseklikMm,
});

const urunAlanlari = {
  kimlik: urunler.kimlik,
  ad: urunler.ad,
  kisaAciklama: urunler.kisa_aciklama,
  uzunAciklama: urunler.uzun_aciklama,
  adresAdi: urunler.adres_adi,
  durum: urunler.durum,
  yayinZamani: urunler.yayin_zamani,
  kargoGerekmez: urunler.kargo_gerekmez,
  stokTakibi: urunler.stok_takibi,
  enAzAdet: urunler.en_az_adet,
  enCokAdet: urunler.en_cok_adet,
  vergiSinifi: urunler.vergi_sinifi_kimligi,
  silinme: urunler.silinme_zamani,
};
const birimAlanlari = {
  kimlik: urunBirimleri.kimlik,
  stokKodu: urunBirimleri.stok_kodu,
  barkod: urunBirimleri.barkod,
  agirlikGram: urunBirimleri.agirlik_gram,
  enMm: urunBirimleri.en_mm,
  boyMm: urunBirimleri.boy_mm,
  yukseklikMm: urunBirimleri.yukseklik_mm,
  sira: urunBirimleri.sira,
  silinme: urunBirimleri.silinme_zamani,
};

// Boş (null) alanı nesneden düşürür: okunan ürün yalnız dolu alanları taşır.
const doluAlanlar = <T extends Record<string, unknown>>(nesne: T) =>
  Object.fromEntries(Object.entries(nesne).filter(([, deger]) => deger !== null)) as {
    [A in keyof T]: Exclude<T[A], null>;
  };

// Üç bağlantının kayıttaki hâli: kategori ve etiket listesi, marka tek kimlik.
const bagliHepsi = async (
  oku: (t: (typeof baglantiTanimlari)[number]) => Promise<string[]>,
): Promise<Pick<UrunKaydi, "kategoriler" | "etiketler" | "marka">> => {
  const sonuc: Record<Alan, string[]> = { kategoriler: [], marka: [], etiketler: [] };
  for (const t of baglantiTanimlari) sonuc[t.alan] = await oku(t);
  return {
    kategoriler: sonuc.kategoriler,
    etiketler: sonuc.etiketler,
    marka: sonuc.marka[0] ?? null,
  };
};

export const urunServisi = (saatDilimi: () => string) => {
  const yaz = <T>(vt: Veritabani, is: (islem: VeritabaniIslemi) => Promise<T>) =>
    vt.transaction(async (islem) => {
      await urunKilidiAl(islem);
      return is(islem);
    });

  const yayinZamaniniCevir = (yerel: string | null | undefined): Date | null | undefined => {
    if (yerel === null || yerel === undefined) return yerel;
    const an = yerelZamandan(yerel, saatDilimi());
    if (an === undefined) {
      throw dogrulamaHatasi([{ alan: "yayinZamani", kod: "yayin-zamani-gecersiz" }]);
    }
    return an;
  };

  // Ürünü bağlanabilecek vergi sınıfı: var ve silinmemiş. Silinmiş sınıfa bağlı kalan ürün değişmeden
  // kalabilir (karar 0060), ama yeni bağlantı kurulmaz.
  const vergiSinifiniDenetle = async (islem: VeritabaniIslemi, kimlik: string | null) => {
    if (kimlik === null) return;
    const [sinif] = await islem
      .select({ kimlik: vergiSiniflari.kimlik })
      .from(vergiSiniflari)
      .where(and(eq(vergiSiniflari.kimlik, kimlik), isNull(vergiSiniflari.silinme_zamani)))
      // Satır paylaşımlı kilitlenir: aynı anda silen işlem bitene kadar beklenir, sonra silinmiş görülür.
      .for("share");
    if (sinif === undefined) {
      throw dogrulamaHatasi([{ alan: "vergiSinifi", kod: "vergi-sinifi-gecersiz" }]);
    }
  };

  // Kategori, marka ve etiket bağlantıları (baglantilar.ts): eklenecek gruplar var ve silinmemiş olmalı.
  const gruplariDenetle = async (islem: VeritabaniIslemi, eklenecek: (alan: Alan) => string[]) => {
    for (const t of baglantiTanimlari) {
      if (!(await gruplarGecerliMi(islem, t, eklenecek(t.alan)))) {
        throw dogrulamaHatasi([{ alan: t.alan, kod: t.hata }]);
      }
    }
  };

  // Kilit altında: silinmemiş başka bir birim bu stok kodunu (büyük küçük harf ayrımsız) taşıyor mu?
  const stokKoduKullaniliyor = async (
    islem: VeritabaniIslemi,
    stokKodu: string,
    haricBirim?: string,
  ) => {
    const bulunan = await islem
      .select({ kimlik: urunBirimleri.kimlik })
      .from(urunBirimleri)
      .where(
        and(
          sql`lower(${urunBirimleri.stok_kodu}) = lower(${stokKodu})`,
          isNull(urunBirimleri.silinme_zamani),
          haricBirim === undefined ? undefined : ne(urunBirimleri.kimlik, haricBirim),
        ),
      );
    return bulunan.length > 0;
  };

  const adresAdiKullaniliyor = async (
    islem: VeritabaniIslemi,
    adresAdi: string,
    haric?: string,
  ) => {
    const bulunan = await islem
      .select({ kimlik: urunler.kimlik })
      .from(urunler)
      .where(
        and(
          eq(urunler.adres_adi, adresAdi),
          isNull(urunler.silinme_zamani),
          haric === undefined ? undefined : ne(urunler.kimlik, haric),
        ),
      );
    return bulunan.length > 0;
  };

  // Addan üretilen adres adı (cekirdek/metinler/adres-adi.ts); adaylar silinmemişler arasında aranır.
  const adresAdiBul = (islem: VeritabaniIslemi, ad: string, kimlik: string) =>
    bosAdresAdi(ad, kimlik, async (adaylar) => {
      const satirlar = await islem
        .select({ adresAdi: urunler.adres_adi })
        .from(urunler)
        .where(and(isNull(urunler.silinme_zamani), inArray(urunler.adres_adi, adaylar)));
      return new Set(satirlar.map((satir) => satir.adresAdi));
    });

  // Elle seçilen ilgili ürünler (ilgili.ts): ürün kendisini seçemez, seçilenler var ve silinmemiş.
  const ilgilileriDenetle = async (islem: VeritabaniIslemi, urun: string, liste: string[]) => {
    const kod = await ilgiliSecimHatasi(islem, urun, liste);
    if (kod !== undefined) throw dogrulamaHatasi([{ alan: "ilgiliUrunler", kod }]);
  };

  const tekligiDenetle = async (
    islem: VeritabaniIslemi,
    kayit: UrunKaydi,
    haric?: { urun: string; birim: string },
  ) => {
    if (
      kayit.stokKodu !== null &&
      (await stokKoduKullaniliyor(islem, kayit.stokKodu, haric?.birim))
    ) {
      throw cakisma("stokKodu", "stok-kodu-tekrar");
    }
    if (
      kayit.adresAdi !== null &&
      (await adresAdiKullaniliyor(islem, kayit.adresAdi, haric?.urun))
    ) {
      throw cakisma("adresAdi", "adres-adi-tekrar");
    }
  };

  const urunEkle = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    ham: UrunGirdisi,
  ): Promise<string> => {
    const girdi = girdiyiDogrula(urunGirdisi.safeParse(ham));
    const kayit = kurallariDenetle({
      ad: girdi.ad,
      kisaAciklama: girdi.kisaAciklama ?? null,
      uzunAciklama: girdi.uzunAciklama ?? null,
      adresAdi: girdi.adresAdi ?? null,
      durum: girdi.durum,
      yayinZamani: urunDurumVitrini[girdi.durum].zamanli
        ? (yayinZamaniniCevir(girdi.yayinZamani) ?? null)
        : null,
      kargoGerekmez: girdi.kargoGerekmez,
      stokTakibi: girdi.stokTakibi,
      enAzAdet: girdi.enAzAdet,
      enCokAdet: girdi.enCokAdet ?? null,
      vergiSinifi: girdi.vergiSinifi,
      stokKodu: girdi.stokKodu ?? null,
      barkod: girdi.barkod ?? null,
      agirlikGram: girdi.agirlikGram ?? null,
      enMm: girdi.enMm ?? null,
      boyMm: girdi.boyMm ?? null,
      yukseklikMm: girdi.yukseklikMm ?? null,
      kategoriler: (girdi.kategoriler ?? []).toSorted(),
      etiketler: (girdi.etiketler ?? []).toSorted(),
      marka: girdi.marka ?? null,
      ilgiliUrunler: girdi.ilgiliUrunler ?? [],
    });
    return yaz(vt, async (islem) => {
      const kimlik = randomUUID();
      await vergiSinifiniDenetle(islem, kayit.vergiSinifi);
      await gruplariDenetle(islem, (alan) => gruplari(kayit, alan));
      await ilgilileriDenetle(islem, kimlik, kayit.ilgiliUrunler);
      await tekligiDenetle(islem, kayit);
      const adresAdi = kayit.adresAdi ?? (await adresAdiBul(islem, kayit.ad, kimlik));
      const yazilacak = { ...kayit, adresAdi };
      await islem.insert(urunler).values({ kimlik, ...urunSatiri(yazilacak) });
      await islem.insert(urunBirimleri).values({ urun_kimligi: kimlik, ...birimSatiri(yazilacak) });
      for (const t of baglantiTanimlari) {
        await gruplariBagla(islem, t, kimlik, gruplari(yazilacak, t.alan));
      }
      await ilgilileriYaz(islem, kimlik, yazilacak.ilgiliUrunler);
      await degisikligiKaydet(islem, {
        kim,
        islem: "urun.eklendi",
        kayit: { tur: "urun", kimlik },
        eski: null,
        yeni: kayitDegeri(yazilacak),
      });
      return kimlik;
    });
  };

  // Değişecek ürün ve tek birimi, kayıt biçiminde. Yoksa ya da silinmişse bulunamadı.
  const degisebilenUrun = async (islem: VeritabaniIslemi, kimlik: string) => {
    if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
    const [urun] = await islem.select(urunAlanlari).from(urunler).where(eq(urunler.kimlik, kimlik));
    if (urun === undefined || urun.silinme !== null) throw new BilinenHata("bulunamadi");
    const [birim] = await islem
      .select(birimAlanlari)
      .from(urunBirimleri)
      .where(and(eq(urunBirimleri.urun_kimligi, kimlik), isNull(urunBirimleri.silinme_zamani)))
      .orderBy(asc(urunBirimleri.sira), asc(urunBirimleri.olusturma_zamani));
    if (birim === undefined) throw new Error("Ürünün satılabilir birimi yok.");
    const { silinme: _urunSilinme, kimlik: _urun, ...urunKaydi } = urun;
    const { silinme: _birimSilinme, kimlik: birimKimligi, sira: _sira, ...birimKaydi } = birim;
    const bagli = await bagliHepsi((t) => kilitliBagliGruplar(islem, t, kimlik));
    const kayit: UrunKaydi = {
      ...urunKaydi,
      durum: urun.durum as UrunDurumu,
      ...birimKaydi,
      ...bagli,
      ilgiliUrunler: await secilenIlgililer(islem, kimlik),
    };
    return { kayit, birimKimligi };
  };

  // Yalnız verilen alan değişir; null isteğe bağlı alanı boşaltır. Alanlar arası kurallar birleşmiş
  // sonuca uygulanır. Ad değişince adres adı değişmez (eski bağlantılar kırılmasın). Aynı kalan
  // değişiklik kayda girmez; kayda yalnız değişen alanlar yazılır.
  const urunDegistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kimlik: string,
    ham: UrunDegisikligi,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(urunDegisikligi.safeParse(ham));
    const yayinZamani = yayinZamaniniCevir(girdi.yayinZamani);
    await yaz(vt, async (islem) => {
      const { kayit: eski, birimKimligi } = await degisebilenUrun(islem, kimlik);
      const verilen = Object.fromEntries(
        Object.entries({ ...girdi, yayinZamani }).filter(([, deger]) => deger !== undefined),
      ) as Partial<UrunKaydi>;
      if (verilen.kategoriler !== undefined) verilen.kategoriler = verilen.kategoriler.toSorted();
      if (verilen.etiketler !== undefined) verilen.etiketler = verilen.etiketler.toSorted();
      const yeni = kurallariDenetle({ ...eski, ...verilen });
      const degisen = kayitAlanlari.filter(
        (alan) => JSON.stringify(eski[alan]) !== JSON.stringify(yeni[alan]),
      );
      // Seçim verildiyse tablo her zaman baştan yazılır: sonradan silinen seçimin satırı, liste aynen
      // kaydedilse de kalkar (kart 0079 kontrolü). Değişmeyen liste kayda girmez.
      const ilgiliVerildi = girdi.ilgiliUrunler !== undefined;
      if (degisen.length === 0) {
        if (ilgiliVerildi) await ilgilileriYaz(islem, kimlik, yeni.ilgiliUrunler);
        return;
      }
      if (yeni.vergiSinifi !== eski.vergiSinifi)
        await vergiSinifiniDenetle(islem, yeni.vergiSinifi);
      const fark = (a: UrunKaydi, b: UrunKaydi) => (alan: Alan) =>
        gruplari(a, alan).filter((grup) => !gruplari(b, alan).includes(grup));
      const eklenen = fark(yeni, eski);
      const kalkan = fark(eski, yeni);
      await gruplariDenetle(islem, eklenen);
      const ilgiliDegisti = degisen.includes("ilgiliUrunler");
      if (ilgiliDegisti) await ilgilileriDenetle(islem, kimlik, yeni.ilgiliUrunler);
      await tekligiDenetle(
        islem,
        {
          ...yeni,
          stokKodu:
            yeni.stokKodu?.toLowerCase() === eski.stokKodu?.toLowerCase() ? null : yeni.stokKodu,
          adresAdi: yeni.adresAdi === eski.adresAdi ? null : yeni.adresAdi,
        },
        { urun: kimlik, birim: birimKimligi },
      );
      const adresAdi = yeni.adresAdi ?? eski.adresAdi;
      if (adresAdi === null) throw new Error("Ürünün adres adı yok.");
      await islem
        .update(urunler)
        .set({ ...urunSatiri({ ...yeni, adresAdi }), guncellenme_zamani: sql`now()` })
        .where(eq(urunler.kimlik, kimlik));
      await islem
        .update(urunBirimleri)
        .set({ ...birimSatiri(yeni), guncellenme_zamani: sql`now()` })
        .where(eq(urunBirimleri.kimlik, birimKimligi));
      // Önce kaldırılır: marka bağlantısı ürün başına tektir.
      for (const t of baglantiTanimlari) {
        await gruplariKaldir(islem, t, kimlik, kalkan(t.alan));
        await gruplariBagla(islem, t, kimlik, eklenen(t.alan));
      }
      if (ilgiliDegisti || ilgiliVerildi) await ilgilileriYaz(islem, kimlik, yeni.ilgiliUrunler);
      const sec = (kaynak: UrunKaydi) =>
        kayitDegeri(Object.fromEntries(degisen.map((alan) => [alan, kaynak[alan]])), true);
      await degisikligiKaydet(islem, {
        kim,
        islem: "urun.degisti",
        kayit: { tur: "urun", kimlik },
        eski: sec(eski),
        yeni: sec(yeni),
      });
    });
  };

  // Silinmiş işaretiyle: ürün ve birimleri birlikte işaretlenir, satırlar kalır.
  const urunSil = (vt: Veritabani, kim: DegisikligiYapan, kimlik: string) =>
    yaz(vt, async (islem) => {
      const { kayit } = await degisebilenUrun(islem, kimlik);
      await islem
        .update(urunler)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(eq(urunler.kimlik, kimlik));
      await islem
        .update(urunBirimleri)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(and(eq(urunBirimleri.urun_kimligi, kimlik), isNull(urunBirimleri.silinme_zamani)));
      await degisikligiKaydet(islem, {
        kim,
        islem: "urun.silindi",
        kayit: { tur: "urun", kimlik },
        eski: kayitDegeri(kayit),
        yeni: null,
      });
    });

  // Ürün, silinmiş olsa da okunur (eski kayıtlar ona bağlı kalır). İki sorgu.
  const urunuOku = async (vt: Veritabani, kimlik: string): Promise<Urun | undefined> => {
    if (!kimlikMi(kimlik)) return undefined;
    const [urun] = await vt.select(urunAlanlari).from(urunler).where(eq(urunler.kimlik, kimlik));
    if (urun === undefined) return undefined;
    const birimler = await vt
      .select(birimAlanlari)
      .from(urunBirimleri)
      .where(eq(urunBirimleri.urun_kimligi, kimlik))
      .orderBy(asc(urunBirimleri.sira), asc(urunBirimleri.olusturma_zamani));
    const { silinme, vergiSinifi, durum, ...alanlar } = urun;
    return {
      ...doluAlanlar(alanlar),
      durum: durum as UrunDurumu,
      vergiSinifi,
      ...(await bagliHepsi((t) => bagliGruplar(vt, t, kimlik))),
      ilgiliUrunler: await secilenIlgililer(vt, kimlik),
      silindi: silinme !== null,
      birimler: birimler.map(({ silinme: birimSilinme, ...birim }) => ({
        ...doluAlanlar(birim),
        silindi: birimSilinme !== null,
      })),
    };
  };

  // Ürün vitrinde bu yerde (sayfa ya da liste) görünüyor mu? Koşul vitrin.ts'dedir.
  const vitrindeGorunurMu = async (
    vt: Veritabani,
    kimlik: string,
    yer: VitrinYeri,
    an?: Date,
  ): Promise<boolean> =>
    kimlikMi(kimlik) &&
    (
      await vt
        .select({ kimlik: urunler.kimlik })
        .from(urunler)
        .where(and(eq(urunler.kimlik, kimlik), vitrinKosulu(yer, an)))
    ).length > 0;

  return { urunEkle, urunDegistir, urunSil, urunuOku, vitrindeGorunurMu };
};

// Verilen sitenin servisi: arka plan işi ve testler siteyi kendisi verir.
export const siteninUrunServisi = (site: Site) => urunServisi(() => site.ayarlar.saatDilimi);

// Çalışan sitenin servisi. Saat dilimi çağrıldığında okunur (karar 0026).
const calisanSiteninServisi = urunServisi(() => calisanSite().ayarlar.saatDilimi);
export const calisanSiteninUrunServisi = () => calisanSiteninServisi;
export const urunuOku = (kimlik: string, vt: Veritabani = siteninVeritabani()) =>
  calisanSiteninServisi.urunuOku(vt, kimlik);
