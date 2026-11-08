// Ürün özelliklerini okuyan ve değiştiren tek yol (kart 0086, karar 0072). Ürünün değerleri ürün
// servisinden yazılır (degerler.ts).
//
// - Yarış: tanımların bütün yazmaları özellik işlem kilidini alır; ad tekilliği ve sınırlar kilit
//   altında aranır, kısmi tekil indeksler ikinci ağdır. Değeri etkileyen yazma (tür değişikliği,
//   özellik ya da seçenek silme) satırı kendisi de kilitler: aynı anda değer yazan ürün işlemi bitene
//   kadar beklenir.
// - Tür değişmez: özelliğin değeri ya da (liste türünde) silinmemiş seçeneği varsa. Veritabanındaki bağ
//   değeri olan özelliğin türünü ikinci ağ olarak tutar.
// - Silme (kullanıcı kararı): özellik ya da seçenek silinmiş olarak işaretlenir, değerleri ürünlerden
//   kalkar; ürünün kendisi ve öteki bilgileri değişmez. Kalkan ürünler silme kaydında listelenir.
// - Her yazım değişiklik kaydına aynı veritabanı işleminde girer (karar 0045). Özellikle birlikte
//   eklenen her seçenek kendi satırıyla yazılır.
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { type OzellikTuru, ozellikSinirlari } from "../../kayitlar/ozellik.ts";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import {
  siteninVeritabani,
  type Veritabani,
  type VeritabaniIslemi,
} from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import {
  bosUrunListesi,
  type UrunListesi,
  type UrunListesiSecenekleri,
  urunListesi,
} from "../urun/liste.ts";
import { urunler } from "../urun/model.ts";
import { degerKosulu } from "./degerler.ts";
import { ozellikler, ozellikSecenekleri, urunOzellikDegerleri } from "./model.ts";
import {
  type OzellikDegeri,
  type OzellikDegisikligi,
  type OzellikGirdisi,
  type OzellikHatasi,
  type OzellikSecenegiDegisikligi,
  type OzellikSecenegiGirdisi,
  ozellikAlanKurallari,
  ozellikDegisikligi,
  ozellikGirdisi,
  ozellikHatalari,
  ozellikSecenegiDegisikligi,
  ozellikSecenegiGirdisi,
} from "./semalar.ts";

export type OzellikSecenegi = { kimlik: string; ad: string; sira: number };
export type Ozellik = {
  kimlik: string;
  ad: string;
  tur: OzellikTuru;
  birim?: string;
  filtrede: boolean;
  sira: number;
  // Liste türünde silinmemiş seçenekler, sırasıyla; öteki türlerde boş.
  secenekler: OzellikSecenegi[];
  silindi: boolean;
};

type OzellikKaydi = {
  ad: string;
  tur: OzellikTuru;
  birim: string | null;
  filtrede: boolean;
  sira: number;
};
type SecenekKaydi = { ad: string; sira: number };

type Sorun = { alan: string; kod: string };
const bilinenKodlar = new Set<string>(ozellikHatalari);
const dogrulamaHatasi = (sorunlar: Sorun[]) => new BilinenHata("dogrulama", sorunlar);
const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw dogrulamaHatasi(
    sonuc.error.issues.map((sorun) => ({
      alan: sorun.path.join("."),
      kod: bilinenKodlar.has(sorun.message) ? sorun.message : sorun.code,
    })),
  );
};
const cakisma = (alan: string, kod: OzellikHatasi) => new BilinenHata("cakisma", [{ alan, kod }]);
const isKurali = (alan: string, kod: OzellikHatasi) =>
  new BilinenHata("is-kurali", [{ alan, kod }]);

// Değişiklik kaydına giden değer: boş alan yazılmaz.
const kayitDegeri = (kayit: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(kayit).filter(([, deger]) => deger !== null && deger !== undefined),
  );

