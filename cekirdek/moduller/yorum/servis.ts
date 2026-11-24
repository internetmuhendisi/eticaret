// Ürün yorumları (kart 0139, karar 0109). Yorum yalnız bu servisle okunur ve değişir.
//
// Kurallar:
// - Yalnız girişli müşteri yazar; ürünün sayfası açılmalıdır (vitrinKosulu, sayfa yeri). Bir müşteri bir ürüne
//   bir yorum yazar (kullanıcı kararı): ikincisi çakışmadır, aynı anda gelen iki yazmada da (tekil indeks).
// - "Yalnız satın alanlar yorum yapabilir" açıksa satın alma denetimi (satin-alma.ts) geçmeyen müşteri yazamaz.
// - Yeni yorum onay bekler. Yalnız yayındaki yorum görünür ve ortalamaya girer: ürün sayfası, ürün kartının puanı
//   ve ana sayfanın yorum bölümü aynı koşulu (yayinda) kullanır.
// - Görünen ad kayda kısaltılmış girer ("Ayşe Y.", biçimleyicinin kisaAd'ı).
// - Değişiklik kaydına puan, durum ve işaret girer; metin, başlık ve ad girmez (serbest metin kişisel bilgi
//   taşıyabilir).
// - Ana sayfanın yorumları yalnız listede görünen ürünlerin yorumlarıdır.
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { type YorumDurumu, yorumSinirlari } from "../../kayitlar/yorum.ts";
import { kisaAd } from "../../metinler/bicimleyici.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { urunler } from "../urun/model.ts";
import { vitrinKosulu } from "../urun/vitrin.ts";
import { yoneticiBildirimiYaz } from "../yonetici-bildirimi/servis.ts";
import { kisaAdVerisi } from "../yonetici-bildirimi/veri.ts";
import { yorumlar } from "./model.ts";
import { satinAldiMi } from "./satin-alma.ts";
import type { YorumFormu, YorumHatasi } from "./semalar.ts";

const hata = (kod: "is-kurali" | "cakisma" | "bulunamadi", alan: string, neden: YorumHatasi) =>
  new BilinenHata(kod, [{ alan, kod: neden }]);

export type YorumIzni = "yazabilir" | Extract<YorumHatasi, "satin-alma-gerekli" | "yorum-yazildi">;

// Ürünün sayfası açılıyor mu (taslak, arşiv, silinmiş ve zamanı gelmemiş ürüne yorum yazılmaz).
const urunAcikMi = async (vt: Veritabani | VeritabaniIslemi, urun: string, an: Date) => {
  if (!kimlikMi(urun)) return false;
  const [satir] = await vt
    .select({ kimlik: urunler.kimlik })
    .from(urunler)
    .where(and(eq(urunler.kimlik, urun), vitrinKosulu("sayfa", { an, tukenenUrun: "goster" })));
  return satir !== undefined;
};

const yorumuVar = async (vt: Veritabani | VeritabaniIslemi, musteri: string, urun: string) =>
  (
    await vt
      .select({ kimlik: yorumlar.kimlik })
      .from(yorumlar)
      .where(and(eq(yorumlar.urun_kimligi, urun), eq(yorumlar.musteri_kimligi, musteri)))
      .limit(1)
  ).length > 0;

// Tekil indeks ihlali: aynı müşterinin aynı ürüne aynı anda gelen ikinci yorumu.
const tekillikIhlaliMi = (yakalanan: unknown): boolean => {
  const kaynak = (yakalanan as { cause?: unknown })?.cause ?? yakalanan;
  return (kaynak as { code?: string; constraint?: string })?.code === "23505";
};

