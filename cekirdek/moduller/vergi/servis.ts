// Vergi sınıflarını ve oran tablosunu okuyan ve değiştiren tek yol (kart 0074, karar 0060).
//
// - Başlangıç: sitenin vergi tablosu hiç kurulmamışsa (tek bir sınıf satırı, silinmiş bile olsa, yoksa)
//   ilk okumada ya da ilk değişiklikte başlangıç verisi (baslangic/vergi.json) bir kez yazılır. Sonra
//   dosya okunmaz: dosya ile veritabanı yarışmaz (karar 0010, 0055).
// - Yarış: bütün yazmalar aynı işlem kilidini alır (pg_advisory_xact_lock; kilit veritabanına özeldir,
//   başka sitenin kilidiyle karışmaz). Aynı anda açılan iki süreç başlangıcı iki kez yazamaz, aynı
//   adla iki sınıf açılamaz.
// - Silme silinme işaretiyle yapılır (model.ts). Silinmiş sınıf ve oranı değişmez.
// - Her yazım değişiklik kaydına aynı veritabanı işleminde girer (karar 0045).
//
// İzin kapıda denetlenir (izinler.ts); servis yalnız kimin yaptığını kayda yazar. Girdi şemadan
// geçmemişse servis yine şemadan geçirir: başka bir yoldan gelen ham değer tabloya yazılmaz.
import { and, asc, count, eq, inArray, isNotNull, isNull, max, sql } from "drizzle-orm";
import type { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { adresHatalari } from "../../bolgeler/adres.ts";
import { bolgeHatalari } from "../../bolgeler/bolgeler.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { type DegisikligiYapan, sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import {
  siteninVeritabani,
  type Veritabani,
  type VeritabaniIslemi,
} from "../../veritabani/baglanti.ts";
import { kimligiDuzelt } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { urunler } from "../urun/model.ts";
import { type HesapGirdisi, hesapla, type VergiBolgesi, type VergiSonucu } from "./hesap.ts";
import { vergiOranlari, vergiSiniflari } from "./model.ts";
import {
  type OranDegisikligi,
  type OranGirdisi,
  oranBolgesi,
  oranDegisikligi,
  oranGirdisi,
  type SinifGirdisi,
  sinifDegisikligi,
  sinifGirdisi,
  type VergiBaslangici,
  type VergiHatasi,
  vergiHatalari,
} from "./semalar.ts";

// Başlangıç yazımını yapan, değişiklik kaydında "kim" olarak görünür.
export const baslangicVergiYazari = sistemIslemi("baslangic-vergi");

export type VergiOrani = {
  kimlik: string;
  sinifKimligi: string;
  ulke: string;
  il?: string;
  postaKodu?: string;
  // Milyonda bir biriminde (semalar.ts).
  oran: number;
  ad?: string;
  sira: number;
};

export type VergiSinifi = {
  kimlik: string;
  ad: string;
  sira: number;
  silindi: boolean;
  // Kargo ücreti bu sınıfın oranlarıyla vergilenir (kart 0075). En çok bir sınıf.
  kargo: boolean;
  oranlar: VergiOrani[];
};

const isHatasi = (kod: VergiHatasi) => new BilinenHata("is-kurali", { kod });

