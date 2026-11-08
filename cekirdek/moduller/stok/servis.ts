// Stoğu okuyan ve değiştiren tek yol (kart 0082, karar 0068).
//
// - Stok satılabilir birime bağlıdır (karar 0062), tek depo vardır. Takibin açık olup olmadığı üründedir.
//   Takibi kapalı üründe düşürme ve artırma stoğa dokunmaz, geçmişe bir şey yazmaz.
// - Üç yol vardır:
//   - stokDus: sipariş oluşurken, çağıranın veritabanı işleminin içinde. "Yeterliyse düş" tek sorgudur:
//     satır kilidi aynı anda gelen iki isteği sıraya koyar, ikincisi koşulu güncel miktarla yeniden
//     sınar; son ürün iki kez düşmez.
//   - stokArtir: iptal ve iadede, çağıranın işleminin içinde.
//   - stokDuzelt: panelden elle, sebeple ve ekranın gördüğü miktarla; kendi işlemini açar.
// - Her değişiklik stok geçmişine aynı işlemde yazılır (kim, ne zaman, neden, önceki ve sonraki miktar);
//   geçmiş sonradan değiştirilemez (tetikleyici). Elle düzeltme değişiklik kaydına da girer; siparişin
//   düşürmesi girmez, siparişin kendi geçmişi vardır.
// - Kilit sırası hep aynıdır: önce ürün ve birim satırları paylaşımlı (takip ve silinme okunurken
//   değişmesin), sonra birimin stok satırı. Birden çok kalem birim kimliği sırasıyla işlenir: iki
//   sipariş aynı birimleri ters sırada kilitleyip birbirini beklemez. Ürünün işlem kilidi
//   (urun/kilit.ts) alınmaz: bütün siparişler tek kuyruğa girerdi.
// - Düşürme ya da artırma bir kalemde reddedilirse o çağrının bütün kalemleri geri alınır (iç kayıt
//   noktası); çağıranın işlemi hatayı yakalarsa geri kalanı bozulmadan sürebilir.
//
// İzin kapıda denetlenir (izinler.ts); servis yalnız kimin yaptığını kayda yazar.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import {
  type ArtirmaSebebi,
  type DusmeSebebi,
  type StokSebebi,
  stokSebepleri,
} from "../../kayitlar/stok.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { birimStoklari, stokGecmisi } from "./model.ts";
import {
  type ElleDuzeltme,
  elleDuzeltme,
  type StokHatasi,
  type StokKalemi,
  stokHatalari,
  stokKalemleri,
} from "./semalar.ts";

export type BirimStogu = { miktar: number; takip: boolean };

export type StokGecmisiSatiri = {
  kimlik: string;
  zaman: Date;
  oncekiMiktar: number;
  sonrakiMiktar: number;
  sebep: StokSebebi;
  not: string | null;
  kaynak: string | null;
  kim: DegisikligiYapan;
};

// Bir sayfada okunan geçmiş satırının üst sınırı (.claude/rules/veritabani.md).
export const stokGecmisiSayfasi = 100;

type Sorun = { alan: string; kod: string; birim?: string };
const dogrulamaHatasi = (sorunlar: Sorun[]) => new BilinenHata("dogrulama", sorunlar);
const sorun = (alan: string, kod: StokHatasi, birim?: string): Sorun =>
  birim === undefined ? { alan, kod } : { alan, kod, birim };

const bilinenKodlar = new Set<string>(stokHatalari);
const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw dogrulamaHatasi(
    sonuc.error.issues.map((s) => ({
      alan: s.path.join("."),
      kod: bilinenKodlar.has(s.message) ? s.message : s.code,
    })),
  );
};

// Aynı birimin kalemleri toplanır, birimler kimlik sırasıyla döner (kilit sırası).
const kalemleriTopla = (ham: StokKalemi[]): { birim: string; adet: number }[] => {
  const kalemler = girdiyiDogrula(stokKalemleri.safeParse(ham));
  const toplam = new Map<string, number>();
  for (const { birim, adet } of kalemler) toplam.set(birim, (toplam.get(birim) ?? 0) + adet);
  return [...toplam]
    .map(([birim, adet]) => ({ birim, adet }))
    .toSorted((a, b) => (a.birim < b.birim ? -1 : a.birim > b.birim ? 1 : 0));
};

