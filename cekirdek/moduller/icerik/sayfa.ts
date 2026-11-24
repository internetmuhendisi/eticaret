// Sabit sayfaları yazan ve okuyan servis (kart 0273): hakkımızda, iletişim gibi mağaza sahibinin yazdığı sayfalar.
//
// - Yarış: bütün yazmalar içeriğin işlem kilidini alır (blogla aynı kilit); adres adı tekilliği kilit altında aranır,
//   kısmi tekil indeks ikinci ağdır.
// - Durum: yayında ya da taslak (kayıt: cekirdek/kayitlar/sayfa.ts). Vitrinde görünme koşulu tektir
//   (sabitSayfaVitrinde): sayfa, adres çözümü ve menü onu kullanır.
// - Değişiklik: ekran sayfanın gördüğü son değişme anını verir; arada değişmişse (başka sekme, başka yönetici) çakışma
//   (sayfa-degisti) ve hiçbir şey yazılmaz.
// - Silme: sayfa silinmiş olarak işaretlenir; eski adresi tetikleyiciyle saklanır, vitrinde bulunamaz. Menüdeki öğesi
//   yerinde kalır, vitrinde görünmez, panelde işaretlenir (menü servisi).
// - Her yazım değişiklik kaydına aynı işlemde girer (karar 0045). İçerik ve açıklama kayda girmez (uzun metin).
import { and, asc, count, eq, inArray, isNull, ne, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { type SabitSayfaDurumu, sabitSayfaSinirlari } from "../../kayitlar/sayfa.ts";
import { bosAdresAdi } from "../../metinler/adres-adi.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { sabitSayfalar } from "./model.ts";
import { sabitSayfaDegisikligi, sabitSayfaGirdisi, sabitSayfaHatalari } from "./sayfa-semalari.ts";
import { icerikKilidiAl } from "./servis.ts";

// Sabit sayfanın vitrinde görünme koşulu: silinmemiş ve yayında.
export const sabitSayfaVitrinde = (): SQL => {
  const kosul = and(isNull(sabitSayfalar.silinme_zamani), eq(sabitSayfalar.durum, "yayinda"));
  if (kosul === undefined) throw new Error("Sayfa koşulu kurulamadı.");
  return kosul;
};

export type SabitSayfa = {
  kimlik: string;
  baslik: string;
  adresAdi: string;
  icerik: string;
  aciklama: string | null;
  durum: SabitSayfaDurumu;
  guncellenmeZamani: Date;
};

const alanlar = {
  kimlik: sabitSayfalar.kimlik,
  baslik: sabitSayfalar.baslik,
  adresAdi: sabitSayfalar.adres_adi,
  icerik: sabitSayfalar.icerik,
  aciklama: sabitSayfalar.aciklama,
  durum: sabitSayfalar.durum,
  guncellenmeZamani: sabitSayfalar.guncellenme_zamani,
};
const sayfayiKur = <T extends { durum: string }>({ durum, ...satir }: T) => ({
  ...satir,
  durum: durum as SabitSayfaDurumu,
});

// Silinmemiş sayfa (panel); yoksa ya da kimlik bozuksa null.
export const sabitSayfaOku = async (
  vt: Veritabani | VeritabaniIslemi,
  kimlik: string,
): Promise<SabitSayfa | null> => {
  if (!kimlikMi(kimlik)) return null;
  const [satir] = await vt
    .select(alanlar)
    .from(sabitSayfalar)
    .where(
      and(eq(sabitSayfalar.kimlik, kimligiDuzelt(kimlik)), isNull(sabitSayfalar.silinme_zamani)),
    );
  return satir === undefined ? null : sayfayiKur(satir);
};

export type SabitSayfaOzeti = Omit<SabitSayfa, "icerik" | "aciklama">;

// Silinmemiş sayfalar, başlığa göre (panelin listesi). Liste kısadır (sayfa sınırı), sayfalanmaz.
export const sabitSayfalariOku = async (
  vt: Veritabani | VeritabaniIslemi,
): Promise<SabitSayfaOzeti[]> =>
  (
    await vt
      .select({
        kimlik: alanlar.kimlik,
        baslik: alanlar.baslik,
        adresAdi: alanlar.adresAdi,
        durum: alanlar.durum,
        guncellenmeZamani: alanlar.guncellenmeZamani,
      })
      .from(sabitSayfalar)
      .where(isNull(sabitSayfalar.silinme_zamani))
      .orderBy(sql`lower(${sabitSayfalar.baslik})`, asc(sabitSayfalar.kimlik))
  ).map(sayfayiKur);

// Vitrinde görünen sayfa (içerik temizlenmemiş; sayfa aciklamayiTemizle ile yazar). Görünmüyorsa null.
export const vitrinSabitSayfasi = async (
  vt: Veritabani | VeritabaniIslemi,
  kimlik: string,
): Promise<Pick<SabitSayfa, "kimlik" | "baslik" | "adresAdi" | "icerik"> | null> => {
  const [satir] = await vt
    .select({
      kimlik: alanlar.kimlik,
      baslik: alanlar.baslik,
      adresAdi: alanlar.adresAdi,
      icerik: alanlar.icerik,
    })
    .from(sabitSayfalar)
    .where(and(eq(sabitSayfalar.kimlik, kimlik), sabitSayfaVitrinde()));
  return satir ?? null;
};

type Sorun = { alan: string; kod: string };
const bilinenKodlar = new Set<string>(sabitSayfaHatalari);
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
const cakisma = (alan: string, kod: string) => new BilinenHata("cakisma", [{ alan, kod }]);

const yaz = <T>(vt: Veritabani | VeritabaniIslemi, is: (islem: VeritabaniIslemi) => Promise<T>) =>
  vt.transaction(async (islem) => {
    await icerikKilidiAl(islem);
    return is(islem);
  });

// Değişiklik kaydına giden alanlar: içerik ve açıklama girmez.
const kayitDegeri = (sayfa: SabitSayfa): Record<string, unknown> => ({
  baslik: sayfa.baslik,
  adresAdi: sayfa.adresAdi,
  durum: sayfa.durum,
});

const adresKullaniliyor = async (islem: VeritabaniIslemi, adresAdi: string, haric?: string) =>
  (
    await islem
      .select({ kimlik: sabitSayfalar.kimlik })
      .from(sabitSayfalar)
      .where(
        and(
          eq(sabitSayfalar.adres_adi, adresAdi),
          isNull(sabitSayfalar.silinme_zamani),
          haric === undefined ? undefined : ne(sabitSayfalar.kimlik, haric),
        ),
      )
      .limit(1)
  ).length > 0;

const bosAdres = (islem: VeritabaniIslemi, baslik: string, kimlik: string) =>
  bosAdresAdi(baslik, kimlik, async (adaylar) => {
    const satirlar = await islem
      .select({ adresAdi: sabitSayfalar.adres_adi })
      .from(sabitSayfalar)
      .where(and(inArray(sabitSayfalar.adres_adi, adaylar), isNull(sabitSayfalar.silinme_zamani)));
    return new Set(satirlar.map((s) => s.adresAdi));
  });

const sayfaEkle = async (
  vt: Veritabani | VeritabaniIslemi,
  kim: DegisikligiYapan,
  ham: unknown,
): Promise<{ kimlik: string }> => {
  const girdi = girdiyiDogrula(sabitSayfaGirdisi.safeParse(ham));
  return yaz(vt, async (islem) => {
    const [sayim] = await islem
      .select({ sayi: count() })
      .from(sabitSayfalar)
      .where(isNull(sabitSayfalar.silinme_zamani));
    if ((sayim?.sayi ?? 0) >= sabitSayfaSinirlari.sayfaSayisi) {
      throw new BilinenHata("is-kurali", [{ alan: "sayfa", kod: "sayfa-siniri" }]);
    }
    const kimlik = crypto.randomUUID();
    if (girdi.adresAdi !== undefined && (await adresKullaniliyor(islem, girdi.adresAdi))) {
      throw cakisma("adresAdi", "adres-adi-tekrar");
    }
    const adresAdi = girdi.adresAdi ?? (await bosAdres(islem, girdi.baslik, kimlik));
    await islem.insert(sabitSayfalar).values({
      kimlik,
      baslik: girdi.baslik,
      adres_adi: adresAdi,
      icerik: girdi.icerik ?? "",
      aciklama: girdi.aciklama ?? null,
      durum: girdi.durum,
    });
    const sayfa = await sabitSayfaOku(islem, kimlik);
    if (sayfa === null) throw new Error("Sayfa yazılamadı.");
    await degisikligiKaydet(islem, {
      kim,
      islem: "sabit-sayfa.eklendi",
      kayit: { tur: "sabit-sayfa", kimlik },
      eski: null,
      yeni: kayitDegeri(sayfa),
    });
    return { kimlik };
  });
};

// gorulen: ekranın gördüğü son değişme anı. Verilmezse (testler, iç çağrılar) denetlenmez.
const sayfaDegistir = async (
  vt: Veritabani | VeritabaniIslemi,
  kim: DegisikligiYapan,
  kimlikHam: string,
  ham: unknown,
  gorulen?: Date,
): Promise<SabitSayfa> => {
  const girdi = girdiyiDogrula(sabitSayfaDegisikligi.safeParse(ham));
  return yaz(vt, async (islem) => {
    const kimlik = kimligiDuzelt(kimlikHam);
    const onceki = await sabitSayfaOku(islem, kimlik);
    if (onceki === null) throw new BilinenHata("bulunamadi");
    if (gorulen !== undefined && onceki.guncellenmeZamani.getTime() !== gorulen.getTime()) {
      throw cakisma("sayfa", "sayfa-degisti");
    }
    const yeni = {
      baslik: girdi.baslik ?? onceki.baslik,
      adres_adi: girdi.adresAdi ?? onceki.adresAdi,
      icerik: girdi.icerik ?? onceki.icerik,
      aciklama: girdi.aciklama === undefined ? onceki.aciklama : girdi.aciklama,
      durum: girdi.durum ?? onceki.durum,
    };
    if (
      yeni.adres_adi !== onceki.adresAdi &&
      (await adresKullaniliyor(islem, yeni.adres_adi, kimlik))
    ) {
      throw cakisma("adresAdi", "adres-adi-tekrar");
    }
    const degisti =
      yeni.baslik !== onceki.baslik ||
      yeni.adres_adi !== onceki.adresAdi ||
      yeni.icerik !== onceki.icerik ||
      yeni.aciklama !== onceki.aciklama ||
      yeni.durum !== onceki.durum;
    if (!degisti) return onceki;
    await islem
      .update(sabitSayfalar)
      .set({ ...yeni, guncellenme_zamani: sql`clock_timestamp()` })
      .where(eq(sabitSayfalar.kimlik, kimlik));
    const sonra = await sabitSayfaOku(islem, kimlik);
    if (sonra === null) throw new Error("Sayfa okunamadı.");
    const eskiDeger = kayitDegeri(onceki);
    const yeniDeger = kayitDegeri(sonra);
    // Kayda girmeyen alan (içerik, açıklama) değişince de satır yazılır: kim ve ne zaman değiştirdiği bilinir.
    await degisikligiKaydet(islem, {
      kim,
      islem: "sabit-sayfa.degisti",
      kayit: { tur: "sabit-sayfa", kimlik },
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

const sayfaSil = (
  vt: Veritabani | VeritabaniIslemi,
  kim: DegisikligiYapan,
  kimlikHam: string,
): Promise<void> =>
  yaz(vt, async (islem) => {
    const kimlik = kimligiDuzelt(kimlikHam);
    const sayfa = await sabitSayfaOku(islem, kimlik);
    if (sayfa === null) throw new BilinenHata("bulunamadi");
    await islem
      .update(sabitSayfalar)
      .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`clock_timestamp()` })
      .where(eq(sabitSayfalar.kimlik, kimlik));
    await degisikligiKaydet(islem, {
      kim,
      islem: "sabit-sayfa.silindi",
      kayit: { tur: "sabit-sayfa", kimlik },
      eski: kayitDegeri(sayfa),
      yeni: null,
    });
  });

export const sabitSayfaServisi = { sayfaEkle, sayfaDegistir, sayfaSil };