export const yorumServisi = (site: Site) => {
  const kisalt = (ad: string) => kisaAd(ad, site.ayarlar.dil);

  // Müşteri bu ürüne yorum yazabilir mi. Ürünün sayfası açılmıyorsa bulunamadı.
  const yorumIzni = async (
    vt: Veritabani,
    musteri: string,
    urun: string,
    an = new Date(),
  ): Promise<YorumIzni> => {
    if (!(await urunAcikMi(vt, urun, an))) throw hata("bulunamadi", "urun", "urun-yok");
    if (await yorumuVar(vt, musteri, urun)) return "yorum-yazildi";
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    if (ayarlar.yorumYalnizSatinAlanlar && !(await satinAldiMi(vt, musteri, urun))) {
      return "satin-alma-gerekli";
    }
    return "yazabilir";
  };

  // Müşterinin yorumu: onay bekler. Kimliğini döner.
  const yorumYaz = async (
    vt: Veritabani,
    musteri: string,
    girdi: YorumFormu,
    an = new Date(),
  ): Promise<string> => {
    const izin = await yorumIzni(vt, musteri, girdi.urun, an);
    if (izin === "yorum-yazildi") throw hata("cakisma", "urun", "yorum-yazildi");
    if (izin === "satin-alma-gerekli") throw hata("is-kurali", "urun", "satin-alma-gerekli");
    const dogrulanmis = await satinAldiMi(vt, musteri, girdi.urun);
    try {
      return await vt.transaction(async (islem) => {
        const [satir] = await islem
          .insert(yorumlar)
          .values({
            urun_kimligi: girdi.urun,
            musteri_kimligi: musteri,
            puan: girdi.puan,
            baslik: girdi.baslik ?? null,
            metin: girdi.metin,
            ad: kisalt(girdi.ad),
            durum: "onay-bekliyor",
            dogrulanmis_alici: dogrulanmis,
            olusturma_zamani: sql`clock_timestamp()`,
          })
          .returning({ kimlik: yorumlar.kimlik });
        if (satir === undefined) throw new Error("Yorum yazılamadı.");
        await degisikligiKaydet(islem, {
          kim: { tur: "musteri", kimlik: musteri },
          islem: "yorum.yazildi",
          kayit: { tur: "yorum", kimlik: satir.kimlik },
          eski: null,
          yeni: { urun: girdi.urun, puan: girdi.puan, durum: "onay-bekliyor" },
        });
        // Onay bekleyen yorumun yönetici bildirimi (kart 0241): aynı işlemde, yorumun kimliğiyle.
        const [urun] = await islem
          .select({ ad: urunler.ad })
          .from(urunler)
          .where(eq(urunler.kimlik, girdi.urun));
        await yoneticiBildirimiYaz(islem, {
          bildirim: "yorum",
          anahtar: `yorum:${satir.kimlik}`,
          veri: {
            urun: urun?.ad ?? "",
            puan: girdi.puan,
            yazan: kisaAdVerisi(girdi.ad),
            metin: girdi.metin,
          },
        });
        return satir.kimlik;
      });
    } catch (yakalanan) {
      if (tekillikIhlaliMi(yakalanan)) throw hata("cakisma", "urun", "yorum-yazildi");
      throw yakalanan;
    }
  };

  // Başlangıç kataloğunun örnek yorumu (kart 0139): yayında, müşterisiz, doğrulanmış alıcı değil. Katalog
  // kurulumunun işleminde çalışır.
  const baslangicYorumuEkle = async (
    islem: VeritabaniIslemi,
    kim: DegisikligiYapan,
    urun: string,
    girdi: Omit<YorumFormu, "urun"> & { anaSayfada: boolean },
  ): Promise<string> => {
    const [satir] = await islem
      .insert(yorumlar)
      .values({
        urun_kimligi: urun,
        puan: girdi.puan,
        baslik: girdi.baslik ?? null,
        metin: girdi.metin,
        ad: kisalt(girdi.ad),
        durum: "yayinda",
        ana_sayfada: girdi.anaSayfada,
        olusturma_zamani: sql`clock_timestamp()`,
      })
      .returning({ kimlik: yorumlar.kimlik });
    if (satir === undefined) throw new Error("Örnek yorum yazılamadı.");
    await degisikligiKaydet(islem, {
      kim,
      islem: "yorum.yazildi",
      kayit: { tur: "yorum", kimlik: satir.kimlik },
      eski: null,
      yeni: { urun, puan: girdi.puan, durum: "yayinda", anaSayfada: girdi.anaSayfada },
    });
    return satir.kimlik;
  };

  // Mağazanın kararı ve ana sayfa işareti: satır kilitlenir, değişmeyen değer yazılmaz ve kayda girmez.
  const degistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    yorum: string,
    alan: { durum: YorumDurumu } | { anaSayfada: boolean },
  ): Promise<void> => {
    if (!kimlikMi(yorum)) throw hata("bulunamadi", "yorum", "yorum-yok");
    await vt.transaction(async (islem) => {
      const [satir] = await islem
        .select({ durum: yorumlar.durum, anaSayfada: yorumlar.ana_sayfada })
        .from(yorumlar)
        .where(eq(yorumlar.kimlik, yorum))
        .for("update");
      if (satir === undefined) throw hata("bulunamadi", "yorum", "yorum-yok");
      if ("durum" in alan) {
        if (satir.durum === alan.durum) return;
        await islem
          .update(yorumlar)
          .set({ durum: alan.durum, guncellenme_zamani: sql`now()` })
          .where(eq(yorumlar.kimlik, yorum));
        await degisikligiKaydet(islem, {
          kim,
          islem: "yorum.durum-degisti",
          kayit: { tur: "yorum", kimlik: yorum },
          eski: { durum: satir.durum },
          yeni: { durum: alan.durum },
        });
        return;
      }
      if (satir.anaSayfada === alan.anaSayfada) return;
      await islem
        .update(yorumlar)
        .set({ ana_sayfada: alan.anaSayfada, guncellenme_zamani: sql`now()` })
        .where(eq(yorumlar.kimlik, yorum));
      await degisikligiKaydet(islem, {
        kim,
        islem: "yorum.ana-sayfa",
        kayit: { tur: "yorum", kimlik: yorum },
        eski: { anaSayfada: satir.anaSayfada },
        yeni: { anaSayfada: alan.anaSayfada },
      });
    });
  };

  return {
    yorumIzni,
    yorumYaz,
    baslangicYorumuEkle,
    karar: (vt: Veritabani, kim: DegisikligiYapan, yorum: string, durum: YorumDurumu) =>
      degistir(vt, kim, yorum, { durum }),
    anaSayfaIsareti: (vt: Veritabani, kim: DegisikligiYapan, yorum: string, anaSayfada: boolean) =>
      degistir(vt, kim, yorum, { anaSayfada }),
  };
};

