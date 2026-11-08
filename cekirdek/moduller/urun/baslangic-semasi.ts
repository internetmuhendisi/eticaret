// Sitenin başlangıç kataloğunun şeması (baslangic/katalog.json, kart 0084). Kategoriler, markalar,
// etiketler ve ürünler (fiyatı ve stoğuyla) yalnız sitenin kataloğu hiç kurulmamışken bir kez yazılır
// (baslangic.ts). Dosyası olmayan site boş katalogla başlar.
//
// Alanlar panelin girdi şemalarından alınır: dosyadaki bir ürün panelden girilebilecek bir üründür.
// Kimlik yerine adres adı yazılır: kategori, marka, etiket ve ilgili ürün kendi adres adıyla, vergi
// sınıfı adıyla (baslangic/vergi.json'daki gibi) bağlanır.
//
// Denetim iki katmandır (kart 0084 kontrolü):
// - Bu şema ve katalogKurallari: alanlar, bağlantıların dosyada karşılığı, servislerin alanlar arası
//   kuralları (aynı işlevlerle: urunAlanKurallari, fiyatAlanKurallari), yerel zamanın sitenin saat
//   diliminde var olması, vergi sınıfının vergi başlangıcında olması. Site doğrulaması ve açılış bunları
//   çalıştırır.
// - Veritabanında aranan kurallar (aynı ad, aynı stok kodu; ad anahtarı yalnız veritabanında hesaplanır,
//   karar 0064) burada yoktur. Onları her sitenin kataloğunu boş bir veritabanına gerçekten kuran test
//   yakalar (urun/testler/site-kataloglari.test.ts), her yayında.
//
// Site doğrulaması bu dosyayı Node ile doğrudan çalıştırır: veritabanı kodu almaz.
import { z } from "zod";
import { galeriSinirlari } from "../../kayitlar/gorsel.ts";
import { urunDurumVitrini } from "../../kayitlar/urun.ts";
import type { VideoSitesi } from "../../kayitlar/video-siteleri.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import { fiyatAlanKurallari, fiyatGirdisi } from "../fiyat/semalar.ts";
import { kategoriGirdisi } from "../kategori/semalar.ts";
import { enCokStok } from "../stok/semalar.ts";
import { grupGirdisi } from "./grup-semalari.ts";
import {
  galeriGorselGirdisi,
  galeriVideoGirdisi,
  listeSinirlari,
  tekrarsizListe,
  urunAlanKurallari,
  urunGirdisi,
} from "./semalar.ts";
import { videoAdresiniCoz, videoSitesiIzinliMi } from "./video.ts";

export const katalogBaslangicHatalari = [
  // Aynı adres adı aynı listede iki kez.
  "adres-adi-tekrar",
  // Bağlantının dosyada karşılığı yok.
  "kategori-tanimsiz",
  "marka-tanimsiz",
  "etiket-tanimsiz",
  "ilgili-tanimsiz",
  // Stok takibi kapalı üründe stok yazılmaz: takip açılana kadar sayılmaz, yanıltır.
  "takipsiz-stok",
  // Galerideki görsel aynı üründe iki kez (kart 0087).
  "galeri-gorsel-tekrar",
] as const;
export type KatalogBaslangicHatasi = (typeof katalogBaslangicHatalari)[number];

const hata = (kod: KatalogBaslangicHatasi) => kod;

const adresAdi = z.string().max(adresAdiUzunlugu).regex(adresAdiKalibi);

// Galeri görselinin dosyası: sitenin baslangic/gorseller/ klasöründe, küçük harfli, tireli ad ve
// görsel türünün uzantısı. Alt klasör ve ".." yoktur.
export const katalogGorselKlasoru = "baslangic/gorseller";
export const katalogGorselAdi = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}\.(png|jpg|webp)$/);
const alternatifMetin = galeriGorselGirdisi.shape.alternatifMetin;

const kategori = kategoriGirdisi.pick({ ad: true, aciklama: true }).extend({ adresAdi });
// Grup şeması açıklamayı koşullu alır, türü açıklamayı tanımaz: okunan değer açık türe çevrilir.
const marka = grupGirdisi(true)
  .extend({ adresAdi })
  .transform(({ ad, adresAdi, aciklama }) => ({
    ad,
    adresAdi,
    ...(typeof aciklama === "string" ? { aciklama } : {}),
  }));
