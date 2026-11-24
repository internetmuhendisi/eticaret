// Blog yazılarını ve blog kategorilerini yazan servis (kart 0272, karar 0176).
//
// - Yarış: bütün yazmalar içeriğin işlem kilidini alır; adres adı ve kategori adı tekilliği kilit altında aranır, kısmi
//   tekil indeksler ikinci ağdır. Kapak görseli paylaşımlı kilitle denetlenir (gorselHazirMi).
// - Yayın zamanı: yayına alınan yazı ilk yayın anını alır; daha önce yayınlanmış (zamanı geçmiş) yazı yeniden yayına
//   alınınca eski anını korur. Zamanlanmış yazının zamanı sitenin saat diliminde yerel zamandan çevrilir, zorunludur.
//   Taslağa alınan yazının zamanı kalır (yeniden yayınlanınca tarih değişmez).
// - Değişiklik: ekran yazının gördüğü son değişme anını verir; arada değişmişse (başka sekme, başka yönetici) çakışma
//   (yazi-degisti) ve hiçbir şey yazılmaz.
// - Silme: yazı silinmiş olarak işaretlenir; eski adresi tetikleyiciyle saklanır, vitrinde bulunamaz. Kategori
//   silinince yazıları kategorisiz kalır, silme kaydında listelenir.
// - Her yazım değişiklik kaydına aynı işlemde girer (karar 0045). İçerik ve özet kayda girmez (uzun metin).
import { and, asc, count, eq, inArray, isNull, ne, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import { type BlogYaziDurumu, blogSinirlari } from "../../kayitlar/blog.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import { bosAdresAdi } from "../../metinler/adres-adi.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { gorselHazirMi } from "../dosya/servis.ts";
import { blogKategorileri, blogYazilari } from "./model.ts";
import {
  blogKategorisiDegisikligi,
  blogKategorisiGirdisi,
  blogYazisiDegisikligi,
  blogYazisiGirdisi,
  icerikHatalari,
} from "./semalar.ts";

const kilit = "icerik";
// İçeriğin işlem kilidi: blogun bütün yazmaları ve başlangıç blogu alır.
export const icerikKilidiAl = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext(${kilit}))`);
const yaz = <T>(vt: Veritabani | VeritabaniIslemi, is: (islem: VeritabaniIslemi) => Promise<T>) =>
  vt.transaction(async (islem) => {
    await icerikKilidiAl(islem);
    return is(islem);
  });

type Sorun = { alan: string; kod: string };
const bilinenKodlar = new Set<string>(icerikHatalari);
const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw new BilinenHata(
    "dogrulama",
    sonuc.error.issues.map(
      (sorun): Sorun => ({
        alan: sorun.path.join("."),
        kod: bilinenKodlar.has(sorun.message) ? sorun.message : sorun.code,
      }),
    ),
  );
};
const dogrulamaHatasi = (sorunlar: Sorun[]) => new BilinenHata("dogrulama", sorunlar);
const cakisma = (alan: string, kod: string) => new BilinenHata("cakisma", [{ alan, kod }]);

export type BlogYazisi = {
  kimlik: string;
  baslik: string;
  adresAdi: string;
  ozet: string | null;
  icerik: string;
  kapak: { dosya: string; metin: string } | null;
  kategori: string | null;
  yazar: string | null;
  durum: BlogYaziDurumu;
  yayinZamani: Date | null;
  guncellenmeZamani: Date;
};

export type BlogKategorisi = { kimlik: string; ad: string; adresAdi: string; sira: number };

const yaziAlanlari = {
  kimlik: blogYazilari.kimlik,
  baslik: blogYazilari.baslik,
  adresAdi: blogYazilari.adres_adi,
  ozet: blogYazilari.ozet,
  icerik: blogYazilari.icerik,
  kapakDosyasi: blogYazilari.kapak_kimligi,
  kapakMetni: blogYazilari.kapak_metni,
  kategori: blogYazilari.kategori_kimligi,
  yazar: blogYazilari.yazar,
  durum: blogYazilari.durum,
  yayinZamani: blogYazilari.yayin_zamani,
  guncellenmeZamani: blogYazilari.guncellenme_zamani,
};
type YaziSatiri = {
  kimlik: string;
  baslik: string;
  adresAdi: string;
  ozet: string | null;
  icerik: string;
  kapakDosyasi: string | null;
  kapakMetni: string | null;
  kategori: string | null;
  yazar: string | null;
  durum: string;
  yayinZamani: Date | null;
  guncellenmeZamani: Date;
};
const yaziyiKur = ({ kapakDosyasi, kapakMetni, durum, ...satir }: YaziSatiri): BlogYazisi => ({
  ...satir,
  kapak:
    kapakDosyasi === null || kapakMetni === null
      ? null
      : { dosya: kapakDosyasi, metin: kapakMetni },
  durum: durum as BlogYaziDurumu,
});

// Değişiklik kaydına giden alanlar: içerik ve özet girmez, boş alan yazılmaz.
const kayitDegeri = (yazi: BlogYazisi): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries({
      baslik: yazi.baslik,
      adresAdi: yazi.adresAdi,
      durum: yazi.durum,
      yayinZamani: yazi.yayinZamani?.toISOString(),
      kategori: yazi.kategori,
      kapak: yazi.kapak?.dosya,
      yazar: yazi.yazar,
    }).filter(([, deger]) => deger !== null && deger !== undefined),
  );

// Silinmemiş yazı (panel); yoksa ya da kimlik bozuksa null.
export const blogYazisiOku = async (
  vt: Veritabani | VeritabaniIslemi,
  kimlik: string,
): Promise<BlogYazisi | null> => {
  if (!kimlikMi(kimlik)) return null;
  const [satir] = await vt
    .select(yaziAlanlari)
    .from(blogYazilari)
    .where(
      and(eq(blogYazilari.kimlik, kimligiDuzelt(kimlik)), isNull(blogYazilari.silinme_zamani)),
    );
  return satir === undefined ? null : yaziyiKur(satir);
};

// Silinmemiş blog kategorileri, sırasıyla (eşitte ada göre).
export const blogKategorileriniOku = async (
  vt: Veritabani | VeritabaniIslemi,
): Promise<BlogKategorisi[]> =>
  vt
    .select({
      kimlik: blogKategorileri.kimlik,
      ad: blogKategorileri.ad,
      adresAdi: blogKategorileri.adres_adi,
      sira: blogKategorileri.sira,
    })
    .from(blogKategorileri)
    .where(isNull(blogKategorileri.silinme_zamani))
    .orderBy(asc(blogKategorileri.sira), asc(blogKategorileri.ad), asc(blogKategorileri.kimlik));

// Her kategorinin silinmemiş yazı sayısı (panel). Tek sorgu.
export const blogKategoriYaziSayilari = async (
  vt: Veritabani | VeritabaniIslemi,
): Promise<Map<string, number>> => {
  const satirlar = await vt
    .select({ kategori: blogYazilari.kategori_kimligi, sayi: count() })
    .from(blogYazilari)
    .where(isNull(blogYazilari.silinme_zamani))
    .groupBy(blogYazilari.kategori_kimligi);
  return new Map(
    satirlar.flatMap(({ kategori, sayi }) => (kategori === null ? [] : [[kategori, sayi]])),
  );
};

export const icerikServisi = (saatDilimi: () => string) => {
  const yayinZamaniniCevir = (yerel: string): Date => {
    const an = yerelZamandan(yerel, saatDilimi());
    if (an === undefined)
      throw dogrulamaHatasi([{ alan: "yayinZamani", kod: "yayin-zamani-gecersiz" }]);
    return an;
  };

  const yaziAdresiKullaniliyor = async (
    islem: VeritabaniIslemi,
    adresAdi: string,
    haric?: string,
  ) =>
    (
      await islem
        .select({ kimlik: blogYazilari.kimlik })
        .from(blogYazilari)
        .where(
          and(
            eq(blogYazilari.adres_adi, adresAdi),
            isNull(blogYazilari.silinme_zamani),
            haric === undefined ? undefined : ne(blogYazilari.kimlik, haric),
          ),
        )
        .limit(1)
    ).length > 0;

  const bosYaziAdresi = (islem: VeritabaniIslemi, baslik: string, kimlik: string) =>
    bosAdresAdi(baslik, kimlik, async (adaylar) => {
      const satirlar = await islem
        .select({ adresAdi: blogYazilari.adres_adi })
        .from(blogYazilari)
        .where(and(inArray(blogYazilari.adres_adi, adaylar), isNull(blogYazilari.silinme_zamani)));
      return new Set(satirlar.map((s) => s.adresAdi));
    });

  const kategoriyiDenetle = async (islem: VeritabaniIslemi, kimlik: string | null) => {
    if (kimlik === null) return;
    const [kategori] = await islem
      .select({ kimlik: blogKategorileri.kimlik })
      .from(blogKategorileri)
      .where(and(eq(blogKategorileri.kimlik, kimlik), isNull(blogKategorileri.silinme_zamani)));
    if (kategori === undefined)
      throw dogrulamaHatasi([{ alan: "kategori", kod: "kategori-gecersiz" }]);
  };

  const kapagiDenetle = async (islem: VeritabaniIslemi, dosya: string | null) => {
    if (dosya === null) return;
    if ((await gorselHazirMi(islem, dosya)) !== "hazir") {
      throw dogrulamaHatasi([{ alan: "kapak.dosya", kod: "gorsel-gecersiz" }]);
    }
  };

  // Yeni durumun yayın zamanı. Zamanlanmışta verilen yerel zaman (ya da kayıtlı zaman) zorunludur; yayında ilk yayın
  // anıdır (veritabanının saatiyle: daha önce yayınlanmışsa eski an, zamanı gelmemişse şimdi); taslakta önceki zaman
  // kalır.
  const yayinZamaniniKur = (
    durum: BlogYaziDurumu,
    verilen: string | null | undefined,
    onceki: { durum: BlogYaziDurumu; yayinZamani: Date | null } | undefined,
  ): Date | SQL | null => {
    if (durum === "zamanlanmis") {
      const an =
        verilen === undefined
          ? onceki?.durum === "zamanlanmis"
            ? onceki.yayinZamani
            : null
          : verilen === null
            ? null
            : yayinZamaniniCevir(verilen);
      if (an === null)
        throw dogrulamaHatasi([{ alan: "yayinZamani", kod: "yayin-zamani-gerekli" }]);
      return an;
    }
    if (durum === "taslak") return onceki?.yayinZamani ?? null;
    if (onceki?.durum === "yayinda") return onceki.yayinZamani;
    const eski = onceki?.yayinZamani ?? null;
    return eski === null ? sql`now()` : sql`least(${eski.toISOString()}::timestamptz, now())`;
  };

  // yayinAni: yalnız iç çağrılar (başlangıç blogu) verir; yayındaki yazının ilk yayın anı olur. Uç vermez.
  const yaziEkle = (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    ham: unknown,
    { yayinAni }: { yayinAni?: Date } = {},
  ): Promise<{ kimlik: string }> => {
    const girdi = girdiyiDogrula(blogYazisiGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      const kimlik = crypto.randomUUID();
      const adresAdi = girdi.adresAdi ?? (await bosYaziAdresi(islem, girdi.baslik, kimlik));
      if (girdi.adresAdi !== undefined && (await yaziAdresiKullaniliyor(islem, girdi.adresAdi))) {
        throw cakisma("adresAdi", "adres-adi-tekrar");
      }
      await kategoriyiDenetle(islem, girdi.kategori ?? null);
      await kapagiDenetle(islem, girdi.kapak?.dosya ?? null);
      const yayinZamani =
        girdi.durum === "yayinda" && yayinAni !== undefined
          ? yayinAni
          : yayinZamaniniKur(girdi.durum, girdi.yayinZamani, undefined);
      await islem.insert(blogYazilari).values({
        kimlik,
        baslik: girdi.baslik,
        adres_adi: adresAdi,
        ozet: girdi.ozet ?? null,
        icerik: girdi.icerik ?? "",
        kapak_kimligi: girdi.kapak?.dosya ?? null,
        kapak_metni: girdi.kapak?.metin ?? null,
        kategori_kimligi: girdi.kategori ?? null,
        yazar: girdi.yazar ?? null,
        durum: girdi.durum,
        yayin_zamani: yayinZamani,
      });
      const yazi = await blogYazisiOku(islem, kimlik);
      if (yazi === null) throw new Error("Yazı yazılamadı.");
      await degisikligiKaydet(islem, {
        kim,
        islem: "blog-yazisi.eklendi",
        kayit: { tur: "blog-yazisi", kimlik },
        eski: null,
        yeni: kayitDegeri(yazi),
      });
      return { kimlik };
    });
  };

  // gorulen: ekranın gördüğü son değişme anı. Verilmezse (servisin kendi çağrıları, testler) denetlenmez.
  const yaziDegistir = (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    kimlikHam: string,
    ham: unknown,
    gorulen?: Date,
  ): Promise<BlogYazisi> => {
    const girdi = girdiyiDogrula(blogYazisiDegisikligi.safeParse(ham));
    return yaz(vt, async (islem) => {
      const kimlik = kimligiDuzelt(kimlikHam);
      const onceki = await blogYazisiOku(islem, kimlik);
      if (onceki === null) throw new BilinenHata("bulunamadi");
      if (gorulen !== undefined && onceki.guncellenmeZamani.getTime() !== gorulen.getTime()) {
        throw cakisma("yazi", "yazi-degisti");
      }
      if (
        girdi.adresAdi !== undefined &&
        girdi.adresAdi !== onceki.adresAdi &&
        (await yaziAdresiKullaniliyor(islem, girdi.adresAdi, kimlik))
      ) {
        throw cakisma("adresAdi", "adres-adi-tekrar");
      }
      if (girdi.kategori !== undefined && girdi.kategori !== onceki.kategori) {
        await kategoriyiDenetle(islem, girdi.kategori);
      }
      if (girdi.kapak !== undefined && girdi.kapak?.dosya !== onceki.kapak?.dosya) {
        await kapagiDenetle(islem, girdi.kapak?.dosya ?? null);
      }
      const durum = girdi.durum ?? onceki.durum;
      const yayinZamani =
        girdi.durum === undefined && girdi.yayinZamani === undefined
          ? onceki.yayinZamani
          : yayinZamaniniKur(durum, girdi.yayinZamani, onceki);
      const yeni = {
        baslik: girdi.baslik ?? onceki.baslik,
        adres_adi: girdi.adresAdi ?? onceki.adresAdi,
        ozet: girdi.ozet === undefined ? onceki.ozet : girdi.ozet,
        icerik: girdi.icerik ?? onceki.icerik,
        kapak_kimligi:
          girdi.kapak === undefined ? (onceki.kapak?.dosya ?? null) : (girdi.kapak?.dosya ?? null),
        kapak_metni:
          girdi.kapak === undefined ? (onceki.kapak?.metin ?? null) : (girdi.kapak?.metin ?? null),
        kategori_kimligi: girdi.kategori === undefined ? onceki.kategori : girdi.kategori,
        yazar: girdi.yazar === undefined ? onceki.yazar : girdi.yazar,
        durum,
        yayin_zamani: yayinZamani,
      };
      const degisti =
        yeni.baslik !== onceki.baslik ||
        yeni.adres_adi !== onceki.adresAdi ||
        yeni.ozet !== onceki.ozet ||
        yeni.icerik !== onceki.icerik ||
        yeni.kapak_kimligi !== (onceki.kapak?.dosya ?? null) ||
        yeni.kapak_metni !== (onceki.kapak?.metin ?? null) ||
        yeni.kategori_kimligi !== onceki.kategori ||
        yeni.yazar !== onceki.yazar ||
        yeni.durum !== onceki.durum ||
        !(yeni.yayin_zamani === null
          ? onceki.yayinZamani === null
          : yeni.yayin_zamani instanceof Date &&
            yeni.yayin_zamani.getTime() === onceki.yayinZamani?.getTime());
      if (!degisti) return onceki;
      await islem
        .update(blogYazilari)
        .set({ ...yeni, guncellenme_zamani: sql`clock_timestamp()` })
        .where(eq(blogYazilari.kimlik, kimlik));
      const sonra = await blogYazisiOku(islem, kimlik);
      if (sonra === null) throw new Error("Yazı okunamadı.");
      const eskiDeger = kayitDegeri(onceki);
      const yeniDeger = kayitDegeri(sonra);
      // Kayda girmeyen alan (içerik, özet, kapak metni) değişince de satır yazılır: ne değiştiği yazmaz, kim ve ne
      // zaman değiştirdiği yazar.
      await degisikligiKaydet(islem, {
        kim,
        islem: "blog-yazisi.degisti",
        kayit: { tur: "blog-yazisi", kimlik },
        eski: Object.fromEntries(
          Object.entries(eskiDeger).filter(([alan, d]) => yeniDeger[alan] !== d),
        ),
        yeni: Object.fromEntries(
          Object.entries(yeniDeger).filter(([alan, d]) => eskiDeger[alan] !== d),
        ),
      });
      return sonra;
    });
  };

  const yaziSil = (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    kimlikHam: string,
  ): Promise<void> =>
    yaz(vt, async (islem) => {
      const kimlik = kimligiDuzelt(kimlikHam);
      const yazi = await blogYazisiOku(islem, kimlik);
      if (yazi === null) throw new BilinenHata("bulunamadi");
      await islem
        .update(blogYazilari)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`clock_timestamp()` })
        .where(eq(blogYazilari.kimlik, kimlik));
      await degisikligiKaydet(islem, {
        kim,
        islem: "blog-yazisi.silindi",
        kayit: { tur: "blog-yazisi", kimlik },
        eski: kayitDegeri(yazi),
        yeni: null,
      });
    });

  const kategoriAdiKullaniliyor = async (islem: VeritabaniIslemi, ad: string, haric?: string) =>
    (
      await islem
        .select({ kimlik: blogKategorileri.kimlik })
        .from(blogKategorileri)
        .where(
          and(
            sql`${adAnahtariSql(blogKategorileri.ad)} = ${adAnahtariSql(ad)}`,
            isNull(blogKategorileri.silinme_zamani),
            haric === undefined ? undefined : ne(blogKategorileri.kimlik, haric),
          ),
        )
        .limit(1)
    ).length > 0;
  const kategoriAdresiKullaniliyor = async (
    islem: VeritabaniIslemi,
    adresAdi: string,
    haric?: string,
  ) =>
    (
      await islem
        .select({ kimlik: blogKategorileri.kimlik })
        .from(blogKategorileri)
        .where(
          and(
            eq(blogKategorileri.adres_adi, adresAdi),
            isNull(blogKategorileri.silinme_zamani),
            haric === undefined ? undefined : ne(blogKategorileri.kimlik, haric),
          ),
        )
        .limit(1)
    ).length > 0;

  const kategoriEkle = (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    ham: unknown,
  ): Promise<{ kimlik: string }> => {
    const girdi = girdiyiDogrula(blogKategorisiGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      const mevcut = await blogKategorileriniOku(islem);
      if (mevcut.length >= blogSinirlari.kategoriSayisi) {
        throw new BilinenHata("is-kurali", [{ alan: "kategori", kod: "kategori-siniri" }]);
      }
      if (await kategoriAdiKullaniliyor(islem, girdi.ad)) throw cakisma("ad", "ad-tekrar");
      const kimlik = crypto.randomUUID();
      const adresAdi =
        girdi.adresAdi ??
        (await bosAdresAdi(girdi.ad, kimlik, async (adaylar) => {
          const satirlar = await islem
            .select({ adresAdi: blogKategorileri.adres_adi })
            .from(blogKategorileri)
            .where(
              and(
                inArray(blogKategorileri.adres_adi, adaylar),
                isNull(blogKategorileri.silinme_zamani),
              ),
            );
          return new Set(satirlar.map((s) => s.adresAdi));
        }));
      if (girdi.adresAdi !== undefined && (await kategoriAdresiKullaniliyor(islem, adresAdi))) {
        throw cakisma("adresAdi", "adres-adi-tekrar");
      }
      const sira = mevcut.reduce((enBuyuk, k) => Math.max(enBuyuk, k.sira + 1), 0);
      await islem
        .insert(blogKategorileri)
        .values({ kimlik, ad: girdi.ad, adres_adi: adresAdi, sira });
      await degisikligiKaydet(islem, {
        kim,
        islem: "blog-kategorisi.eklendi",
        kayit: { tur: "blog-kategorisi", kimlik },
        eski: null,
        yeni: { ad: girdi.ad, adresAdi, sira },
      });
      return { kimlik };
    });
  };

  const kategoriDegistir = (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    kimlikHam: string,
    ham: unknown,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(blogKategorisiDegisikligi.safeParse(ham));
    return yaz(vt, async (islem) => {
      const kimlik = kimligiDuzelt(kimlikHam);
      const onceki = (await blogKategorileriniOku(islem)).find((k) => k.kimlik === kimlik);
      if (onceki === undefined) throw new BilinenHata("bulunamadi");
      const ad = girdi.ad ?? onceki.ad;
      const adresAdi = girdi.adresAdi ?? onceki.adresAdi;
      if (ad !== onceki.ad && (await kategoriAdiKullaniliyor(islem, ad, kimlik))) {
        throw cakisma("ad", "ad-tekrar");
      }
      if (
        adresAdi !== onceki.adresAdi &&
        (await kategoriAdresiKullaniliyor(islem, adresAdi, kimlik))
      ) {
        throw cakisma("adresAdi", "adres-adi-tekrar");
      }
      if (ad === onceki.ad && adresAdi === onceki.adresAdi) return;
      await islem
        .update(blogKategorileri)
        .set({ ad, adres_adi: adresAdi, guncellenme_zamani: sql`now()` })
        .where(eq(blogKategorileri.kimlik, kimlik));
      await degisikligiKaydet(islem, {
        kim,
        islem: "blog-kategorisi.degisti",
        kayit: { tur: "blog-kategorisi", kimlik },
        eski: {
          ...(ad === onceki.ad ? {} : { ad: onceki.ad }),
          ...(adresAdi === onceki.adresAdi ? {} : { adresAdi: onceki.adresAdi }),
        },
        yeni: {
          ...(ad === onceki.ad ? {} : { ad }),
          ...(adresAdi === onceki.adresAdi ? {} : { adresAdi }),
        },
      });
    });
  };

  // Kategori silinir, yazıları kategorisiz kalır (silme kaydında listelenir).
  const kategoriSil = (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    kimlikHam: string,
  ): Promise<void> =>
    yaz(vt, async (islem) => {
      const kimlik = kimligiDuzelt(kimlikHam);
      const kategori = (await blogKategorileriniOku(islem)).find((k) => k.kimlik === kimlik);
      if (kategori === undefined) throw new BilinenHata("bulunamadi");
      const yazilar = await islem
        .update(blogYazilari)
        .set({ kategori_kimligi: null })
        .where(eq(blogYazilari.kategori_kimligi, kimlik))
        .returning({ kimlik: blogYazilari.kimlik });
      await islem
        .update(blogKategorileri)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(eq(blogKategorileri.kimlik, kimlik));
      await degisikligiKaydet(islem, {
        kim,
        islem: "blog-kategorisi.silindi",
        kayit: { tur: "blog-kategorisi", kimlik },
        eski: {
          ad: kategori.ad,
          adresAdi: kategori.adresAdi,
          ...(yazilar.length === 0 ? {} : { yazilar: yazilar.map((y) => y.kimlik).sort() }),
        },
        yeni: null,
      });
    });

  // Kategorilerin yeni sırası: bütün silinmemiş kategoriler tekrarsız verilir; yalnız sırası değişen yazılır.
  const kategorileriSirala = (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    kimliklerHam: readonly string[],
  ): Promise<void> =>
    yaz(vt, async (islem) => {
      const kimlikler = kimliklerHam.map(kimligiDuzelt);
      const mevcut = await blogKategorileriniOku(islem);
      const siralar = new Map(mevcut.map((k) => [k.kimlik, k.sira]));
      const ayniKume =
        kimlikler.length === mevcut.length &&
        new Set(kimlikler).size === kimlikler.length &&
        kimlikler.every((k) => siralar.has(k));
      if (!ayniKume) throw cakisma("kimlikler", "siralama-gecersiz");
      for (const [sira, kimlik] of kimlikler.entries()) {
        const eski = siralar.get(kimlik);
        if (eski === sira) continue;
        await islem
          .update(blogKategorileri)
          .set({ sira, guncellenme_zamani: sql`now()` })
          .where(eq(blogKategorileri.kimlik, kimlik));
        await degisikligiKaydet(islem, {
          kim,
          islem: "blog-kategorisi.siralandi",
          kayit: { tur: "blog-kategorisi", kimlik },
          eski: { sira: eski },
          yeni: { sira },
        });
      }
    });

  return {
    yaziEkle,
    yaziDegistir,
    yaziSil,
    kategoriEkle,
    kategoriDegistir,
    kategoriSil,
    kategorileriSirala,
  };
};