// --- Okumalar ---

export type PuanOzeti = {
  ortalama: number;
  sayi: number;
  // 5 yıldızdan 1 yıldıza, her puanın yorum sayısı.
  dagilim: [number, number, number, number, number];
};

// Ürünlerin yayındaki yorumlarından puan özeti: tek sorgu, ürün sayısıyla artmaz. Yorumu olmayan ürün haritada
// yoktur.
export const puanOzetleri = async (
  vt: Veritabani | VeritabaniIslemi,
  urunKimlikleri: readonly string[],
): Promise<Map<string, PuanOzeti>> => {
  const gecerli = [...new Set(urunKimlikleri.filter(kimlikMi).map(kimligiDuzelt))];
  const sonuc = new Map<string, PuanOzeti>();
  if (gecerli.length === 0) return sonuc;
  const satirlar = await vt
    .select({ urun: yorumlar.urun_kimligi, puan: yorumlar.puan, sayi: count() })
    .from(yorumlar)
    .where(and(inArray(yorumlar.urun_kimligi, gecerli), eq(yorumlar.durum, "yayinda")))
    .groupBy(yorumlar.urun_kimligi, yorumlar.puan);
  const toplam = new Map<string, { puan: number; sayi: number; dagilim: number[] }>();
  for (const { urun, puan, sayi } of satirlar) {
    const ozet = toplam.get(urun) ?? { puan: 0, sayi: 0, dagilim: [0, 0, 0, 0, 0] };
    ozet.puan += puan * sayi;
    ozet.sayi += sayi;
    ozet.dagilim[yorumSinirlari.enYuksekPuan - puan] = sayi;
    toplam.set(urun, ozet);
  }
  for (const [urun, ozet] of toplam) {
    sonuc.set(urun, {
      ortalama: ozet.puan / ozet.sayi,
      sayi: ozet.sayi,
      dagilim: ozet.dagilim as PuanOzeti["dagilim"],
    });
  }
  return sonuc;
};