const kilitle = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext('vergi'))`);

// Değişiklik kaydına giden değerler: boş alan yazılmaz (kayıt boş değeri kabul etmez).
const sinifKaydi = (sinif: { ad: string; sira: number }) => ({ ad: sinif.ad, sira: sinif.sira });
const oranKaydi = (oran: {
  sinif_kimligi: string;
  ulke: string;
  il: string | null;
  posta_kodu: string | null;
  oran_milyonda: number;
  ad: string | null;
  sira: number;
}): Record<string, unknown> => ({
  sinif: oran.sinif_kimligi,
  ulke: oran.ulke,
  ...(oran.il === null ? {} : { il: oran.il }),
  ...(oran.posta_kodu === null ? {} : { postaKodu: oran.posta_kodu }),
  oranMilyonda: oran.oran_milyonda,
  ...(oran.ad === null ? {} : { ad: oran.ad }),
  sira: oran.sira,
});

type OranAlanlari = {
  ulke: string;
  il?: string | undefined;
  postaKodu?: string | undefined;
  oran: number;
  ad?: string | undefined;
};

const oranSatiri = (sinifKimligi: string, oran: OranAlanlari, sira: number) => ({
  sinif_kimligi: sinifKimligi,
  ulke: oran.ulke,
  il: oran.il ?? null,
  posta_kodu: oran.postaKodu ?? null,
  oran_milyonda: oran.oran,
  ad: oran.ad ?? null,
  sira,
});

const oranAlanlari = {
  kimlik: vergiOranlari.kimlik,
  sinif_kimligi: vergiOranlari.sinif_kimligi,
  ulke: vergiOranlari.ulke,
  il: vergiOranlari.il,
  posta_kodu: vergiOranlari.posta_kodu,
  oran_milyonda: vergiOranlari.oran_milyonda,
  ad: vergiOranlari.ad,
  sira: vergiOranlari.sira,
};

// Şemadan geçmeyen girdi doğrulama hatasıdır. Ayrıntıda her sorunun alanı ve kodu durur: bilinen
// kodlar (vergi, bölge, adres) kendisiyle, ötekiler şemanın sorun türüyle ("too_small" gibi).
const bilinenKodlar = new Set<string>([...vergiHatalari, ...bolgeHatalari, ...adresHatalari]);
const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw new BilinenHata(
    "dogrulama",
    sonuc.error.issues.map((sorun) => ({
      alan: sorun.path.join("."),
      kod: bilinenKodlar.has(sorun.message) ? sorun.message : sorun.code,
    })),
  );
};

export const vergiServisi = (baslangic: () => VergiBaslangici) => {
  // Tablo hiç kurulmamışsa başlangıç verisini yazar. Kilit içinde yeniden bakılır: yarışı kaybeden
  // süreç hiçbir şey yazmaz.
  const kuruluMu = async (vt: Veritabani | VeritabaniIslemi) =>
    (await vt.select({ kimlik: vergiSiniflari.kimlik }).from(vergiSiniflari).limit(1)).length > 0;

  const baslangiciYaz = async (islem: VeritabaniIslemi): Promise<void> => {
    if (await kuruluMu(islem)) return;
    const veri = baslangic();
    for (const [sinifSirasi, sinif] of veri.siniflar.entries()) {
      const [yazilan] = await islem
        .insert(vergiSiniflari)
        .values({ ad: sinif.ad, sira: sinifSirasi, kargo_sinifi: sinif.kargo === true })
        .returning({ kimlik: vergiSiniflari.kimlik });
      if (yazilan === undefined) throw new Error("Vergi sınıfı yazılamadı.");
      await degisikligiKaydet(islem, {
        kim: baslangicVergiYazari,
        islem: "vergi.baslangic",
        kayit: { tur: "vergi-sinifi", kimlik: yazilan.kimlik },
        eski: null,
        yeni: {
          ...sinifKaydi({ ad: sinif.ad, sira: sinifSirasi }),
          ...(sinif.kargo === true ? { kargo: true } : {}),
        },
      });
      if (sinif.oranlar.length === 0) continue;
      const satirlar = sinif.oranlar.map((oran, sira) => oranSatiri(yazilan.kimlik, oran, sira));
      const oranlar = await islem.insert(vergiOranlari).values(satirlar).returning(oranAlanlari);
      for (const oran of oranlar) {
        await degisikligiKaydet(islem, {
          kim: baslangicVergiYazari,
          islem: "vergi.baslangic",
          kayit: { tur: "vergi-orani", kimlik: oran.kimlik },
          eski: null,
          yeni: oranKaydi(oran),
        });
      }
    }
  };

  const kur = async (vt: Veritabani | VeritabaniIslemi): Promise<void> => {
    if (await kuruluMu(vt)) return;
    if (baslangic().siniflar.length === 0) return;
    await vt.transaction(async (islem) => {
      await kilitle(islem);
      await baslangiciYaz(islem);
    });
  };

  // Bütün yazmalar buradan geçer: kilit, eksikse başlangıç, sonra iş. Hata işlemi geri alır.
  const yaz = async <T>(vt: Veritabani, is: (islem: VeritabaniIslemi) => Promise<T>) =>
    vt.transaction(async (islem) => {
      await kilitle(islem);
      await baslangiciYaz(islem);
      return is(islem);
    });

  // Sınıflar sırasıyla, her biri silinmemiş oranlarıyla. Silinmiş sınıflar yalnız istenirse gelir
  // (ürünü hâlâ ona bağlı olabilir). İki sorgu: satır başına sorgu atılmaz.
  const tabloyuOku = async (
    vt: Veritabani | VeritabaniIslemi,
    { silinmisSiniflar = false }: { silinmisSiniflar?: boolean } = {},
  ): Promise<VergiSinifi[]> => {
    await kur(vt);
    const siniflar = await vt
      .select({
        kimlik: vergiSiniflari.kimlik,
        ad: vergiSiniflari.ad,
        sira: vergiSiniflari.sira,
        kargo: vergiSiniflari.kargo_sinifi,
        silinme: vergiSiniflari.silinme_zamani,
      })
      .from(vergiSiniflari)
      .where(silinmisSiniflar ? undefined : isNull(vergiSiniflari.silinme_zamani))
      .orderBy(asc(vergiSiniflari.sira), asc(vergiSiniflari.ad));
    if (siniflar.length === 0) return [];
    const oranlar = await vt
      .select(oranAlanlari)
      .from(vergiOranlari)
      .where(
        and(
          inArray(
            vergiOranlari.sinif_kimligi,
            siniflar.map((sinif) => sinif.kimlik),
          ),
          isNull(vergiOranlari.silinme_zamani),
        ),
      )
      .orderBy(asc(vergiOranlari.sira), asc(vergiOranlari.olusturma_zamani));
    return siniflar.map((sinif) => ({
      kimlik: sinif.kimlik,
      ad: sinif.ad,
      sira: sinif.sira,
      silindi: sinif.silinme !== null,
      kargo: sinif.kargo,
      oranlar: oranlar
        .filter((oran) => oran.sinif_kimligi === sinif.kimlik)
        .map((oran) => ({
          kimlik: oran.kimlik,
          sinifKimligi: oran.sinif_kimligi,
          ulke: oran.ulke,
          ...(oran.il === null ? {} : { il: oran.il }),
          ...(oran.posta_kodu === null ? {} : { postaKodu: oran.posta_kodu }),
          oran: oran.oran_milyonda,
          ...(oran.ad === null ? {} : { ad: oran.ad }),
          sira: oran.sira,
        })),
    }));
  };

  // Kilit altında: silinmemiş başka bir sınıf bu adı taşıyor mu?
  const adKullaniliyor = async (islem: VeritabaniIslemi, ad: string, haric?: string) => {
    const bulunan = await islem
      .select({ kimlik: vergiSiniflari.kimlik })
      .from(vergiSiniflari)
      .where(and(eq(vergiSiniflari.ad, ad), isNull(vergiSiniflari.silinme_zamani)));
    return bulunan.some((sinif) => sinif.kimlik !== haric);
  };

  // Değişecek sınıf: yoksa bulunamadı, silinmişse iş kuralı.
  const degisebilenSinif = async (islem: VeritabaniIslemi, kimlik: string) => {
    const [sinif] = await islem
      .select({
        kimlik: vergiSiniflari.kimlik,
        ad: vergiSiniflari.ad,
        sira: vergiSiniflari.sira,
        silinme: vergiSiniflari.silinme_zamani,
      })
      .from(vergiSiniflari)
      .where(eq(vergiSiniflari.kimlik, kimlik));
    if (sinif === undefined) throw new BilinenHata("bulunamadi");
    if (sinif.silinme !== null) throw isHatasi("sinif-silinmis");
    return sinif;
  };

  const degisebilenOran = async (islem: VeritabaniIslemi, kimlik: string) => {
    const [oran] = await islem
      .select({ ...oranAlanlari, silinme: vergiOranlari.silinme_zamani })
      .from(vergiOranlari)
      .where(eq(vergiOranlari.kimlik, kimlik));
    if (oran === undefined || oran.silinme !== null) throw new BilinenHata("bulunamadi");
    await degisebilenSinif(islem, oran.sinif_kimligi);
    return oran;
  };

  // Sıra verilmezse yeni kayıt silinmemişlerin sonuna gelir.
  const sonrakiSinifSirasi = async (islem: VeritabaniIslemi) => {
    const [son] = await islem
      .select({ sira: max(vergiSiniflari.sira) })
      .from(vergiSiniflari)
      .where(isNull(vergiSiniflari.silinme_zamani));
    return son?.sira === null || son?.sira === undefined ? 0 : son.sira + 1;
  };
  const sonrakiOranSirasi = async (islem: VeritabaniIslemi, sinifKimligi: string) => {
    const [son] = await islem
      .select({ sira: max(vergiOranlari.sira) })
      .from(vergiOranlari)
      .where(
        and(eq(vergiOranlari.sinif_kimligi, sinifKimligi), isNull(vergiOranlari.silinme_zamani)),
      );
    return son?.sira === null || son?.sira === undefined ? 0 : son.sira + 1;
  };

  const sinifEkle = async (vt: Veritabani, kim: DegisikligiYapan, ham: SinifGirdisi) => {
    const girdi = girdiyiDogrula(sinifGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      if (await adKullaniliyor(islem, girdi.ad)) throw isHatasi("ad-tekrar");
      const sinif = { ad: girdi.ad, sira: girdi.sira ?? (await sonrakiSinifSirasi(islem)) };
      const [yazilan] = await islem
        .insert(vergiSiniflari)
        .values(sinif)
        .returning({ kimlik: vergiSiniflari.kimlik });
      if (yazilan === undefined) throw new Error("Vergi sınıfı yazılamadı.");
      await degisikligiKaydet(islem, {
        kim,
        islem: "vergi-sinifi.eklendi",
        kayit: { tur: "vergi-sinifi", kimlik: yazilan.kimlik },
        eski: null,
        yeni: sinifKaydi(sinif),
      });
      return yazilan.kimlik;
    });
  };

  // Değeri aynı kalan değişiklik kayda girmez.
  const sinifDegistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kimlik: string,
    ham: Partial<SinifGirdisi>,
  ) => {
    const girdi = girdiyiDogrula(sinifDegisikligi.safeParse(ham));
    return yaz(vt, async (islem) => {
      const eski = await degisebilenSinif(islem, kimlik);
      const yeni = { ad: girdi.ad ?? eski.ad, sira: girdi.sira ?? eski.sira };
      if (yeni.ad === eski.ad && yeni.sira === eski.sira) return;
      if (yeni.ad !== eski.ad && (await adKullaniliyor(islem, yeni.ad, kimlik))) {
        throw isHatasi("ad-tekrar");
      }
      await islem
        .update(vergiSiniflari)
        .set({ ...yeni, guncellenme_zamani: sql`now()` })
        .where(eq(vergiSiniflari.kimlik, kimlik));
      await degisikligiKaydet(islem, {
        kim,
        islem: "vergi-sinifi.degisti",
        kayit: { tur: "vergi-sinifi", kimlik },
        eski: sinifKaydi(eski),
        yeni: sinifKaydi(yeni),
      });
    });
  };

  // Silinmiş işaretiyle: satır ve oranları kalır, ürün sınıfsız kalmaz (model.ts).
  const sinifSil = (vt: Veritabani, kim: DegisikligiYapan, kimlik: string) =>
    yaz(vt, async (islem) => {
      const eski = await degisebilenSinif(islem, kimlik);
      await islem
        .update(vergiSiniflari)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(eq(vergiSiniflari.kimlik, kimlik));
      await degisikligiKaydet(islem, {
        kim,
        islem: "vergi-sinifi.silindi",
        kayit: { tur: "vergi-sinifi", kimlik },
        eski: sinifKaydi(eski),
        yeni: null,
      });
    });

  const oranEkle = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    sinifKimligi: string,
    ham: OranGirdisi,
  ) => {
    const girdi = girdiyiDogrula(oranGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      await degisebilenSinif(islem, sinifKimligi);
      const sira = girdi.sira ?? (await sonrakiOranSirasi(islem, sinifKimligi));
      const [yazilan] = await islem
        .insert(vergiOranlari)
        .values(oranSatiri(sinifKimligi, girdi, sira))
        .returning(oranAlanlari);
      if (yazilan === undefined) throw new Error("Vergi oranı yazılamadı.");
      await degisikligiKaydet(islem, {
        kim,
        islem: "vergi-orani.eklendi",
        kayit: { tur: "vergi-orani", kimlik: yazilan.kimlik },
        eski: null,
        yeni: oranKaydi(yazilan),
      });
      return yazilan.kimlik;
    });
  };

  // Yalnız verilen alan değişir, null isteğe bağlı alanı boşaltır (semalar.ts); sınıfı değişmez.
  // Bölge kuralı birleşmiş sonuca uygulanır. Aynı kalan değişiklik kayda girmez.
  const oranDegistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kimlik: string,
    ham: OranDegisikligi,
  ) => {
    const girdi = girdiyiDogrula(oranDegisikligi.safeParse(ham));
    const secilen = <T>(verilen: T | null | undefined, eski: T | null) =>
      (verilen === undefined ? eski : verilen) ?? undefined;
    return yaz(vt, async (islem) => {
      const eski = await degisebilenOran(islem, kimlik);
      const bolge = girdiyiDogrula(
        oranBolgesi.safeParse({
          ulke: girdi.ulke ?? eski.ulke,
          il: secilen(girdi.il, eski.il),
          postaKodu: secilen(girdi.postaKodu, eski.posta_kodu),
        }),
      );
      const yeni = oranSatiri(
        eski.sinif_kimligi,
        { ...bolge, oran: girdi.oran ?? eski.oran_milyonda, ad: secilen(girdi.ad, eski.ad) },
        girdi.sira ?? eski.sira,
      );
      const eskiKayit = oranKaydi(eski);
      const yeniKayit = oranKaydi(yeni);
      if (JSON.stringify(eskiKayit) === JSON.stringify(yeniKayit)) return;
      await islem
        .update(vergiOranlari)
        .set({ ...yeni, guncellenme_zamani: sql`now()` })
        .where(eq(vergiOranlari.kimlik, kimlik));
      await degisikligiKaydet(islem, {
        kim,
        islem: "vergi-orani.degisti",
        kayit: { tur: "vergi-orani", kimlik },
        eski: eskiKayit,
        yeni: yeniKayit,
      });
    });
  };

  const oranSil = (vt: Veritabani, kim: DegisikligiYapan, kimlik: string) =>
    yaz(vt, async (islem) => {
      const eski = await degisebilenOran(islem, kimlik);
      await islem
        .update(vergiOranlari)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(eq(vergiOranlari.kimlik, kimlik));
      await degisikligiKaydet(islem, {
        kim,
        islem: "vergi-orani.silindi",
        kayit: { tur: "vergi-orani", kimlik },
        eski: oranKaydi(eski),
        yeni: null,
      });
    });

  // Kargo ücretinin sınıfını seçer; null kargoyu vergisiz yapar (kart 0075). Silinmiş sınıf seçilemez,
  // ama seçiliyken silinen sınıf kargo sınıfı kalır. Değişmeyen seçim kayda girmez.
  const kargoSinifiniDegistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kimlikGirdisi: string | null,
  ) =>
    yaz(vt, async (islem) => {
      // Büyük harfle yazılmış aynı sınıf aynı seçimdir (kart 0119).
      const kimlik = kimlikGirdisi === null ? null : kimligiDuzelt(kimlikGirdisi);
      const [eski] = await islem
        .select({ kimlik: vergiSiniflari.kimlik })
        .from(vergiSiniflari)
        .where(eq(vergiSiniflari.kargo_sinifi, true));
      // Seçim değişmiyorsa hiçbir şey yapılmaz: seçiliyken silinen sınıfı yeniden seçmek hata değildir.
      if ((eski?.kimlik ?? null) === kimlik) return;
      if (kimlik !== null) await degisebilenSinif(islem, kimlik);
      if (eski !== undefined) {
        await islem
          .update(vergiSiniflari)
          .set({ kargo_sinifi: false, guncellenme_zamani: sql`now()` })
          .where(eq(vergiSiniflari.kimlik, eski.kimlik));
      }
      if (kimlik !== null) {
        await islem
          .update(vergiSiniflari)
          .set({ kargo_sinifi: true, guncellenme_zamani: sql`now()` })
          .where(eq(vergiSiniflari.kimlik, kimlik));
      }
      await degisikligiKaydet(islem, {
        kim,
        islem: "vergi.kargo-sinifi",
        kayit: { tur: "vergi-sinifi", kimlik: kimlik ?? eski?.kimlik ?? "" },
        eski: { kargoSinifi: eski?.kimlik ?? null },
        yeni: { kargoSinifi: kimlik },
      });
    });

  // Silinmemiş sınıfların yeni sırası (kart 0322): liste silinmemiş sınıfların tam kümesi olmalı (eksik, fazla, tekrarlı ya da
  // arada değişmiş liste `cakisma` (`siralama-gecersiz`) alır, hiçbir şey yazılmaz). Yalnız sırası değişen sınıf yazılır ve kayda girer.
  const siniflariSirala = (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kimlikGirdisi: readonly string[],
  ) =>
    yaz(vt, async (islem) => {
      const kimlikler = kimlikGirdisi.map(kimligiDuzelt);
      const siniflar = await islem
        .select({ kimlik: vergiSiniflari.kimlik, ad: vergiSiniflari.ad, sira: vergiSiniflari.sira })
        .from(vergiSiniflari)
        .where(isNull(vergiSiniflari.silinme_zamani));
      const varolan = new Set(siniflar.map((sinif) => sinif.kimlik));
      if (
        kimlikler.length !== siniflar.length ||
        new Set(kimlikler).size !== kimlikler.length ||
        kimlikler.some((kimlik) => !varolan.has(kimlik))
      ) {
        throw new BilinenHata("cakisma", { kod: "siralama-gecersiz" });
      }
      for (const [sira, kimlik] of kimlikler.entries()) {
        const eski = siniflar.find((sinif) => sinif.kimlik === kimlik);
        if (eski === undefined || eski.sira === sira) continue;
        await islem
          .update(vergiSiniflari)
          .set({ sira, guncellenme_zamani: sql`now()` })
          .where(eq(vergiSiniflari.kimlik, kimlik));
        await degisikligiKaydet(islem, {
          kim,
          islem: "vergi-sinifi.degisti",
          kayit: { tur: "vergi-sinifi", kimlik },
          eski: sinifKaydi(eski),
          yeni: sinifKaydi({ ad: eski.ad, sira }),
        });
      }
    });

  // Her sınıfa bağlı silinmemiş ürün sayısı (kart 0322): silme onayı kaç ürünün etkileneceğini söyler. Tek sorgu.
  const sinifUrunSayilari = async (
    vt: Veritabani | VeritabaniIslemi,
  ): Promise<Map<string, number>> => {
    const satirlar = await vt
      .select({ sinif: urunler.vergi_sinifi_kimligi, sayi: count() })
      .from(urunler)
      .where(and(isNotNull(urunler.vergi_sinifi_kimligi), isNull(urunler.silinme_zamani)))
      .groupBy(urunler.vergi_sinifi_kimligi);
    return new Map(
      satirlar.flatMap((satir) => (satir.sinif === null ? [] : [[satir.sinif, satir.sayi]])),
    );
  };

  return {
    tabloyuOku,
    siniflariSirala,
    sinifUrunSayilari,
    sinifEkle,
    sinifDegistir,
    sinifSil,
    oranEkle,
    oranDegistir,
    oranSil,
    kargoSinifiniDegistir,
  };
};

// Verilen sitenin servisi: arka plan işi ve testler siteyi kendisi verir.
export const siteninVergiServisi = (site: Site) => vergiServisi(() => site.vergiBaslangici);

// Sitenin ayarları ve vergi tablosuyla verginin hesabı (kart 0075). Hesabın kendisi hesap.ts'dedir;
// bu işlev yalnız ayarları, silinmiş sınıflarıyla tabloyu ve mağaza adresini okur.
type VergiHesabiGirdisi = Omit<HesapGirdisi, "ayarlar" | "tablo" | "adresler"> & {
  teslimatAdresi?: VergiBolgesi;
  faturaAdresi?: VergiBolgesi;
};

// Aynı ayar ve tabloyla birden çok hesap (kart 0312): sepet, kuponlu sepette kupondan önceki ve sonraki hesabı aynı
// okumayla yapar.
export const vergiHesaplari = async (
  vt: Veritabani,
  girdiler: readonly VergiHesabiGirdisi[],
  site: Site = calisanSite(),
): Promise<VergiSonucu[]> => {
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  const tablo = await siteninVergiServisi(site).tabloyuOku(vt, { silinmisSiniflar: true });
  const magaza = ayarlar.magazaAdresi;
  return girdiler.map((girdi) =>
    hesapla({
      ayarlar,
      tablo,
      adresler: {
        ...(girdi.teslimatAdresi === undefined ? {} : { teslimat: girdi.teslimatAdresi }),
        ...(girdi.faturaAdresi === undefined ? {} : { fatura: girdi.faturaAdresi }),
        ...(magaza === undefined
          ? {}
          : { magaza: { ulke: magaza.ulke, il: magaza.il, postaKodu: magaza.postaKodu } }),
      },
      satirlar: girdi.satirlar,
      ...(girdi.kargo === undefined ? {} : { kargo: girdi.kargo }),
    }),
  );
};

export const vergiHesapla = async (
  vt: Veritabani,
  girdi: VergiHesabiGirdisi,
  site: Site = calisanSite(),
): Promise<VergiSonucu> => {
  const [sonuc] = await vergiHesaplari(vt, [girdi], site);
  if (sonuc === undefined) throw new Error("Vergi hesabı yapılmadı.");
  return sonuc;
};

// Çalışan sitenin servisi. Başlangıç verisi site klasöründen gelir, yalnız tablo kurulmamışsa okunur.
const calisanSiteninServisi = vergiServisi(() => calisanSite().vergiBaslangici);

export const vergiTablosunuOku = (
  vt: Veritabani = siteninVeritabani(),
  secenekler?: { silinmisSiniflar?: boolean },
) => calisanSiteninServisi.tabloyuOku(vt, secenekler);

export const calisanSiteninVergiServisi = () => calisanSiteninServisi;
