// Ürün galerisi (kart 0087, karar 0073): sıralı görseller ve video bağlantıları. Ürün servisi (servis.ts)
// bu işlemleri kendi işlem kilidiyle (yaz) dışarı verir; galeri başka bir yoldan değişmez.
//
// - Görsel: dosya deposunda boyutlarıyla kaydedilmiş görsel (gorselKaydet, cekirdek/moduller/dosya/).
//   Galeriye yalnız silinmemiş, kendisi bir boyut olmayan ve kayıttaki bütün boyutları bulunan görsel
//   bağlanır. Dosya bu işlemin dışında kaydedilir: dosya kaydetme bir veritabanı işleminin içinde
//   çağrılmaz (karar 0058).
// - Video: bağlantıdan çıkarılan site ve kimlik (video.ts). Site bu sitede kabul edilmeli (videoSiteleri
//   ayarı). Video dosyası yüklenmez (kullanıcı kararı).
// - Her öğenin alternatif metni vardır. Sıra küçük olan önce; ana görsel silinmemiş ilk görsel öğesidir,
//   video ana görsel olmaz.
// - Birleşim kendi görselini bu galeriden seçer (varyant.ts); seçilmemişse ana görsel gösterilir
//   (birimGorseli).
// - Silme işaretle yapılır; dosya silinmez, geçmiş siparişler ürünün o andaki görseline bağlı kalır.
//   Silinen öğeyi seçmiş birleşimin görseli aynı işlemde boşaltılır.
// - Her yazım değişiklik kaydına aynı işlemde girer.
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { type GorselBoyutu, galeriSinirlari } from "../../kayitlar/gorsel.ts";
import type { VideoSitesi } from "../../kayitlar/video-siteleri.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { dosyalar } from "../dosya/model.ts";
import { type GorselBoyutDosyasi, gorselBoyutlariniOku, gorselHazirMi } from "../dosya/servis.ts";
import { cakisma, dogrulamaHatasi, girdiyiDogrula, isKurali, kayitDegeri } from "./dogrulama.ts";
import { urunBirimleri, urunGalerisi, urunler } from "./model.ts";
import {
  type GaleriGorselGirdisi,
  type GaleriOgesiDegisikligi,
  type GaleriSiralamasi,
  type GaleriVideoGirdisi,
  galeriGorselGirdisi,
  galeriOgesiDegisikligi,
  galeriSiralamasi,
  galeriVideoGirdisi,
} from "./semalar.ts";
import { oynaticiAdresi, videoAdresiniCoz, videoSitesiIzinliMi } from "./video.ts";

export type GaleriGorseli = {
  kimlik: string;
  tur: "gorsel";
  // Özgün görselin dosya kimliği.
  dosya: string;
  alternatifMetin: string;
  sira: number;
  // Kayıttaki boyutların dosyaları (cekirdek/kayitlar/gorsel.ts). Kayda sonradan eklenen bir boyut
  // eski görselde eksik olabilir.
  boyutlar: Partial<Record<GorselBoyutu, GorselBoyutDosyasi>>;
};
export type GaleriVideosu = {
  kimlik: string;
  tur: "video";
  site: VideoSitesi;
  videoKimligi: string;
  // Sayfaya gömülen oynatıcının adresi, kimlikten kurulur.
  oynatici: string;
  alternatifMetin: string;
  sira: number;
};
export type GaleriOgesi = GaleriGorseli | GaleriVideosu;

const ogeAlanlari = {
  kimlik: urunGalerisi.kimlik,
  urun: urunGalerisi.urun_kimligi,
  tur: urunGalerisi.tur,
  dosya: urunGalerisi.dosya_kimligi,
  site: urunGalerisi.video_sitesi,
  videoKimligi: urunGalerisi.video_kimligi,
  alternatifMetin: urunGalerisi.alternatif_metin,
  sira: urunGalerisi.sira,
};
// Galerinin canlı öğesi: öğe silinmemiş ve görselse dosyası da silinmemiş (kart 0087 kontrolü).
// Dosyası silinmiş görsel galeride görünmez, sıralamaya ve sınıra sayılmaz, seçilemez; satırı kalır.
export const canliOge = () =>
  and(
    isNull(urunGalerisi.silinme_zamani),
    sql`(${urunGalerisi.dosya_kimligi} is null or exists (select 1 from ${dosyalar} where ${dosyalar.kimlik} = ${urunGalerisi.dosya_kimligi} and ${dosyalar.silinme_zamani} is null))`,
  );

