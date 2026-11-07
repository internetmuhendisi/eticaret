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
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { type DegisikligiYapan, sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import {
  siteninVeritabani,
  type Veritabani,
  type VeritabaniIslemi,
} from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { vergiOranlari, vergiSiniflari } from "./model.ts";
import {
  type OranDegeri,
  type OranGirdisi,
  oranGirdisi,
  type SinifGirdisi,
  sinifDegisikligi,
  sinifGirdisi,
  type VergiBaslangici,
  type VergiHatasi,
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

const oranSatiri = (sinifKimligi: string, oran: Omit<OranDegeri, "sira">, sira: number) => ({
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

const girdiyiDogrula = <T>(
  sonuc: { success: true; data: T } | { success: false; error: unknown },
) => {
  if (!sonuc.success) throw new BilinenHata("dogrulama");
  return sonuc.data;
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
        .values({ ad: sinif.ad, sira: sinifSirasi })
        .returning({ kimlik: vergiSiniflari.kimlik });
      if (yazilan === undefined) throw new Error("Vergi sınıfı yazılamadı.");
      await degisikligiKaydet(islem, {
        kim: baslangicVergiYazari,
        islem: "vergi.baslangic",
        kayit: { tur: "vergi-sinifi", kimlik: yazilan.kimlik },
        eski: null,
        yeni: sinifKaydi({ ad: sinif.ad, sira: sinifSirasi }),
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

  const kur = async (vt: Veritabani): Promise<void> => {
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
    vt: Veritabani,
    { silinmisSiniflar = false }: { silinmisSiniflar?: boolean } = {},
  ): Promise<VergiSinifi[]> => {
    await kur(vt);
    const siniflar = await vt
      .select({
        kimlik: vergiSiniflari.kimlik,
        ad: vergiSiniflari.ad,
        sira: vergiSiniflari.sira,
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

  const sinifEkle = async (vt: Veritabani, kim: DegisikligiYapan, ham: SinifGirdisi) => {
    const girdi = girdiyiDogrula(sinifGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      if (await adKullaniliyor(islem, girdi.ad)) throw isHatasi("ad-tekrar");
      const [yazilan] = await islem
        .insert(vergiSiniflari)
        .values({ ad: girdi.ad, sira: girdi.sira })
        .returning({ kimlik: vergiSiniflari.kimlik });
      if (yazilan === undefined) throw new Error("Vergi sınıfı yazılamadı.");
      await degisikligiKaydet(islem, {
        kim,
        islem: "vergi-sinifi.eklendi",
        kayit: { tur: "vergi-sinifi", kimlik: yazilan.kimlik },
        eski: null,
        yeni: sinifKaydi(girdi),
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
      const [yazilan] = await islem
        .insert(vergiOranlari)
        .values(oranSatiri(sinifKimligi, girdi, girdi.sira))
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

  // Oranın bütün alanları yeni değerle yazılır; sınıfı değişmez. Aynı kalan değişiklik kayda girmez.
  const oranDegistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kimlik: string,
    ham: OranGirdisi,
  ) => {
    const girdi = girdiyiDogrula(oranGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      const eski = await degisebilenOran(islem, kimlik);
      const yeni = oranSatiri(eski.sinif_kimligi, girdi, girdi.sira);
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

  return { tabloyuOku, sinifEkle, sinifDegistir, sinifSil, oranEkle, oranDegistir, oranSil };
};

// Verilen sitenin servisi: arka plan işi ve testler siteyi kendisi verir.
export const siteninVergiServisi = (site: Site) => vergiServisi(() => site.vergiBaslangici);

// Çalışan sitenin servisi. Başlangıç verisi site klasöründen gelir, yalnız tablo kurulmamışsa okunur.
const calisanSiteninServisi = vergiServisi(() => calisanSite().vergiBaslangici);

export const vergiTablosunuOku = (
  vt: Veritabani = siteninVeritabani(),
  secenekler?: { silinmisSiniflar?: boolean },
) => calisanSiteninServisi.tabloyuOku(vt, secenekler);

export const calisanSiteninVergiServisi = () => calisanSiteninServisi;