const kimSutunlari = (kim: DegisikligiYapan) => ({
  kim_turu: kim.tur,
  kim_kimligi: kim.tur === "sistem" ? null : kim.kimlik,
  kim_adi: kim.tur === "sistem" ? kim.ad : null,
});

type GecmisGirdisi = {
  birim: string;
  onceki: number;
  sonraki: number;
  sebep: StokSebebi;
  not?: string | null;
  kaynak?: string | null;
  kim: DegisikligiYapan;
};

// Geçmişin zamanı satır kilidi alındıktan sonraki saattir, işlemin başladığı an değil: aynı anda
// başlayan iki değişiklikte geçmişin sırası yazılma sırasıyla aynı olsun (fiyat geçmişiyle aynı yol).
const gecmiseYaz = (islem: VeritabaniIslemi, g: GecmisGirdisi) =>
  islem.insert(stokGecmisi).values({
    birim_kimligi: g.birim,
    zaman: sql`clock_timestamp()`,
    onceki_miktar: g.onceki,
    sonraki_miktar: g.sonraki,
    sebep: g.sebep,
    not: g.not ?? null,
    kaynak_kimligi: g.kaynak ?? null,
    ...kimSutunlari(g.kim),
  });

// Birimin ve ürününün satırı, paylaşımlı kilitle: takip ve silinme bu işlem bitene kadar değişmez.
const birimiKilitle = async (islem: VeritabaniIslemi, birim: string) => {
  const [bulunan] = await islem
    .select({
      takip: urunler.stok_takibi,
      urunSilinme: urunler.silinme_zamani,
      birimSilinme: urunBirimleri.silinme_zamani,
    })
    .from(urunBirimleri)
    .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
    .where(eq(urunBirimleri.kimlik, birim))
    .for("share", { of: [urunBirimleri, urunler] });
  if (bulunan === undefined) return undefined;
  return {
    takip: bulunan.takip,
    silinmis: bulunan.urunSilinme !== null || bulunan.birimSilinme !== null,
  };
};

const kaynakDenetle = (kaynak: string | undefined) => {
  if (kaynak !== undefined && !kimlikMi(kaynak)) {
    throw dogrulamaHatasi([{ alan: "kaynak", kod: "invalid_format" }]);
  }
};

