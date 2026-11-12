// Müşterinin favorileri (kart 0140, karar 0110). Favoriler yalnız bu servisle okunur ve değişir.
//
// Kurallar:
// - Müşteri yalnız kendi favorilerini görür ve değiştirir: kimlik yalnız kapıdan gelir, her sorgu onunla süzülür.
// - Listede yalnız vitrinde sayfası açılan ürünler görünür (vitrinKosulu, sayfa yeri): gizli ve tükenmiş ürün
//   görünür (kullanıcı kararı), taslak, arşiv, silinmiş ve zamanı gelmemiş ürün görünmez. Görünmeyen ürünün satırı
//   silinmez; ürün yeniden açılınca favoride döner.
// - Yalnız sayfası açılan ürün eklenir. Çıkarmak her zaman serbesttir.
// - Sınır sitenin favoriSiniri ayarıdır ve listede görünen favorileri sayar: müşterinin göremediği ve
//   çıkaramadığı satır yer kaplamaz. Görünmeyen ürün geri açılınca liste sınırı aşabilir. Sınır müşterinin satırı
//   kilitlenerek denetlenir: aynı anda gelen iki ekleme sınırı aşamaz.
// - Birleşme (giriş ya da kayıttan sonra) tarayıcıdaki listeyi ekler: hesapta olan ürün ikinci kez eklenmez,
//   tarayıcıdaki sıra korunur ve hepsi hesaptakilerden yeni sayılır. Sınıra sığmayanlar, tarayıcıdaki en eskiler,
//   eklenmez ve sayısı döner.
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { musteriler } from "../musteri/model.ts";
import { urunler } from "../urun/model.ts";
import { vitrinKosulu } from "../urun/vitrin.ts";
import { favoriler } from "./model.ts";
import type { BirlesmeSonucu, FavoriHatasi } from "./semalar.ts";

const hata = (kod: "is-kurali" | "bulunamadi", neden: FavoriHatasi) =>
  new BilinenHata(kod, [{ alan: "urun", kod: neden }]);

// Sayfası açılan ürün: tükenmiş ürün de açılır.
const sayfaKosulu = (an: Date | undefined) =>
  vitrinKosulu("sayfa", { ...(an === undefined ? {} : { an }), tukenenUrun: "goster" });

// Müşterinin satırını kilitler: aynı müşterinin eklemeleri ve birleşmeleri sırayla çalışır.
const musteriyiKilitle = async (islem: VeritabaniIslemi, musteri: string) => {
  await islem
    .select({ kimlik: musteriler.kimlik })
    .from(musteriler)
    .where(eq(musteriler.kimlik, musteri))
    .for("update");
};

// Sınıra sayılan satırlar: listede görünen favoriler. Görünmeyen ürünün satırı sayılmaz, çünkü müşteri onu
// göremez ve çıkaramaz (bağımsız kontrolün bulgusu); ürün geri açılınca liste sınırı biraz aşabilir.
const sayilanFavoriler = async (
  islem: VeritabaniIslemi,
  musteri: string,
  an: Date | undefined,
): Promise<number> => {
  const [satir] = await islem
    .select({ sayi: count() })
    .from(favoriler)
    .innerJoin(urunler, eq(urunler.kimlik, favoriler.urun_kimligi))
    .where(and(eq(favoriler.musteri_kimligi, musteri), sayfaKosulu(an)));
  return satir?.sayi ?? 0;
};