const etiket = grupGirdisi(false)
  .extend({ adresAdi })
  .transform(({ ad, adresAdi }) => ({ ad, adresAdi }));

const urun = urunGirdisi
  .omit({
    adresAdi: true,
    vergiSinifi: true,
    kategoriler: true,
    etiketler: true,
    marka: true,
    ilgiliUrunler: true,
  })
  .extend({
    adresAdi,
    // Vergi sınıfının adı; null ürünü vergisiz yapar. Ürün şemasındaki gibi zorunludur.
    vergiSinifi: z.string().min(1).nullable(),
    kategoriler: tekrarsizListe(adresAdi, listeSinirlari.grup, "kategori-tekrar").default([]),
    etiketler: tekrarsizListe(adresAdi, listeSinirlari.grup, "etiket-tekrar").default([]),
    marka: adresAdi.optional(),
    ilgiliUrunler: tekrarsizListe(adresAdi, listeSinirlari.ilgili, "ilgili-tekrar").default([]),
    // Birimin fiyatı, panelin fiyat girdisiyle (kuruş, sitenin saat diliminde yerel zaman).
    fiyat: fiyatGirdisi.optional(),
    // Başlangıç stoğu; verilmezse sıfır.
    stok: z.int().min(0).max(enCokStok).optional(),
    // Ürünün galerisi sırasıyla (kart 0087): görsel, sitenin baslangic/gorseller/ klasöründeki dosyanın
    // adıyla; video, video sitesinin bağlantısıyla. Dosyanın kendisini site doğrulaması denetler
    // (site-klasoru.ts), bağlantının bu sitede kabul edilmesini katalogKurallari.
    galeri: z
      .array(
        z.union([
          z.strictObject({ gorsel: katalogGorselAdi, alternatifMetin }),
          z.strictObject({ video: galeriVideoGirdisi.shape.adres, alternatifMetin }),
        ]),
      )
      .max(galeriSinirlari.oge)
      .default([]),
  });

// Aynı listede adres adı bir kez geçer.
const tekrarlariBul = (
  liste: readonly { adresAdi: string }[],
  yer: string,
  ctx: z.RefinementCtx,
): Set<string> => {
  const gorulen = new Set<string>();
  liste.forEach((oge, sira) => {
    if (gorulen.has(oge.adresAdi)) {
      ctx.addIssue({
        code: "custom",
        message: hata("adres-adi-tekrar"),
        path: [yer, sira, "adresAdi"],
      });
    }
    gorulen.add(oge.adresAdi);
  });
  return gorulen;
};

export const katalogBaslangicSemasi = z
  .strictObject({
    kategoriler: z.array(kategori).max(200).default([]),
    markalar: z.array(marka).max(200).default([]),
    etiketler: z.array(etiket).max(200).default([]),
    urunler: z.array(urun).max(1000).default([]),
  })
  .superRefine((katalog, ctx) => {
    const kategoriler = tekrarlariBul(katalog.kategoriler, "kategoriler", ctx);
    const markalar = tekrarlariBul(katalog.markalar, "markalar", ctx);
    const etiketler = tekrarlariBul(katalog.etiketler, "etiketler", ctx);
    const urunler = tekrarlariBul(katalog.urunler, "urunler", ctx);
    katalog.urunler.forEach((oge, sira) => {
      const yer = (alan: string, ...ek: number[]) => ["urunler", sira, alan, ...ek];
      const bagla = (
        alan: string,
        liste: string[],
        bilinen: Set<string>,
        kod: KatalogBaslangicHatasi,
      ) =>
        liste.forEach((ad, i) => {
          if (!bilinen.has(ad))
            ctx.addIssue({ code: "custom", message: hata(kod), path: yer(alan, i) });
        });
      bagla("kategoriler", oge.kategoriler, kategoriler, "kategori-tanimsiz");
      bagla("etiketler", oge.etiketler, etiketler, "etiket-tanimsiz");
      bagla("ilgiliUrunler", oge.ilgiliUrunler, urunler, "ilgili-tanimsiz");
      oge.ilgiliUrunler.forEach((ad, i) => {
        if (ad === oge.adresAdi) {
          ctx.addIssue({
            code: "custom",
            message: "ilgili-kendisi",
            path: yer("ilgiliUrunler", i),
          });
        }
      });
      for (const sorun of urunAlanKurallari({
        durum: oge.durum,
        yayinZamaniVar: oge.yayinZamani !== undefined,
        enAzAdet: oge.enAzAdet,
        enCokAdet: oge.enCokAdet ?? null,
      })) {
        ctx.addIssue({ code: "custom", message: sorun.kod, path: yer(sorun.alan) });
      }
      if (oge.marka !== undefined && !markalar.has(oge.marka)) {
        ctx.addIssue({ code: "custom", message: hata("marka-tanimsiz"), path: yer("marka") });
      }
      if (!oge.stokTakibi && oge.stok !== undefined) {
        ctx.addIssue({ code: "custom", message: hata("takipsiz-stok"), path: yer("stok") });
      }
      const gorseller = new Set<string>();
      oge.galeri.forEach((galeriOgesi, i) => {
        if (!("gorsel" in galeriOgesi)) return;
        if (gorseller.has(galeriOgesi.gorsel)) {
          ctx.addIssue({
            code: "custom",
            message: hata("galeri-gorsel-tekrar"),
            path: [...yer("galeri", i), "gorsel"],
          });
        }
        gorseller.add(galeriOgesi.gorsel);
      });
    });
  });