const ozellikAlanlari = {
  kimlik: ozellikler.kimlik,
  ad: ozellikler.ad,
  tur: ozellikler.tur,
  birim: ozellikler.birim,
  filtrede: ozellikler.filtrede,
  sira: ozellikler.sira,
  silinme: ozellikler.silinme_zamani,
};
type OzellikSatiri = {
  kimlik: string;
  ad: string;
  tur: string;
  birim: string | null;
  filtrede: boolean;
  sira: number;
  silinme: Date | null;
};
const satirKaydi = (satir: OzellikSatiri): OzellikKaydi => ({
  ad: satir.ad,
  tur: satir.tur as OzellikTuru,
  birim: satir.birim,
  filtrede: satir.filtrede,
  sira: satir.sira,
});

// Tanımların işlem kilidi.
const kilidiAl = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext('ozellik'))`);
const yaz = <T>(vt: Veritabani | VeritabaniIslemi, is: (islem: VeritabaniIslemi) => Promise<T>) =>
  vt.transaction(async (islem) => {
    await kilidiAl(islem);
    return is(islem);
  });

const adKullaniliyor = async (islem: VeritabaniIslemi, ad: string, haric?: string) =>
  (
    await islem
      .select({ kimlik: ozellikler.kimlik })
      .from(ozellikler)
      .where(
        and(
          sql`${adAnahtariSql(ozellikler.ad)} = ${adAnahtariSql(ad)}`,
          isNull(ozellikler.silinme_zamani),
          haric === undefined ? undefined : ne(ozellikler.kimlik, haric),
        ),
      )
  ).length > 0;

const secenekAdiKullaniliyor = async (
  islem: VeritabaniIslemi,
  ozellik: string,
  ad: string,
  haric?: string,
) =>
  (
    await islem
      .select({ kimlik: ozellikSecenekleri.kimlik })
      .from(ozellikSecenekleri)
      .where(
        and(
          eq(ozellikSecenekleri.ozellik_kimligi, ozellik),
          sql`${adAnahtariSql(ozellikSecenekleri.ad)} = ${adAnahtariSql(ad)}`,
          isNull(ozellikSecenekleri.silinme_zamani),
          haric === undefined ? undefined : ne(ozellikSecenekleri.kimlik, haric),
        ),
      )
  ).length > 0;

const secenekSayisi = async (islem: VeritabaniIslemi, ozellik: string) =>
  (
    await islem
      .select({ sayi: count() })
      .from(ozellikSecenekleri)
      .where(
        and(
          eq(ozellikSecenekleri.ozellik_kimligi, ozellik),
          isNull(ozellikSecenekleri.silinme_zamani),
        ),
      )
  )[0]?.sayi ?? 0;

const sonrakiSira = async (
  islem: VeritabaniIslemi,
  tablo: typeof ozellikler | typeof ozellikSecenekleri,
  kosul: ReturnType<typeof eq> | ReturnType<typeof isNull>,
) => {
  const [satir] = await islem
    .select({ sira: sql<number>`coalesce(max(${tablo.sira}) + 1, 0)`.mapWith(Number) })
    .from(tablo)
    .where(kosul);
  return satir?.sira ?? 0;
};

// Değişecek özellik: yoksa ya da silinmişse bulunamadı. Satır kilitlenir: değer yazan ürün işlemleri
// (paylaşımlı kilit) bitene kadar beklenir.
const degisebilen = async (islem: VeritabaniIslemi, kimlik: string): Promise<OzellikKaydi> => {
  if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
  const [satir] = await islem
    .select(ozellikAlanlari)
    .from(ozellikler)
    .where(eq(ozellikler.kimlik, kimlik))
    .for("update");
  if (satir === undefined || satir.silinme !== null) throw new BilinenHata("bulunamadi");
  return satirKaydi(satir);
};

const degisebilenSecenek = async (islem: VeritabaniIslemi, kimlik: string) => {
  if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
  const [satir] = await islem
    .select({
      ozellik: ozellikSecenekleri.ozellik_kimligi,
      ad: ozellikSecenekleri.ad,
      sira: ozellikSecenekleri.sira,
      silinme: ozellikSecenekleri.silinme_zamani,
      ozellikSilinme: ozellikler.silinme_zamani,
    })
    .from(ozellikSecenekleri)
    .innerJoin(ozellikler, eq(ozellikler.kimlik, ozellikSecenekleri.ozellik_kimligi))
    .where(eq(ozellikSecenekleri.kimlik, kimlik))
    .for("update", { of: ozellikSecenekleri });
  if (satir === undefined || satir.silinme !== null || satir.ozellikSilinme !== null) {
    throw new BilinenHata("bulunamadi");
  }
  return { ozellik: satir.ozellik, kayit: { ad: satir.ad, sira: satir.sira } };
};

// Seçenekleri sırayla yazar; ad tekilliği her seçenek için veritabanında aranır (girdi içindeki tekrar
// da yakalanır). Her seçenek kendi satırıyla kayda girer.
const secenekleriYaz = async (
  islem: VeritabaniIslemi,
  kim: DegisikligiYapan,
  ozellik: string,
  adlar: readonly string[],
  ilkSira: number,
  alan: (i: number) => string,
): Promise<string[]> => {
  const yazilan: string[] = [];
  for (const [i, ad] of adlar.entries()) {
    if (await secenekAdiKullaniliyor(islem, ozellik, ad)) {
      throw cakisma(alan(i), "secenek-ad-tekrar");
    }
    const kimlik = randomUUID();
    const sira = ilkSira + i;
    await islem.insert(ozellikSecenekleri).values({ kimlik, ozellik_kimligi: ozellik, ad, sira });
    await degisikligiKaydet(islem, {
      kim,
      islem: "ozellik-secenegi.eklendi",
      kayit: { tur: "ozellik-secenegi", kimlik },
      eski: null,
      yeni: { ozellik, ad, sira },
    });
    yazilan.push(kimlik);
  }
  return yazilan;
};

// Ürünlerden kalkan değerlerin ürünleri, sıralı ve tekrarsız.
const urunListesiKaydi = (kalkan: { urun: string }[]) =>
  kalkan.length === 0 ? {} : { urunler: [...new Set(kalkan.map(({ urun }) => urun))].toSorted() };

const ekle = async (
  vt: Veritabani | VeritabaniIslemi,
  kim: DegisikligiYapan,
  ham: OzellikGirdisi,
): Promise<string> => {
  const girdi = girdiyiDogrula(ozellikGirdisi.safeParse(ham));
  const sorunlar: Sorun[] = ozellikAlanKurallari({ tur: girdi.tur, birim: girdi.birim ?? null });
  // Boş liste seçenek vermemektir: ekran her türde boş liste gönderebilir.
  if ((girdi.secenekler?.length ?? 0) > 0 && girdi.tur !== "liste") {
    sorunlar.push({ alan: "secenekler", kod: "secenek-yalniz-liste" });
  }
  if (sorunlar.length > 0) throw dogrulamaHatasi(sorunlar);
  return yaz(vt, async (islem) => {
    const [mevcut] = await islem
      .select({ sayi: count() })
      .from(ozellikler)
      .where(isNull(ozellikler.silinme_zamani));
    if ((mevcut?.sayi ?? 0) >= ozellikSinirlari.ozellik) {
      throw isKurali("ad", "ozellik-siniri");
    }
    if (await adKullaniliyor(islem, girdi.ad)) throw cakisma("ad", "ad-tekrar");
    const kimlik = randomUUID();
    const kayit: OzellikKaydi = {
      ad: girdi.ad,
      tur: girdi.tur,
      birim: girdi.birim ?? null,
      filtrede: girdi.filtrede,
      sira: girdi.sira ?? (await sonrakiSira(islem, ozellikler, isNull(ozellikler.silinme_zamani))),
    };
    await islem.insert(ozellikler).values({ kimlik, ...kayit });
    await degisikligiKaydet(islem, {
      kim,
      islem: "ozellik.eklendi",
      kayit: { tur: "ozellik", kimlik },
      eski: null,
      yeni: kayitDegeri(kayit),
    });
    await secenekleriYaz(islem, kim, kimlik, girdi.secenekler ?? [], 0, (i) => `secenekler.${i}`);
    return kimlik;
  });
};

// Yalnız verilen alan değişir; alanlar arası kural birleşmiş kayda uygulanır. Aynı kalan değişiklik
// kayda girmez, kayda yalnız değişen alanlar yazılır.
const degistir = async (
  vt: Veritabani | VeritabaniIslemi,
  kim: DegisikligiYapan,
  kimlik: string,
  ham: OzellikDegisikligi,
): Promise<void> => {
  const girdi = girdiyiDogrula(ozellikDegisikligi.safeParse(ham));
  await yaz(vt, async (islem) => {
    const eski = await degisebilen(islem, kimlik);
    const yeni: OzellikKaydi = {
      ad: girdi.ad ?? eski.ad,
      tur: girdi.tur ?? eski.tur,
      birim: girdi.birim === undefined ? eski.birim : girdi.birim,
      filtrede: girdi.filtrede ?? eski.filtrede,
      sira: girdi.sira ?? eski.sira,
    };
    const sorunlar = ozellikAlanKurallari(yeni);
    if (sorunlar.length > 0) throw dogrulamaHatasi(sorunlar);
    const degisen = (["ad", "tur", "birim", "filtrede", "sira"] as const).filter(
      (alan) => eski[alan] !== yeni[alan],
    );
    if (degisen.length === 0) return;
    if (yeni.tur !== eski.tur) {
      const [deger] = await islem
        .select({ urun: urunOzellikDegerleri.urun_kimligi })
        .from(urunOzellikDegerleri)
        .where(eq(urunOzellikDegerleri.ozellik_kimligi, kimlik))
        .limit(1);
      if (
        deger !== undefined ||
        (eski.tur === "liste" && (await secenekSayisi(islem, kimlik)) > 0)
      ) {
        throw isKurali("tur", "tur-degisemez");
      }
    }
    if (yeni.ad !== eski.ad && (await adKullaniliyor(islem, yeni.ad, kimlik))) {
      throw cakisma("ad", "ad-tekrar");
    }
    await islem
      .update(ozellikler)
      .set({ ...yeni, guncellenme_zamani: sql`now()` })
      .where(eq(ozellikler.kimlik, kimlik));
    const sec = (kaynak: OzellikKaydi) =>
      Object.fromEntries(degisen.map((alan) => [alan, kaynak[alan]]));
    await degisikligiKaydet(islem, {
      kim,
      islem: "ozellik.degisti",
      kayit: { tur: "ozellik", kimlik },
      eski: sec(eski),
      yeni: sec(yeni),
    });
  });
};

// Silme kuralı (kullanıcı kararı, karar 0072): özellik işaretlenir, değerleri ürünlerden kalkar.
// Seçenekleri işaretlenmez: özellikle birlikte görünmez olurlar.
const sil = (vt: Veritabani | VeritabaniIslemi, kim: DegisikligiYapan, kimlik: string) =>
  yaz(vt, async (islem) => {
    const ozellik = await degisebilen(islem, kimlik);
    await islem
      .update(ozellikler)
      .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
      .where(eq(ozellikler.kimlik, kimlik));
    const kalkan = await islem
      .delete(urunOzellikDegerleri)
      .where(eq(urunOzellikDegerleri.ozellik_kimligi, kimlik))
      .returning({ urun: urunOzellikDegerleri.urun_kimligi });
    await degisikligiKaydet(islem, {
      kim,
      islem: "ozellik.silindi",
      kayit: { tur: "ozellik", kimlik },
      eski: { ...kayitDegeri(ozellik), ...urunListesiKaydi(kalkan) },
      yeni: null,
    });
  });

// Liste türündeki özelliğe yeni seçenek; sıra verilmezse sona gelir.
const secenekEkle = async (
  vt: Veritabani | VeritabaniIslemi,
  kim: DegisikligiYapan,
  ozellik: string,
  ham: OzellikSecenegiGirdisi,
): Promise<string> => {
  const girdi = girdiyiDogrula(ozellikSecenegiGirdisi.safeParse(ham));
  return yaz(vt, async (islem) => {
    const kayit = await degisebilen(islem, ozellik);
    if (kayit.tur !== "liste") throw isKurali("ozellik", "secenek-yalniz-liste");
    if ((await secenekSayisi(islem, ozellik)) >= ozellikSinirlari.secenek) {
      throw isKurali("ad", "secenek-siniri");
    }
    const sira =
      girdi.sira ??
      (await sonrakiSira(
        islem,
        ozellikSecenekleri,
        eq(ozellikSecenekleri.ozellik_kimligi, ozellik),
      ));
    const [kimlik] = await secenekleriYaz(islem, kim, ozellik, [girdi.ad], sira, () => "ad");
    if (kimlik === undefined) throw new Error("Seçenek yazılmadı.");
    return kimlik;
  });
};

const secenekDegistir = async (
  vt: Veritabani | VeritabaniIslemi,
  kim: DegisikligiYapan,
  kimlik: string,
  ham: OzellikSecenegiDegisikligi,
): Promise<void> => {
  const girdi = girdiyiDogrula(ozellikSecenegiDegisikligi.safeParse(ham));
  await yaz(vt, async (islem) => {
    const { ozellik, kayit: eski } = await degisebilenSecenek(islem, kimlik);
    const yeni: SecenekKaydi = { ad: girdi.ad ?? eski.ad, sira: girdi.sira ?? eski.sira };
    const degisen = (["ad", "sira"] as const).filter((alan) => eski[alan] !== yeni[alan]);
    if (degisen.length === 0) return;
    if (yeni.ad !== eski.ad && (await secenekAdiKullaniliyor(islem, ozellik, yeni.ad, kimlik))) {
      throw cakisma("ad", "secenek-ad-tekrar");
    }
    await islem
      .update(ozellikSecenekleri)
      .set({ ...yeni, guncellenme_zamani: sql`now()` })
      .where(eq(ozellikSecenekleri.kimlik, kimlik));
    const sec = (kaynak: SecenekKaydi) =>
      Object.fromEntries(degisen.map((alan) => [alan, kaynak[alan]]));
    await degisikligiKaydet(islem, {
      kim,
      islem: "ozellik-secenegi.degisti",
      kayit: { tur: "ozellik-secenegi", kimlik },
      eski: sec(eski),
      yeni: sec(yeni),
    });
  });
};

// Seçenek silinince o seçeneği taşıyan ürünlerin değeri kalkar (kullanıcı kararı, karar 0072).
const secenekSil = (vt: Veritabani | VeritabaniIslemi, kim: DegisikligiYapan, kimlik: string) =>
  yaz(vt, async (islem) => {
    const { ozellik, kayit } = await degisebilenSecenek(islem, kimlik);
    await islem
      .update(ozellikSecenekleri)
      .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
      .where(eq(ozellikSecenekleri.kimlik, kimlik));
    const kalkan = await islem
      .delete(urunOzellikDegerleri)
      // Özellik koşulu indeksi (özellik, seçenek) kullandırır.
      .where(
        and(
          eq(urunOzellikDegerleri.ozellik_kimligi, ozellik),
          eq(urunOzellikDegerleri.secenek_kimligi, kimlik),
        ),
      )
      .returning({ urun: urunOzellikDegerleri.urun_kimligi });
    await degisikligiKaydet(islem, {
      kim,
      islem: "ozellik-secenegi.silindi",
      kayit: { tur: "ozellik-secenegi", kimlik },
      eski: { ozellik, ...kayit, ...urunListesiKaydi(kalkan) },
      yeni: null,
    });
  });

// Özelliklerin silinmemiş seçenekleri, sırasıyla. Tek sorgu.
const secenekleriOku = async (vt: Veritabani | VeritabaniIslemi, kimlikler: string[]) => {
  const sonuc = new Map<string, OzellikSecenegi[]>();
  if (kimlikler.length === 0) return sonuc;
  const satirlar = await vt
    .select({
      kimlik: ozellikSecenekleri.kimlik,
      ozellik: ozellikSecenekleri.ozellik_kimligi,
      ad: ozellikSecenekleri.ad,
      sira: ozellikSecenekleri.sira,
    })
    .from(ozellikSecenekleri)
    .where(
      and(
        inArray(ozellikSecenekleri.ozellik_kimligi, kimlikler),
        isNull(ozellikSecenekleri.silinme_zamani),
      ),
    )
    .orderBy(
      asc(ozellikSecenekleri.sira),
      asc(ozellikSecenekleri.olusturma_zamani),
      asc(ozellikSecenekleri.kimlik),
    );
  for (const { ozellik, ...secenek } of satirlar) {
    sonuc.set(ozellik, [...(sonuc.get(ozellik) ?? []), secenek]);
  }
  return sonuc;
};

const okunan = (satir: OzellikSatiri, secenekler: OzellikSecenegi[]): Ozellik => ({
  kimlik: satir.kimlik,
  ad: satir.ad,
  tur: satir.tur as OzellikTuru,
  ...(satir.birim === null ? {} : { birim: satir.birim }),
  filtrede: satir.filtrede,
  sira: satir.sira,
  secenekler,
  silindi: satir.silinme !== null,
});

// Özellik, silinmiş olsa da okunur. İki sorgu.
const oku = async (
  kimlik: string,
  vt: Veritabani | VeritabaniIslemi = siteninVeritabani(),
): Promise<Ozellik | undefined> => {
  if (!kimlikMi(kimlik)) return undefined;
  const [satir] = await vt
    .select(ozellikAlanlari)
    .from(ozellikler)
    .where(eq(ozellikler.kimlik, kimlik));
  if (satir === undefined) return undefined;
  return okunan(satir, (await secenekleriOku(vt, [kimlik])).get(kimlik) ?? []);
};

// Silinmemiş bütün özellikler, sırasıyla ve seçenekleriyle. İki sorgu; sayı sınırlıdır
// (ozellikSinirlari).
const hepsiniOku = async (vt: Veritabani | VeritabaniIslemi = siteninVeritabani()) => {
  const satirlar = await vt
    .select(ozellikAlanlari)
    .from(ozellikler)
    .where(isNull(ozellikler.silinme_zamani))
    .orderBy(asc(ozellikler.sira), asc(ozellikler.olusturma_zamani), asc(ozellikler.kimlik));
  const secenekler = await secenekleriOku(
    vt,
    satirlar.map((satir) => satir.kimlik),
  );
  return satirlar.map((satir) => okunan(satir, secenekler.get(satir.kimlik) ?? []));
};

// Bir özelliğin bir değerine sahip ürünler, tek sorguyla (filtrenin temeli; urun/liste.ts):
// görünürlük, sayfa ve toplam birlikte gelir. Silinmiş özelliğin ve silinmiş seçeneğin ürünü gelmez.
// Değer türü JavaScript türünden çıkar (degerler.ts, degerKosulu); liste değeri seçeneğin kimliğidir.
const urunleri = async (
  vt: Veritabani,
  ozellik: string,
  deger: OzellikDegeri,
  secenekler: UrunListesiSecenekleri = {},
): Promise<UrunListesi> => {
  if (!kimlikMi(ozellik)) return bosUrunListesi();
  if (typeof deger === "number" && !Number.isFinite(deger)) return bosUrunListesi();
  return urunListesi(
    vt,
    sql`exists (
      select 1 from ${urunOzellikDegerleri}
      join ${ozellikler} on ${ozellikler.kimlik} = ${urunOzellikDegerleri.ozellik_kimligi}
      where ${urunOzellikDegerleri.urun_kimligi} = ${urunler.kimlik}
        and ${urunOzellikDegerleri.ozellik_kimligi} = ${ozellik.toLowerCase()}::uuid
        and ${ozellikler.silinme_zamani} is null
        and ${degerKosulu(deger)}
        and (${urunOzellikDegerleri.secenek_kimligi} is null or exists (
          select 1 from ${ozellikSecenekleri}
          where ${ozellikSecenekleri.kimlik} = ${urunOzellikDegerleri.secenek_kimligi}
            and ${ozellikSecenekleri.silinme_zamani} is null))
    )`,
    secenekler,
  );
};

export const ozellikServisi = {
  ekle,
  degistir,
  sil,
  secenekEkle,
  secenekDegistir,
  secenekSil,
  oku,
  hepsiniOku,
  urunleri,
  kilidiAl,
};