const galeriSirasi = [
  asc(urunGalerisi.sira),
  asc(urunGalerisi.olusturma_zamani),
  asc(urunGalerisi.kimlik),
];

// Ürünlerin silinmemiş galerileri, sırasıyla; iki sorgu (öğeler ve görsellerin boyutları). Galerisi boş
// ürün haritada yoktur. sadeceGorsel ana görsel aramasında videoları hiç okumaz.
export const urunGalerileri = async (
  vt: Veritabani | VeritabaniIslemi,
  urunKimlikleri: string[],
  secenek: { sadeceGorsel?: boolean } = {},
): Promise<Map<string, GaleriOgesi[]>> => {
  const sonuc = new Map<string, GaleriOgesi[]>();
  const gecerli = [...new Set(urunKimlikleri.filter(kimlikMi).map(kimligiDuzelt))];
  if (gecerli.length === 0) return sonuc;
  const satirlar = await vt
    .select(ogeAlanlari)
    .from(urunGalerisi)
    .where(
      and(
        inArray(urunGalerisi.urun_kimligi, gecerli),
        canliOge(),
        secenek.sadeceGorsel ? eq(urunGalerisi.tur, "gorsel") : undefined,
      ),
    )
    .orderBy(...galeriSirasi);
  const boyutlar = await gorselBoyutlariniOku(
    vt,
    satirlar.flatMap((satir) => (satir.dosya === null ? [] : [satir.dosya])),
  );
  for (const satir of satirlar) {
    const ortak = {
      kimlik: satir.kimlik,
      alternatifMetin: satir.alternatifMetin,
      sira: satir.sira,
    };
    let oge: GaleriOgesi;
    if (satir.dosya !== null) {
      oge = {
        ...ortak,
        tur: "gorsel",
        dosya: satir.dosya,
        boyutlar: boyutlar.get(satir.dosya) ?? {},
      };
    } else if (satir.site !== null && satir.videoKimligi !== null) {
      const video = { site: satir.site as VideoSitesi, kimlik: satir.videoKimligi };
      oge = {
        ...ortak,
        tur: "video",
        site: video.site,
        videoKimligi: video.kimlik,
        oynatici: oynaticiAdresi(video),
      };
    } else {
      // Veritabanındaki denetim (urun_galerisi_video) bunu engeller; buraya düşen bir yazılım hatasıdır.
      throw new Error(`Galeri öğesinin türü okunamadı: ${satir.kimlik}.`);
    }
    sonuc.set(satir.urun, [...(sonuc.get(satir.urun) ?? []), oge]);
  }
  return sonuc;
};

// Ürünlerin ana görselleri: silinmemiş ilk görsel öğesi. Liste, kategori ve sepet bununla tek seferde
// alır (iki sorgu, ürün sayısıyla artmaz). Görseli olmayan ürün haritada yoktur.
export const anaGorseller = async (
  vt: Veritabani | VeritabaniIslemi,
  urunKimlikleri: string[],
): Promise<Map<string, GaleriGorseli>> => {
  const sonuc = new Map<string, GaleriGorseli>();
  for (const [urun, galeri] of await urunGalerileri(vt, urunKimlikleri, { sadeceGorsel: true })) {
    const ana = galeri.find((oge): oge is GaleriGorseli => oge.tur === "gorsel");
    if (ana !== undefined) sonuc.set(urun, ana);
  }
  return sonuc;
};

