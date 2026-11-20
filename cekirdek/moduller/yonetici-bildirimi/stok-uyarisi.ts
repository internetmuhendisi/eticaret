// Stok uyarıları (kart 0241, karar 0154; kullanıcı kararı: saatte en çok bir e-posta). Sipariş bir birimin stoğunu
// eşiğin altına indirince stok düşürmeyle aynı işlemde bir satır yazılır ve gönderim işi kuyruğa girer
// (stokUyarisiYaz, stok servisi çağırır). İş bekleyen bütün uyarıları tek e-postada gönderir. Son gönderimden bir
// saat geçmediyse kendini o ana erteler (aynı ana tek iş). İşler sırayla çalışır (danışma kilidi): aynı uyarı iki
// e-postaya girmez. Bildirim kapalıysa bekleyenler işlenmiş sayılır, e-posta yazılmaz.
import { and, asc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import {
  type StokUyarisiTuru,
  yoneticiBildirimSinirlari,
} from "../../kayitlar/yonetici-bildirimi.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import {
  urunBirimiDegerleri,
  urunBirimleri,
  urunler,
  urunSecenekDegerleri,
  urunSecenekleri,
} from "../urun/model.ts";
import { bildirimAcikMi, bildirimAlicilari, bildirimEpostalariniYaz } from "./gonderim.ts";
import { stokUyarilari } from "./model.ts";
import type { YoneticiBildirimVerisi } from "./veri.ts";

// Uyarının satırı; iş kuyruğa çağıranın yazdığı işle girer (ertele aynı işi kurar).
export const stokUyarisiSatiriYaz = (
  islem: VeritabaniIslemi,
  g: { birim: string; tur: StokUyarisiTuru; miktar: number },
) => islem.insert(stokUyarilari).values({ birim_kimligi: g.birim, tur: g.tur, miktar: g.miktar });

type Ertele = (islem: VeritabaniIslemi, gecikmeSaniye: number, anahtar: string) => Promise<unknown>;

// Gönderilen uyarı sayısını döner.
export const stokUyarilariniGonder = async (
  vt: Veritabani,
  site: Site,
  ertele: Ertele,
): Promise<number> => {
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  const acik = bildirimAcikMi(ayarlar, "stok");
  const alicilar = acik ? await bildirimAlicilari(vt, ayarlar) : [];
  return vt.transaction(async (islem) => {
    await islem.execute(sql`select pg_advisory_xact_lock(hashtext('stok_uyarilari'))`);
    // İşlenmiş eski satırlar silinir.
    await islem
      .delete(stokUyarilari)
      .where(
        and(
          isNotNull(stokUyarilari.islenme_zamani),
          lt(
            stokUyarilari.islenme_zamani,
            sql`now() - make_interval(days => ${yoneticiBildirimSinirlari.stokUyarisiSaklamaGun})`,
          ),
        ),
      );
    const bekleyenler = await islem
      .select()
      .from(stokUyarilari)
      .where(isNull(stokUyarilari.islenme_zamani))
      .orderBy(asc(stokUyarilari.olusturma_zamani), asc(stokUyarilari.kimlik));
    const ilk = bekleyenler[0];
    if (ilk === undefined) return 0;
    const isle = (gonderildi: boolean) =>
      islem
        .update(stokUyarilari)
        .set({
          islenme_zamani: sql`now()`,
          ...(gonderildi ? { gonderim_zamani: sql`now()` } : {}),
        })
        .where(
          inArray(
            stokUyarilari.kimlik,
            bekleyenler.map((satir) => satir.kimlik),
          ),
        );
    if (!acik) {
      await isle(false);
      return 0;
    }
    // Son gönderimden bu yana bir saat geçmediyse kalan süre kadar ertelenir; aynı ana tek iş (anahtar).
    const [son] = await islem
      .select({
        an: sql<
          string | null
        >`to_char(max(${stokUyarilari.gonderim_zamani}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')`,
        kalan: sql<
          number | null
        >`ceil(extract(epoch from (max(${stokUyarilari.gonderim_zamani}) + make_interval(secs => ${yoneticiBildirimSinirlari.stokAraligiSaniye})) - now()))::int`,
      })
      .from(stokUyarilari)
      .where(isNotNull(stokUyarilari.gonderim_zamani));
    if (son?.kalan !== null && son?.kalan !== undefined && son.kalan > 0) {
      await ertele(
        islem,
        son.kalan + yoneticiBildirimSinirlari.stokErtelemePayiSaniye,
        `yonetici-stok-uyarisi:${son.an}`,
      );
      return 0;
    }
    // Birimin adı, seçimi ve stok kodu; aynı birimin uyarılarından en sonuncusu (tükendi düşükten sonra gelir).
    const sonUyarilar = [
      ...new Map(bekleyenler.map((satir) => [satir.birim_kimligi, satir])).values(),
    ];
    const birimler = sonUyarilar.map((satir) => satir.birim_kimligi);
    const bilgiler = await islem
      .select({ birim: urunBirimleri.kimlik, ad: urunler.ad, stokKodu: urunBirimleri.stok_kodu })
      .from(urunBirimleri)
      .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
      .where(inArray(urunBirimleri.kimlik, birimler));
    const secimler = await islem
      .select({ birim: urunBirimiDegerleri.birim_kimligi, deger: urunSecenekDegerleri.ad })
      .from(urunBirimiDegerleri)
      .innerJoin(
        urunSecenekDegerleri,
        eq(urunSecenekDegerleri.kimlik, urunBirimiDegerleri.deger_kimligi),
      )
      .innerJoin(urunSecenekleri, eq(urunSecenekleri.kimlik, urunSecenekDegerleri.secenek_kimligi))
      .where(inArray(urunBirimiDegerleri.birim_kimligi, birimler))
      .orderBy(asc(urunSecenekleri.sira), asc(urunSecenekleri.kimlik));
    const veri: YoneticiBildirimVerisi["stok"] = {
      uyarilar: sonUyarilar.flatMap((satir) => {
        const bilgi = bilgiler.find((b) => b.birim === satir.birim_kimligi);
        return bilgi === undefined
          ? []
          : [
              {
                ad: bilgi.ad,
                secim: secimler.filter((s) => s.birim === satir.birim_kimligi).map((s) => s.deger),
                stokKodu: bilgi.stokKodu,
                tur: satir.tur,
                miktar: satir.miktar,
              },
            ];
      }),
    };
    await bildirimEpostalariniYaz(islem, {
      bildirim: "stok",
      anahtar: `stok-uyarisi:${ilk.kimlik}`,
      veri,
      alicilar,
    });
    await isle(true);
    return sonUyarilar.length;
  });
};