export type VitrinYorumu = {
  kimlik: string;
  puan: number;
  baslik?: string;
  metin: string;
  ad: string;
  dogrulanmisAlici: boolean;
  zaman: Date;
};

const vitrinAlanlari = {
  kimlik: yorumlar.kimlik,
  puan: yorumlar.puan,
  baslik: yorumlar.baslik,
  metin: yorumlar.metin,
  ad: yorumlar.ad,
  dogrulanmisAlici: yorumlar.dogrulanmis_alici,
  zaman: yorumlar.olusturma_zamani,
};
type VitrinSatiri = Omit<VitrinYorumu, "baslik"> & { baslik: string | null };
const vitrinYorumu = ({ baslik, ...satir }: VitrinSatiri): VitrinYorumu => ({
  ...satir,
  ...(baslik === null ? {} : { baslik }),
});

const yorumSirasi = [desc(yorumlar.olusturma_zamani), asc(yorumlar.kimlik)];

// Ürünün yayındaki yorumları, en yeni önce. birikimli: ilk sayfadan bu sayfanın sonuna kadar ("Daha fazla
// göster"). Sayfa toplamın ötesindeyse son sayfaya, en çok sayfayı (enCokSayfa) aşarsa ona çekilir.
export const urunYorumlari = async (
  vt: Veritabani | VeritabaniIslemi,
  urun: string,
  { sayfa, boyut = yorumSinirlari.sayfa }: { sayfa: number; boyut?: number },
): Promise<{ yorumlar: VitrinYorumu[]; toplam: number; sayfa: number; sayfaSayisi: number }> => {
  if (!kimlikMi(urun)) return { yorumlar: [], toplam: 0, sayfa: 1, sayfaSayisi: 1 };
  const kosul = and(eq(yorumlar.urun_kimligi, kimligiDuzelt(urun)), eq(yorumlar.durum, "yayinda"));
  const [sayim] = await vt.select({ toplam: count() }).from(yorumlar).where(kosul);
  const toplam = sayim?.toplam ?? 0;
  const sayfaSayisi = Math.min(Math.max(1, Math.ceil(toplam / boyut)), yorumSinirlari.enCokSayfa);
  const gecerliSayfa = Math.min(Math.max(1, Math.trunc(sayfa) || 1), sayfaSayisi);
  const satirlar =
    toplam === 0
      ? []
      : await vt
          .select(vitrinAlanlari)
          .from(yorumlar)
          .where(kosul)
          .orderBy(...yorumSirasi)
          .limit(gecerliSayfa * boyut);
  return { yorumlar: satirlar.map(vitrinYorumu), toplam, sayfa: gecerliSayfa, sayfaSayisi };
};

// Ana sayfanın yorumları (karar 0090): işaretlenenler ya da en yeniler, yalnız listede görünen ürünlerin.
export const anaSayfaYorumlari = async (
  vt: Veritabani | VeritabaniIslemi,
  { isaretlenenler, adet, an }: { isaretlenenler: boolean; adet: number; an: Date },
): Promise<VitrinYorumu[]> =>
  (
    await vt
      .select(vitrinAlanlari)
      .from(yorumlar)
      .innerJoin(urunler, eq(urunler.kimlik, yorumlar.urun_kimligi))
      .where(
        and(
          eq(yorumlar.durum, "yayinda"),
          isaretlenenler ? eq(yorumlar.ana_sayfada, true) : undefined,
          vitrinKosulu("liste", { an, tukenenUrun: "goster" }),
        ),
      )
      .orderBy(...yorumSirasi)
      .limit(adet)
  ).map(vitrinYorumu);