// Bir birimin gösterilecek görseli: birleşimin seçtiği görsel; seçilmemişse ya da artık galeride
// değilse ana görsel; o da yoksa undefined. Ürünün okunan hâlinden (urunuOku) hesaplanır.
export const birimGorseli = (
  urun: { galeri: GaleriOgesi[]; birimler: { kimlik: string; gorsel?: string }[] },
  birim: string,
): GaleriGorseli | undefined => {
  const gorseller = urun.galeri.filter((oge): oge is GaleriGorseli => oge.tur === "gorsel");
  const secilen = urun.birimler.find((b) => b.kimlik === birim)?.gorsel;
  return gorseller.find((oge) => oge.kimlik === secilen) ?? gorseller[0];
};

// Kilit altında: öğe bu ürünün galerisinde silinmemiş bir görsel mi? Birleşimin görsel seçimi
// (varyant.ts) bunu kullanır.
export const galeriGorseliMi = async (islem: VeritabaniIslemi, urun: string, oge: string) =>
  kimlikMi(oge) &&
  (
    await islem
      .select({ kimlik: urunGalerisi.kimlik })
      .from(urunGalerisi)
      .where(
        and(
          eq(urunGalerisi.kimlik, oge),
          eq(urunGalerisi.urun_kimligi, urun),
          eq(urunGalerisi.tur, "gorsel"),
          canliOge(),
        ),
      )
  ).length > 0;

type Yaz = <T>(
  vt: Veritabani | VeritabaniIslemi,
  is: (islem: VeritabaniIslemi) => Promise<T>,
) => Promise<T>;

// Öğenin değişiklik kaydına giden alanları.
type OgeKaydi = {
  urun: string;
  tur: string;
  dosya: string | null;
  site: string | null;
  videoKimligi: string | null;
  alternatifMetin: string;
  sira: number;
};

const kaydet = (
  islem: VeritabaniIslemi,
  kim: DegisikligiYapan,
  olay: "eklendi" | "degisti" | "silindi",
  kimlik: string,
  eski: Record<string, unknown> | null,
  yeni: Record<string, unknown> | null,
) =>
  degisikligiKaydet(islem, {
    kim,
    islem: `urun-galerisi.${olay}`,
    kayit: { tur: "urun-galeri-ogesi", kimlik },
    eski,
    yeni,
  });

