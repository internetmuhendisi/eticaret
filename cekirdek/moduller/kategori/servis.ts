// Kategorileri okuyan ve değiştiren tek yol (kart 0077, karar 0063).
//
// - Yarış: bütün yazmalar aynı işlem kilidini alır (pg_advisory_xact_lock; veritabanına özeldir).
//   Döngü, kardeş adı ve adres adı kilit altında denetlenir. Veritabanındaki döngü tetikleyicisi aynı
//   kilidi alır: servisi atlayan yazılar da sırayla denetlenir.
// - Taşıma: üst kategorinin değişmesidir. Kategori kendi altına ya da bir torununun altına taşınamaz.
// - Silme (kullanıcı kararı): kategori silinmiş olarak işaretlenir, alt kategorileri onun üstüne çıkar,
//   ürünlerle bağlantısı kalkar (ürünler başka kategorilerinde kalır). Üste çıkan bir alt kategori orada
//   aynı adlı bir kardeşle karşılaşacaksa silme yapılmaz.
// - Her yazım değişiklik kaydına aynı veritabanı işleminde girer (karar 0045). Silmede alt kategorilerin
//   taşınması da kayda girer; kalkan ürün bağlantıları silme kaydında listelenir.
//
// İzin kapıda denetlenir (izinler.ts); servis yalnız kimin yaptığını kayda yazar.
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, max, ne, notInArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import { bosAdresAdi } from "../../metinler/adres-adi.ts";
import {
  siteninVeritabani,
  type Veritabani,
  type VeritabaniIslemi,
} from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { urunKilidiAl } from "../urun/kilit.ts";
import {
  bosUrunListesi,
  type UrunListesi,
  type UrunListesiSecenekleri,
  urunListesi,
} from "../urun/liste.ts";
import { urunler } from "../urun/model.ts";
import { kategoriler, urunKategorileri } from "./model.ts";
import {
  type KategoriDegisikligi,
  type KategoriGirdisi,
  type KategoriHatasi,
  kategoriDegisikligi,
  kategoriGirdisi,
  kategoriHatalari,
} from "./semalar.ts";

export type Kategori = {
  kimlik: string;
  ad: string;
  adresAdi: string;
  aciklama?: string;
  // Boşsa (null) en üsttedir.
  ust: string | null;
  sira: number;
  silindi: boolean;
};

type KategoriKaydi = {
  ad: string;
  adresAdi: string;
  aciklama: string | null;
  ust: string | null;
  sira: number;
};

type Sorun = { alan: string; kod: string; kimlik?: string };
const dogrulamaHatasi = (sorunlar: Sorun[]) => new BilinenHata("dogrulama", sorunlar);
const cakisma = (sorunlar: Sorun[]) => new BilinenHata("cakisma", sorunlar);
const isKurali = (alan: string, kod: KategoriHatasi) =>
  new BilinenHata("is-kurali", [{ alan, kod }]);

const bilinenKodlar = new Set<string>(kategoriHatalari);
const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw dogrulamaHatasi(
    sonuc.error.issues.map((sorun) => ({
      alan: sorun.path.join("."),
      kod: bilinenKodlar.has(sorun.message) ? sorun.message : sorun.code,
    })),
  );
};

// Değişiklik kaydına giden değer: boş alan yazılmaz.
const kayitDegeri = (kayit: Partial<KategoriKaydi> & Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(kayit).filter(([, deger]) => deger !== null && deger !== undefined),
  );