export type KatalogBaslangici = z.output<typeof katalogBaslangicSemasi>;

export const bosKatalog = (): KatalogBaslangici => ({
  kategoriler: [],
  markalar: [],
  etiketler: [],
  urunler: [],
});

// Sitenin ayarına bağlı kurallar: yerel zamanlar sitenin saat diliminde var olmalı (yaz saatine geçişte
// atlanan saat yoktur), fiyatın alanlar arası kuralları ana çevrilmiş zamanla denetlenir, vergi sınıfı
// vergi başlangıcında bir sınıfın adı olmalı (yeni kurulan sitede ürün sınıfsız kalmasın). Sorunun yeri
// şemanın yolu gibidir ("urunler.0.fiyat.indirimBitisi").
export const katalogKurallari = (
  katalog: KatalogBaslangici,
  site: {
    saatDilimi: string;
    vergiSiniflari: readonly string[];
    videoSiteleri: readonly VideoSitesi[];
  },
): { yer: string; kod: string }[] => {
  const siniflar = new Set(site.vergiSiniflari);
  return katalog.urunler.flatMap((urun, sira) => {
    const sorunlar: { yer: string; kod: string }[] = [];
    const yer = (alan: string) => `urunler.${sira}.${alan}`;
    if (urun.vergiSinifi !== null && !siniflar.has(urun.vergiSinifi)) {
      sorunlar.push({ yer: yer("vergiSinifi"), kod: "vergi-sinifi-tanimsiz" });
    }
    // Zamanlanmış olmayan ürünün yayın zamanı servis tarafından yok sayılır.
    if (urun.yayinZamani !== undefined && urunDurumVitrini[urun.durum].zamanli) {
      if (yerelZamandan(urun.yayinZamani, site.saatDilimi) === undefined) {
        sorunlar.push({ yer: yer("yayinZamani"), kod: "yayin-zamani-gecersiz" });
      }
    }
    // Video bağlantısı bu sitede kabul edilen bir siteden olmalı (videoSiteleri ayarı).
    urun.galeri.forEach((oge, i) => {
      if (!("video" in oge)) return;
      const video = videoAdresiniCoz(oge.video);
      if (video !== undefined && !videoSitesiIzinliMi(video.site, site.videoSiteleri)) {
        sorunlar.push({ yer: yer(`galeri.${i}.video`), kod: "video-sitesi-izinsiz" });
      }
    });
    if (urun.fiyat !== undefined) {
      const { fiyat } = urun;
      const ana = (alan: "indirimBaslangici" | "indirimBitisi") => {
        const yerel = fiyat[alan];
        if (yerel === null) return null;
        const an = yerelZamandan(yerel, site.saatDilimi);
        if (an === undefined)
          sorunlar.push({ yer: yer(`fiyat.${alan}`), kod: "indirim-zamani-gecersiz" });
        return an ?? null;
      };
      const indirimBaslangici = ana("indirimBaslangici");
      const indirimBitisi = ana("indirimBitisi");
      for (const sorun of fiyatAlanKurallari({ ...fiyat, indirimBaslangici, indirimBitisi })) {
        sorunlar.push({ yer: yer(`fiyat.${sorun.alan}`), kod: sorun.kod });
      }
    }
    return sorunlar;
  });
};