export const favoriServisi = (site: Site) => {
  const sinir = site.ayarlar.favoriSiniri;

  // Müşterinin vitrinde sayfası açılan favorileri, en yeni önce.
  const favoriListesi = async (
    vt: Veritabani | VeritabaniIslemi,
    musteri: string,
    an?: Date,
  ): Promise<string[]> => {
    const satirlar = await vt
      .select({ urun: favoriler.urun_kimligi })
      .from(favoriler)
      .innerJoin(urunler, eq(urunler.kimlik, favoriler.urun_kimligi))
      .where(and(eq(favoriler.musteri_kimligi, musteri), sayfaKosulu(an)))
      .orderBy(desc(favoriler.eklenme_zamani), desc(favoriler.urun_kimligi));
    return satirlar.map((satir) => satir.urun);
  };

  // Ürünü favorilere ekler ya da çıkarır; müşterinin güncel listesini döner. Zaten favorideki ürünü eklemek ve
  // favoride olmayanı çıkarmak hiçbir şey değiştirmez.
  const favoriDegistir = async (
    vt: Veritabani,
    musteri: string,
    urun: string,
    favoride: boolean,
    an?: Date,
  ): Promise<string[]> => {
    if (!kimlikMi(urun)) {
      if (favoride) throw hata("bulunamadi", "urun-yok");
      return favoriListesi(vt, musteri, an);
    }
    // Kimlik veritabanında harf ayrımsız karşılaştırılır (uuid türü); çevirmeye gerek yoktur (bozularak ölçüldü).
    const kimlik = urun;
    return vt.transaction(async (islem) => {
      if (!favoride) {
        await islem
          .delete(favoriler)
          .where(and(eq(favoriler.musteri_kimligi, musteri), eq(favoriler.urun_kimligi, kimlik)));
        return favoriListesi(islem, musteri, an);
      }
      await musteriyiKilitle(islem, musteri);
      const [acik] = await islem
        .select({ kimlik: urunler.kimlik })
        .from(urunler)
        .where(and(eq(urunler.kimlik, kimlik), sayfaKosulu(an)));
      if (acik === undefined) throw hata("bulunamadi", "urun-yok");
      const [var_] = await islem
        .select({ urun: favoriler.urun_kimligi })
        .from(favoriler)
        .where(and(eq(favoriler.musteri_kimligi, musteri), eq(favoriler.urun_kimligi, kimlik)));
      if (var_ === undefined) {
        if ((await sayilanFavoriler(islem, musteri, an)) >= sinir) {
          throw hata("is-kurali", "favori-siniri");
        }
        await islem.insert(favoriler).values({
          musteri_kimligi: musteri,
          urun_kimligi: kimlik,
          eklenme_zamani: sql`clock_timestamp()`,
        });
      }
      return favoriListesi(islem, musteri, an);
    });
  };

  // Tarayıcıdaki listeyi (en yeni önce) hesaba birleştirir.
  const favorileriBirlestir = async (
    vt: Veritabani,
    musteri: string,
    tarayicidakiler: readonly string[],
    an?: Date,
  ): Promise<BirlesmeSonucu> => {
    const istenen = [...new Set(tarayicidakiler.filter(kimlikMi).map(kimligiDuzelt))];
    return vt.transaction(async (islem) => {
      await musteriyiKilitle(islem, musteri);
      if (istenen.length === 0)
        return { favoriler: await favoriListesi(islem, musteri, an), sigmayan: 0 };
      const [acikSatirlar, hesaptakiSatirlar] = await Promise.all([
        islem
          .select({ kimlik: urunler.kimlik })
          .from(urunler)
          .where(and(inArray(urunler.kimlik, istenen), sayfaKosulu(an))),
        islem
          .select({ urun: favoriler.urun_kimligi })
          .from(favoriler)
          .where(
            and(eq(favoriler.musteri_kimligi, musteri), inArray(favoriler.urun_kimligi, istenen)),
          ),
      ]);
      const acik = new Set(acikSatirlar.map((satir) => satir.kimlik));
      const hesapta = new Set(hesaptakiSatirlar.map((satir) => satir.urun));
      const yeniler = istenen.filter((kimlik) => acik.has(kimlik) && !hesapta.has(kimlik));
      const yer = Math.max(0, sinir - (await sayilanFavoriler(islem, musteri, an)));
      const eklenecekler = yeniler.slice(0, yer);
      if (eklenecekler.length > 0) {
        // Listenin başı en yenidir: her satır tek bir anın (komutun başladığı an) bir mikro saniye daha eskisine
        // yazılır, hepsi hesaptakilerden yenidir. clock_timestamp() satır başına ayrı okunur, sırayı bozar
        // (ölçüldü).
        await islem
          .insert(favoriler)
          .values(
            eklenecekler.map((kimlik, sira) => ({
              musteri_kimligi: musteri,
              urun_kimligi: kimlik,
              eklenme_zamani: sql`statement_timestamp() - ${sira}::int * interval '1 microsecond'`,
            })),
          )
          .onConflictDoNothing();
      }
      return {
        favoriler: await favoriListesi(islem, musteri, an),
        sigmayan: yeniler.length - eklenecekler.length,
      };
    });
  };

  return { favoriListesi, favoriDegistir, favorileriBirlestir };
};