const kilitle = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext('kategori'))`);

const kategoriAlanlari = {
  kimlik: kategoriler.kimlik,
  ad: kategoriler.ad,
  adresAdi: kategoriler.adres_adi,
  aciklama: kategoriler.aciklama,
  ust: kategoriler.ust_kimligi,
  sira: kategoriler.sira,
  silinme: kategoriler.silinme_zamani,
};

const okunan = (satir: {
  kimlik: string;
  ad: string;
  adresAdi: string;
  aciklama: string | null;
  ust: string | null;
  sira: number;
  silinme: Date | null;
}): Kategori => ({
  kimlik: satir.kimlik,
  ad: satir.ad,
  adresAdi: satir.adresAdi,
  ...(satir.aciklama === null ? {} : { aciklama: satir.aciklama }),
  ust: satir.ust,
  sira: satir.sira,
  silindi: satir.silinme !== null,
});

// Aynı üstün altında olmak: en üsttekilerin üstü boştur.
const ayniUst = (ust: string | null) =>
  ust === null ? isNull(kategoriler.ust_kimligi) : eq(kategoriler.ust_kimligi, ust);

const yaz = <T>(vt: Veritabani, is: (islem: VeritabaniIslemi) => Promise<T>) =>
  vt.transaction(async (islem) => {
    await kilitle(islem);
    return is(islem);
  });

// Kilit altında: üstün altında bu adla (büyük küçük harf ayrımsız) silinmemiş başka bir kategori var mı?
const kardesAdiKullaniliyor = async (
  islem: VeritabaniIslemi,
  ust: string | null,
  ad: string,
  haric: string[],
) =>
  (
    await islem
      .select({ kimlik: kategoriler.kimlik })
      .from(kategoriler)
      .where(
        and(
          ayniUst(ust),
          sql`${adAnahtariSql(kategoriler.ad)} = ${adAnahtariSql(ad)}`,
          isNull(kategoriler.silinme_zamani),
          haric.length > 0 ? notInArray(kategoriler.kimlik, haric) : undefined,
        ),
      )
  ).length > 0;

const adresAdiKullaniliyor = async (islem: VeritabaniIslemi, adresAdi: string, haric?: string) =>
  (
    await islem
      .select({ kimlik: kategoriler.kimlik })
      .from(kategoriler)
      .where(
        and(
          eq(kategoriler.adres_adi, adresAdi),
          isNull(kategoriler.silinme_zamani),
          haric === undefined ? undefined : ne(kategoriler.kimlik, haric),
        ),
      )
  ).length > 0;

// Üst kategori var ve silinmemiş olmalı.
const ustuDenetle = async (islem: VeritabaniIslemi, ust: string | null) => {
  if (ust === null) return;
  const [bulunan] = await islem
    .select({ kimlik: kategoriler.kimlik })
    .from(kategoriler)
    .where(and(eq(kategoriler.kimlik, ust), isNull(kategoriler.silinme_zamani)));
  if (bulunan === undefined) throw dogrulamaHatasi([{ alan: "ust", kod: "ust-gecersiz" }]);
};

// Kategori, yeni üstünün kendisi ya da atalarından biri mi? (taşıma döngü kurar mı)
const donguKurar = async (islem: VeritabaniIslemi, kimlik: string, ust: string | null) => {
  if (ust === null) return false;
  if (ust === kimlik) return true;
  const sonuc = await islem.execute(sql`
    with recursive atalar(kimlik) as (
      select ${ust}::uuid
      union
      select ${kategoriler.ust_kimligi} from ${kategoriler}
        join atalar on ${kategoriler.kimlik} = atalar.kimlik
        where ${kategoriler.ust_kimligi} is not null
    )
    select 1 from atalar where kimlik = ${kimlik}::uuid`);
  return sonuc.rows.length > 0;
};

const sonrakiSira = async (islem: VeritabaniIslemi, ust: string | null) => {
  const [son] = await islem
    .select({ sira: max(kategoriler.sira) })
    .from(kategoriler)
    .where(and(ayniUst(ust), isNull(kategoriler.silinme_zamani)));
  return son?.sira === null || son?.sira === undefined ? 0 : son.sira + 1;
};

const degisebilenKategori = async (islem: VeritabaniIslemi, kimlik: string) => {
  if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
  const [satir] = await islem
    .select(kategoriAlanlari)
    .from(kategoriler)
    .where(eq(kategoriler.kimlik, kimlik));
  if (satir === undefined || satir.silinme !== null) throw new BilinenHata("bulunamadi");
  const kayit: KategoriKaydi = {
    ad: satir.ad,
    adresAdi: satir.adresAdi,
    aciklama: satir.aciklama,
    ust: satir.ust,
    sira: satir.sira,
  };
  return kayit;
};

const kategoriSatiri = (kayit: KategoriKaydi) => ({
  ad: kayit.ad,
  adres_adi: kayit.adresAdi,
  aciklama: kayit.aciklama,
  ust_kimligi: kayit.ust,
  sira: kayit.sira,
});

export const kategoriEkle = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  ham: KategoriGirdisi,
): Promise<string> => {
  const girdi = girdiyiDogrula(kategoriGirdisi.safeParse(ham));
  return yaz(vt, async (islem) => {
    await ustuDenetle(islem, girdi.ust);
    if (await kardesAdiKullaniliyor(islem, girdi.ust, girdi.ad, [])) {
      throw cakisma([{ alan: "ad", kod: "ad-tekrar" }]);
    }
    if (girdi.adresAdi !== undefined && (await adresAdiKullaniliyor(islem, girdi.adresAdi))) {
      throw cakisma([{ alan: "adresAdi", kod: "adres-adi-tekrar" }]);
    }
    const kimlik = randomUUID();
    const kayit: KategoriKaydi = {
      ad: girdi.ad,
      adresAdi:
        girdi.adresAdi ??
        (await bosAdresAdi(girdi.ad, kimlik, async (adaylar) => {
          const satirlar = await islem
            .select({ adresAdi: kategoriler.adres_adi })
            .from(kategoriler)
            .where(
              and(isNull(kategoriler.silinme_zamani), inArray(kategoriler.adres_adi, adaylar)),
            );
          return new Set(satirlar.map((satir) => satir.adresAdi));
        })),
      aciklama: girdi.aciklama ?? null,
      ust: girdi.ust,
      sira: girdi.sira ?? (await sonrakiSira(islem, girdi.ust)),
    };
    await islem.insert(kategoriler).values({ kimlik, ...kategoriSatiri(kayit) });
    await degisikligiKaydet(islem, {
      kim,
      islem: "kategori.eklendi",
      kayit: { tur: "kategori", kimlik },
      eski: null,
      yeni: kayitDegeri(kayit),
    });
    return kimlik;
  });
};

// Yalnız verilen alan değişir. Üst değişirse taşımadır: yeni üst var olmalı, döngü kurulmamalı, yeni
// kardeşler arasında ad tekil olmalı. Taşınan kategorinin sırası verilmezse yeni kardeşlerin sonuna
// gelir. Aynı kalan değişiklik kayda girmez, kayda yalnız değişen alanlar yazılır.
export const kategoriDegistir = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  kimlik: string,
  ham: KategoriDegisikligi,
): Promise<void> => {
  const girdi = girdiyiDogrula(kategoriDegisikligi.safeParse(ham));
  await yaz(vt, async (islem) => {
    const eski = await degisebilenKategori(islem, kimlik);
    const ust = girdi.ust === undefined ? eski.ust : girdi.ust;
    const tasindi = ust !== eski.ust;
    const yeni: KategoriKaydi = {
      ad: girdi.ad ?? eski.ad,
      adresAdi: girdi.adresAdi ?? eski.adresAdi,
      aciklama: girdi.aciklama === undefined ? eski.aciklama : girdi.aciklama,
      ust,
      sira: girdi.sira ?? (tasindi ? await sonrakiSira(islem, ust) : eski.sira),
    };
    const alanlar = ["ad", "adresAdi", "aciklama", "ust", "sira"] as const;
    const degisen = alanlar.filter((alan) => eski[alan] !== yeni[alan]);
    if (degisen.length === 0) return;
    if (tasindi) {
      await ustuDenetle(islem, ust);
      if (await donguKurar(islem, kimlik, ust)) throw isKurali("ust", "dongu");
    }
    if (
      (tasindi || yeni.ad !== eski.ad) &&
      (await kardesAdiKullaniliyor(islem, ust, yeni.ad, [kimlik]))
    ) {
      throw cakisma([{ alan: "ad", kod: "ad-tekrar" }]);
    }
    if (
      yeni.adresAdi !== eski.adresAdi &&
      (await adresAdiKullaniliyor(islem, yeni.adresAdi, kimlik))
    ) {
      throw cakisma([{ alan: "adresAdi", kod: "adres-adi-tekrar" }]);
    }
    await islem
      .update(kategoriler)
      .set({ ...kategoriSatiri(yeni), guncellenme_zamani: sql`now()` })
      .where(eq(kategoriler.kimlik, kimlik));
    const sec = (kaynak: KategoriKaydi) =>
      Object.fromEntries(degisen.map((alan) => [alan, kaynak[alan]]));
    await degisikligiKaydet(islem, {
      kim,
      islem: "kategori.degisti",
      kayit: { tur: "kategori", kimlik },
      eski: sec(eski),
      yeni: sec(yeni),
    });
  });
};

// Silme kuralı (kullanıcı kararı, karar 0063): kategori işaretlenir, alt kategorileri onun üstüne
// çıkar, ürün bağlantıları kalkar. Önce bütün çakışmalar aranır: biri bile varsa hiçbir şey değişmez.
export const kategoriSil = (vt: Veritabani, kim: DegisikligiYapan, kimlik: string) =>
  yaz(vt, async (islem) => {
    // Birden çok kategori satırı güncellenir: ürün değişikliğiyle kilitlenmemek için önce ürün kilidi
    // alınır (urun/kilit.ts).
    await urunKilidiAl(islem);
    const kategori = await degisebilenKategori(islem, kimlik);
    const altlar = await islem
      .select({ kimlik: kategoriler.kimlik, ad: kategoriler.ad, sira: kategoriler.sira })
      .from(kategoriler)
      .where(and(eq(kategoriler.ust_kimligi, kimlik), isNull(kategoriler.silinme_zamani)))
      .orderBy(asc(kategoriler.sira), asc(kategoriler.ad));
    const cakisanlar: Sorun[] = [];
    for (const alt of altlar) {
      if (await kardesAdiKullaniliyor(islem, kategori.ust, alt.ad, [kimlik])) {
        cakisanlar.push({ alan: "ad", kod: "silmede-ad-tekrar", kimlik: alt.kimlik });
      }
    }
    if (cakisanlar.length > 0) throw cakisma(cakisanlar);
    await islem
      .update(kategoriler)
      .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
      .where(eq(kategoriler.kimlik, kimlik));
    for (const alt of altlar) {
      await islem
        .update(kategoriler)
        .set({ ust_kimligi: kategori.ust, guncellenme_zamani: sql`now()` })
        .where(eq(kategoriler.kimlik, alt.kimlik));
      await degisikligiKaydet(islem, {
        kim,
        islem: "kategori.degisti",
        kayit: { tur: "kategori", kimlik: alt.kimlik },
        eski: { ust: kimlik },
        yeni: { ust: kategori.ust },
      });
    }
    const kalkan = await islem
      .delete(urunKategorileri)
      .where(eq(urunKategorileri.kategori_kimligi, kimlik))
      .returning({ urun: urunKategorileri.urun_kimligi });
    await degisikligiKaydet(islem, {
      kim,
      islem: "kategori.silindi",
      kayit: { tur: "kategori", kimlik },
      eski: {
        ...kayitDegeri(kategori),
        ...(kalkan.length > 0 ? { urunler: kalkan.map(({ urun }) => urun).toSorted() } : {}),
      },
      yeni: null,
    });
  });

// Kategori, silinmiş olsa da okunur.
export const kategoriyiOku = async (
  kimlik: string,
  vt: Veritabani = siteninVeritabani(),
): Promise<Kategori | undefined> => {
  if (!kimlikMi(kimlik)) return undefined;
  const [satir] = await vt
    .select(kategoriAlanlari)
    .from(kategoriler)
    .where(eq(kategoriler.kimlik, kimlik));
  return satir === undefined ? undefined : okunan(satir);
};

// Silinmemiş bütün kategoriler, kardeş sırasıyla. Ağacı ekran kurar; sitede en çok birkaç yüz kategori
// olur, tek sorgu.
export const kategorileriOku = async (vt: Veritabani = siteninVeritabani()): Promise<Kategori[]> =>
  (
    await vt
      .select(kategoriAlanlari)
      .from(kategoriler)
      .where(isNull(kategoriler.silinme_zamani))
      .orderBy(asc(kategoriler.sira), sql`lower(${kategoriler.ad})`, asc(kategoriler.kimlik))
  ).map(okunan);

export type KategoriUrunleriSecenekleri = UrunListesiSecenekleri & {
  // Alt kategorilerin (bütün alt ağacın) ürünleri de gelsin mi? Vitrinde hangisinin kullanılacağına
  // kategori sayfası karar verir.
  altKategoriler?: boolean;
};

// Bir kategorinin ürünleri tek sorguyla (urun/liste.ts): kategori ağacı, bağlantılar, görünürlük, sayfa
// ve toplam birlikte. Silinmiş kategori gelmez. Bir ürün birden çok eşleşen kategoride olsa da bir kez
// gelir.
export const kategorininUrunleri = async (
  vt: Veritabani,
  kimlik: string,
  { altKategoriler = false, ...secenekler }: KategoriUrunleriSecenekleri = {},
): Promise<UrunListesi> => {
  if (!kimlikMi(kimlik)) return bosUrunListesi();
  return urunListesi(
    vt,
    sql`exists (
      select 1 from ${urunKategorileri}
      where ${urunKategorileri.urun_kimligi} = ${urunler.kimlik}
        and ${urunKategorileri.kategori_kimligi} in (
          with recursive agac(kimlik) as (
            select ${kategoriler.kimlik} from ${kategoriler}
              where ${kategoriler.kimlik} = ${kimlik}::uuid and ${kategoriler.silinme_zamani} is null
            union
            select ${kategoriler.kimlik} from ${kategoriler}
              join agac on ${kategoriler.ust_kimligi} = agac.kimlik
              where ${altKategoriler} and ${kategoriler.silinme_zamani} is null
          )
          select kimlik from agac
        )
    )`,
    secenekler,
  );
};