export const stokServisi = () => {
  // Sipariş oluşurken: her kalemin stoğu yeterliyse düşer. Bir kalem yetmezse ya da birimi satılamazsa
  // hiçbir kalem düşmez ve çakışma hatası bütün sorunlu birimleri söyler. Çağıranın işleminde çalışır:
  // sipariş kaydıyla birlikte yazılır, birlikte geri alınır.
  const stokDus = async (
    islem: VeritabaniIslemi,
    kim: DegisikligiYapan,
    hamKalemler: StokKalemi[],
    secenekler: { sebep: DusmeSebebi; kaynak?: string },
  ): Promise<void> => {
    const kalemler = kalemleriTopla(hamKalemler);
    kaynakDenetle(secenekler.kaynak);
    await islem.transaction(async (ic) => {
      const sorunlar: Sorun[] = [];
      for (const { birim, adet } of kalemler) {
        const durum = kimlikMi(birim) ? await birimiKilitle(ic, birim) : undefined;
        if (durum === undefined || durum.silinmis) {
          sorunlar.push(sorun("kalemler", "birim-gecersiz", birim));
          continue;
        }
        if (!durum.takip) continue;
        // Yeterliyse düş: koşul ile değişiklik tek sorgudadır. Satırı başka bir işlem kilitlemişse bu
        // sorgu bekler, sonra koşulu o işlemin yazdığı miktarla yeniden sınar.
        const [yeni] = await ic
          .update(birimStoklari)
          .set({ miktar: sql`${birimStoklari.miktar} - ${adet}`, guncellenme_zamani: sql`now()` })
          .where(
            and(eq(birimStoklari.birim_kimligi, birim), sql`${birimStoklari.miktar} >= ${adet}`),
          )
          .returning({ miktar: birimStoklari.miktar });
        if (yeni === undefined) {
          sorunlar.push(sorun("kalemler", "stok-yetersiz", birim));
          continue;
        }
        await gecmiseYaz(ic, {
          birim,
          onceki: yeni.miktar + adet,
          sonraki: yeni.miktar,
          sebep: secenekler.sebep,
          kaynak: secenekler.kaynak,
          kim,
        });
      }
      if (sorunlar.length > 0) throw new BilinenHata("cakisma", sorunlar);
    });
  };

  // İptal ve iadede: her kalemin stoğu artar. Silinmiş birimin stoğu da artar (geçmiş doğru kalsın);
  // olmayan birim reddedilir. Çağıranın işleminde çalışır.
  const stokArtir = async (
    islem: VeritabaniIslemi,
    kim: DegisikligiYapan,
    hamKalemler: StokKalemi[],
    secenekler: { sebep: ArtirmaSebebi; kaynak?: string },
  ): Promise<void> => {
    const kalemler = kalemleriTopla(hamKalemler);
    kaynakDenetle(secenekler.kaynak);
    await islem.transaction(async (ic) => {
      const sorunlar: Sorun[] = [];
      for (const { birim, adet } of kalemler) {
        const durum = kimlikMi(birim) ? await birimiKilitle(ic, birim) : undefined;
        if (durum === undefined) {
          sorunlar.push(sorun("kalemler", "birim-gecersiz", birim));
          continue;
        }
        if (!durum.takip) continue;
        const [yeni] = await ic
          .insert(birimStoklari)
          .values({ birim_kimligi: birim, miktar: adet })
          .onConflictDoUpdate({
            target: birimStoklari.birim_kimligi,
            set: {
              miktar: sql`${birimStoklari.miktar} + ${adet}`,
              guncellenme_zamani: sql`now()`,
            },
          })
          .returning({ miktar: birimStoklari.miktar });
        if (yeni === undefined) throw new Error("Stok satırı yazılamadı.");
        await gecmiseYaz(ic, {
          birim,
          onceki: yeni.miktar - adet,
          sonraki: yeni.miktar,
          sebep: secenekler.sebep,
          kaynak: secenekler.kaynak,
          kim,
        });
      }
      if (sorunlar.length > 0) throw new BilinenHata("cakisma", sorunlar);
    });
  };

  // Panelden elle düzeltme: birimin stoğu yeni miktar olur. Ekranın gördüğü miktar artık doğru değilse
  // (arada sipariş düştü) çakışma döner, hiçbir şey yazılmaz. Aynı kalan miktar hiçbir yere yazılmaz.
  // Takibi kapalı üründe de düzeltilir: takip açılmadan önce stok girilebilsin. Silinmiş birim ya da
  // ürün bulunamadıdır.
  const stokDuzelt = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    birim: string,
    ham: ElleDuzeltme,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(elleDuzeltme.safeParse(ham));
    if (stokSebepleri[girdi.sebep].notZorunlu && girdi.not === undefined) {
      throw dogrulamaHatasi([sorun("not", "not-gerekli")]);
    }
    if (!kimlikMi(birim)) throw new BilinenHata("bulunamadi");
    await vt.transaction(async (islem) => {
      const durum = await birimiKilitle(islem, birim);
      if (durum === undefined || durum.silinmis) throw new BilinenHata("bulunamadi");
      await islem.insert(birimStoklari).values({ birim_kimligi: birim }).onConflictDoNothing();
      const [mevcut] = await islem
        .select({ miktar: birimStoklari.miktar })
        .from(birimStoklari)
        .where(eq(birimStoklari.birim_kimligi, birim))
        .for("update");
      if (mevcut === undefined) throw new Error("Stok satırı okunamadı.");
      if (mevcut.miktar !== girdi.gorulenMiktar) {
        throw new BilinenHata("cakisma", [sorun("gorulenMiktar", "stok-degisti")]);
      }
      if (mevcut.miktar === girdi.yeniMiktar) return;
      await islem
        .update(birimStoklari)
        .set({ miktar: girdi.yeniMiktar, guncellenme_zamani: sql`now()` })
        .where(eq(birimStoklari.birim_kimligi, birim));
      await gecmiseYaz(islem, {
        birim,
        onceki: mevcut.miktar,
        sonraki: girdi.yeniMiktar,
        sebep: girdi.sebep,
        not: girdi.not,
        kim,
      });
      await degisikligiKaydet(islem, {
        kim,
        islem: "stok.duzeltildi",
        kayit: { tur: "stok", kimlik: birim },
        eski: { miktar: mevcut.miktar },
        yeni: {
          miktar: girdi.yeniMiktar,
          sebep: girdi.sebep,
          ...(girdi.not === undefined ? {} : { not: girdi.not }),
        },
      });
    });
  };

  // Birimlerin stoğu ve ürünlerinin takibi, tek sorguyla. Stok satırı olmayan birimin stoğu sıfırdır;
  // olmayan birim haritada yoktur. Silinmiş birim de okunur: satılıp satılamayacağına (kart 0083) burada
  // bakılmaz.
  const stoklariOku = async (
    vt: Veritabani,
    birimler: string[],
  ): Promise<Map<string, BirimStogu>> => {
    const gecerli = birimler.filter(kimlikMi);
    if (gecerli.length === 0) return new Map();
    const satirlar = await vt
      .select({
        birim: urunBirimleri.kimlik,
        miktar: sql<number>`coalesce(${birimStoklari.miktar}, 0)`.mapWith(Number),
        takip: urunler.stok_takibi,
      })
      .from(urunBirimleri)
      .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
      .leftJoin(birimStoklari, eq(birimStoklari.birim_kimligi, urunBirimleri.kimlik))
      .where(inArray(urunBirimleri.kimlik, gecerli));
    return new Map(satirlar.map(({ birim, ...stok }) => [birim, stok]));
  };

  // Birimin stok geçmişi, en yeni önce, en çok bir sayfa. `sonra` bir önceki sayfanın son satırının
  // kimliğidir; karşılaştırma veritabanında satırın kendi zamanı ve kimliğiyle yapılır (fiyat geçmişiyle
  // aynı yol, aynı milisaniyedeki satır kaybolmaz).
  const stokGecmisiniOku = async (
    vt: Veritabani,
    birim: string,
    secenekler: { sonra?: string; sinir?: number } = {},
  ): Promise<StokGecmisiSatiri[]> => {
    const { sonra } = secenekler;
    if (!kimlikMi(birim) || (sonra !== undefined && !kimlikMi(sonra))) return [];
    const sinir = Math.min(Math.max(secenekler.sinir ?? stokGecmisiSayfasi, 1), stokGecmisiSayfasi);
    const satirlar = await vt
      .select()
      .from(stokGecmisi)
      .where(
        and(
          eq(stokGecmisi.birim_kimligi, birim),
          sonra === undefined
            ? undefined
            : sql`(${stokGecmisi.zaman}, ${stokGecmisi.kimlik}) < (select ${stokGecmisi.zaman}, ${stokGecmisi.kimlik} from ${stokGecmisi} where ${stokGecmisi.kimlik} = ${sonra})`,
        ),
      )
      .orderBy(desc(stokGecmisi.zaman), desc(stokGecmisi.kimlik))
      .limit(sinir);
    return satirlar.map((s) => ({
      kimlik: s.kimlik,
      zaman: s.zaman,
      oncekiMiktar: s.onceki_miktar,
      sonrakiMiktar: s.sonraki_miktar,
      sebep: s.sebep as StokSebebi,
      not: s.not,
      kaynak: s.kaynak_kimligi,
      kim:
        s.kim_turu === "sistem"
          ? { tur: "sistem", ad: s.kim_adi ?? "" }
          : {
              tur: s.kim_turu as "yonetici" | "musteri" | "sahip",
              kimlik: s.kim_kimligi ?? "",
            },
    }));
  };

  return { stokDus, stokArtir, stokDuzelt, stoklariOku, stokGecmisiniOku };
};

const servis = stokServisi();
export const calisanSiteninStokServisi = () => servis;