export const galeriIslemleri = (yaz: Yaz, videoSiteleri: () => readonly VideoSitesi[]) => {
  // Silinmemiş ürün; yoksa bulunamadı.
  const urunuDenetle = async (islem: VeritabaniIslemi, urun: string) => {
    if (!kimlikMi(urun)) throw new BilinenHata("bulunamadi");
    const [satir] = await islem
      .select({ kimlik: urunler.kimlik })
      .from(urunler)
      .where(and(eq(urunler.kimlik, urun), isNull(urunler.silinme_zamani)));
    if (satir === undefined) throw new BilinenHata("bulunamadi");
  };

  // Silinmemiş öğe ve ürünü; yoksa bulunamadı.
  const ogeyiBul = async (islem: VeritabaniIslemi, oge: string) => {
    if (!kimlikMi(oge)) throw new BilinenHata("bulunamadi");
    const [satir] = await islem
      .select(ogeAlanlari)
      .from(urunGalerisi)
      .innerJoin(urunler, eq(urunler.kimlik, urunGalerisi.urun_kimligi))
      .where(
        and(
          eq(urunGalerisi.kimlik, oge),
          isNull(urunGalerisi.silinme_zamani),
          isNull(urunler.silinme_zamani),
        ),
      );
    if (satir === undefined) throw new BilinenHata("bulunamadi");
    const { kimlik, ...kayit } = satir;
    return { kimlik, kayit: kayit satisfies OgeKaydi };
  };

  // Galerinin sınırı ve yeni öğenin sırası (verilmezse sona).
  const yerAc = async (islem: VeritabaniIslemi, urun: string, sira: number | undefined) => {
    const [satir] = await islem
      .select({
        sayi: count(),
        sonraki: sql<number>`coalesce(max(${urunGalerisi.sira}) + 1, 0)`.mapWith(Number),
      })
      .from(urunGalerisi)
      .where(and(eq(urunGalerisi.urun_kimligi, urun), canliOge()));
    if ((satir?.sayi ?? 0) >= galeriSinirlari.oge) throw isKurali("galeri", "galeri-siniri");
    return sira ?? satir?.sonraki ?? 0;
  };

  const ekle = async (
    islem: VeritabaniIslemi,
    kim: DegisikligiYapan,
    kayit: OgeKaydi,
  ): Promise<string> => {
    const kimlik = randomUUID();
    await islem.insert(urunGalerisi).values({
      kimlik,
      urun_kimligi: kayit.urun,
      tur: kayit.tur,
      dosya_kimligi: kayit.dosya,
      video_sitesi: kayit.site,
      video_kimligi: kayit.videoKimligi,
      alternatif_metin: kayit.alternatifMetin,
      sira: kayit.sira,
      // Eşit sırada önce eklenen önce gelir; aynı işlemde eklenenler de (now() işlemin başıdır).
      olusturma_zamani: sql`clock_timestamp()`,
    });
    await kaydet(islem, kim, "eklendi", kimlik, null, kayitDegeri(kayit));
    return kimlik;
  };

  // Galeriye görsel: dosya deposunda boyutlarıyla kaydedilmiş görselin kimliğiyle.
  const galeriyeGorselEkle = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    urun: string,
    ham: GaleriGorselGirdisi,
  ): Promise<string> => {
    const girdi = girdiyiDogrula(galeriGorselGirdisi.safeParse(ham));
    return yaz(vt, async (islem) => {
      await urunuDenetle(islem, urun);
      const durum = await gorselHazirMi(islem, girdi.dosya);
      if (durum === "yok") {
        throw dogrulamaHatasi([{ alan: "dosya", kod: "galeri-gorsel-gecersiz" }]);
      }
      if (durum === "boyut-eksik") {
        throw dogrulamaHatasi([{ alan: "dosya", kod: "galeri-boyut-eksik" }]);
      }
      const tekrar = await islem
        .select({ kimlik: urunGalerisi.kimlik })
        .from(urunGalerisi)
        .where(
          and(
            eq(urunGalerisi.urun_kimligi, urun),
            eq(urunGalerisi.dosya_kimligi, girdi.dosya),
            isNull(urunGalerisi.silinme_zamani),
          ),
        );
      if (tekrar.length > 0) throw cakisma("dosya", "galeri-gorsel-tekrar");
      const sira = await yerAc(islem, urun, girdi.sira);
      return ekle(islem, kim, {
        urun,
        tur: "gorsel",
        dosya: girdi.dosya,
        site: null,
        videoKimligi: null,
        alternatifMetin: girdi.alternatifMetin,
        sira,
      });
    });
  };

  // Galeriye video: bağlantıdan yalnız site ve videonun kimliği saklanır.
  const galeriyeVideoEkle = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    urun: string,
    ham: GaleriVideoGirdisi,
  ): Promise<string> => {
    const girdi = girdiyiDogrula(galeriVideoGirdisi.safeParse(ham));
    const video = videoAdresiniCoz(girdi.adres);
    // Şema çözülemeyen bağlantıyı zaten reddeder; şemayı atlayan bir yol için yine denetlenir.
    if (video === undefined) {
      throw dogrulamaHatasi([{ alan: "adres", kod: "video-adresi-gecersiz" }]);
    }
    if (!videoSitesiIzinliMi(video.site, videoSiteleri())) {
      throw dogrulamaHatasi([{ alan: "adres", kod: "video-sitesi-izinsiz" }]);
    }
    return yaz(vt, async (islem) => {
      await urunuDenetle(islem, urun);
      const sira = await yerAc(islem, urun, girdi.sira);
      return ekle(islem, kim, {
        urun,
        tur: "video",
        dosya: null,
        site: video.site,
        videoKimligi: video.kimlik,
        alternatifMetin: girdi.alternatifMetin,
        sira,
      });
    });
  };

  // Öğenin alternatif metni. Aynı kalan değişiklik kayda girmez.
  const galeriOgesiDegistir = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    oge: string,
    ham: GaleriOgesiDegisikligi,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(galeriOgesiDegisikligi.safeParse(ham));
    await yaz(vt, async (islem) => {
      const { kayit } = await ogeyiBul(islem, oge);
      if (girdi.alternatifMetin === undefined || girdi.alternatifMetin === kayit.alternatifMetin) {
        return;
      }
      await islem
        .update(urunGalerisi)
        .set({ alternatif_metin: girdi.alternatifMetin, guncellenme_zamani: sql`now()` })
        .where(eq(urunGalerisi.kimlik, oge));
      await kaydet(
        islem,
        kim,
        "degisti",
        oge,
        { alternatifMetin: kayit.alternatifMetin },
        { alternatifMetin: girdi.alternatifMetin },
      );
    });
  };

  // Galerinin yeni sırası: silinmemiş bütün öğeler, her biri bir kez. Liste galeriyle aynı değilse
  // (arada öğe eklenmiş ya da silinmiş) hiçbir şey değişmez. Aynı kalan sıra kayda girmez.
  const galeriyiSirala = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    urun: string,
    ham: GaleriSiralamasi,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(galeriSiralamasi.safeParse(ham));
    await yaz(vt, async (islem) => {
      await urunuDenetle(islem, urun);
      const eski = (
        await islem
          .select({ kimlik: urunGalerisi.kimlik, sira: urunGalerisi.sira })
          .from(urunGalerisi)
          .where(and(eq(urunGalerisi.urun_kimligi, urun), canliOge()))
          .orderBy(...galeriSirasi)
      ).map((satir) => satir.kimlik);
      const yeni = girdi.ogeler;
      if (yeni.length !== eski.length || yeni.some((kimlik) => !eski.includes(kimlik))) {
        throw cakisma("ogeler", "galeri-sira-gecersiz");
      }
      // Sıra aynı kalsa da numaralar düzene sokulur (eşit sıra numaraları); kayda yalnız değişen sıra
      // girer.
      await siraYaz(islem, yeni);
      if (yeni.every((kimlik, i) => eski[i] === kimlik)) return;
      await degisikligiKaydet(islem, {
        kim,
        islem: "urun-galerisi.siralandi",
        kayit: { tur: "urun", kimlik: urun },
        eski: { galeri: eski },
        yeni: { galeri: yeni },
      });
    });
  };

  const siraYaz = async (islem: VeritabaniIslemi, ogeler: string[]) => {
    for (const [sira, kimlik] of ogeler.entries()) {
      await islem
        .update(urunGalerisi)
        .set({ sira, guncellenme_zamani: sql`now()` })
        .where(and(eq(urunGalerisi.kimlik, kimlik), sql`${urunGalerisi.sira} <> ${sira}`));
    }
  };

  // Öğe silinmiş işaretlenir, dosya kalır. Öğeyi seçmiş birleşimlerin görseli önce boşaltılır, her biri
  // kendi satırıyla kayda girer.
  const galeriOgesiSil = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    oge: string,
  ): Promise<void> => {
    await yaz(vt, async (islem) => {
      const { kayit } = await ogeyiBul(islem, oge);
      const secenler = await islem
        .update(urunBirimleri)
        .set({ gorsel_kimligi: null, guncellenme_zamani: sql`now()` })
        .where(and(eq(urunBirimleri.gorsel_kimligi, oge), isNull(urunBirimleri.silinme_zamani)))
        .returning({ kimlik: urunBirimleri.kimlik });
      for (const { kimlik } of secenler.toSorted((a, b) => (a.kimlik < b.kimlik ? -1 : 1))) {
        await degisikligiKaydet(islem, {
          kim,
          islem: "urun-birimi.degisti",
          kayit: { tur: "urun-birimi", kimlik },
          eski: { gorsel: oge },
          yeni: {},
        });
      }
      await islem
        .update(urunGalerisi)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(eq(urunGalerisi.kimlik, oge));
      await kaydet(islem, kim, "silindi", oge, kayitDegeri(kayit), null);
    });
  };

  return {
    galeriyeGorselEkle,
    galeriyeVideoEkle,
    galeriOgesiDegistir,
    galeriyiSirala,
    galeriOgesiSil,
  };
};
