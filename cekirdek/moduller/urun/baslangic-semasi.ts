// Sitenin başlangıç kataloğunun şeması (baslangic/katalog.json, kart 0084). Kategoriler, markalar,
// etiketler, özellikler ve ürünler (fiyatı, stoğu, seçenekleri ve birleşimleriyle; kart 0100) yalnız sitenin kataloğu hiç kurulmamışken bir kez yazılır
// (baslangic.ts). Dosyası olmayan site boş katalogla başlar.
//
// Alanlar panelin girdi şemalarından alınır: dosyadaki bir ürün panelden girilebilecek bir üründür.
// Kimlik yerine adres adı yazılır: kategori, marka, etiket ve ilgili ürün kendi adres adıyla, vergi
// sınıfı adıyla (baslangic/vergi.json'daki gibi) bağlanır. Özellik adıyla, liste özelliğinin değeri
// seçeneğin adıyla, birleşimin değerleri seçeneklerin sırasıyla değer adlarıyla, birleşimin görseli
// ürünün galerisindeki dosya adıyla yazılır (kart 0100).
//
// Varyantlı ürün (seçenekleri olan) satılabilir birimlerini birleşimlerle verir: fiyat, stok ve birim
// alanları (stok kodu, barkod, ölçüler) her birleşimdedir, ürünün kendisinde yazılmaz. Panelde de ilk
// seçenek basit birimi siler (karar 0071).
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
import { ozellikSinirlari } from "../../kayitlar/ozellik.ts";
import { urunDurumVitrini, varyantSinirlari } from "../../kayitlar/urun.ts";
import type { VideoSitesi } from "../../kayitlar/video-siteleri.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import { fiyatAlanKurallari, fiyatGirdisi } from "../fiyat/semalar.ts";
import { kategoriGirdisi } from "../kategori/semalar.ts";
import { degerSemalari, ozellikAlanKurallari, ozellikGirdisi } from "../ozellik/semalar.ts";
import { enCokStok } from "../stok/semalar.ts";
import { grupGirdisi } from "./grup-semalari.ts";
import {
  birimAlanAdlari,
  birlesimGirdisi,
  galeriGorselGirdisi,
  galeriVideoGirdisi,
  listeSinirlari,
  secenekGirdisi,
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
  // Özellikler (kart 0100): aynı adla iki özellik; ürünün bağladığı özellik dosyada yok; ürün aynı
  // özelliğe iki değer veriyor; değer özelliğin türüne uymuyor; liste değeri özelliğin seçeneği değil.
  "ozellik-ad-tekrar",
  "ozellik-tanimsiz",
  "ozellik-tekrar",
  "ozellik-deger-gecersiz",
  "ozellik-secenek-gecersiz",
  // Varyantlar (kart 0100): seçenekli üründe ürünün kendi fiyatı, stoğu ya da birim alanı; seçenekli
  // ürünün birleşimi yok ya da seçeneksiz ürünün birleşimi var; birleşimin değer sayısı seçenek sayısı
  // değil ya da değer o seçenekte yok; aynı birleşim iki kez; birleşimin görseli ürünün galerisinde yok.
  "varyant-birim-alani",
  "birlesimsiz-secenek",
  "seceneksiz-birlesim",
  "birlesim-gecersiz",
  "birlesim-tekrar",
  "birlesim-gorsel-tanimsiz",
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
const marka = grupGirdisi({ aciklama: true, logo: false })
  .extend({ adresAdi })
  .transform(({ ad, adresAdi, aciklama }) => ({
    ad,
    adresAdi,
    ...(typeof aciklama === "string" ? { aciklama } : {}),
  }));
const etiket = grupGirdisi({ aciklama: false, logo: false })
  .extend({ adresAdi })
  .transform(({ ad, adresAdi }) => ({ ad, adresAdi }));

// Özellik tanımı: sırası dosyadaki sıradır.
const ozellik = ozellikGirdisi.omit({ sira: true });

// Ürünün bir özellikteki değeri: özellik adıyla; liste türünde seçeneğin adı. Türüne uyması
// katalogBaslangicSemasi'nda, özellik tanımı bilinince denetlenir (servisin şemalarıyla).
const ozellikDegeri = z.strictObject({
  ozellik: ozellikGirdisi.shape.ad,
  deger: z.union([z.string(), z.number(), z.boolean()], { error: "ozellik-deger-gecersiz" }),
});

// Seçenek ve değerleri, sırası dosyadaki sıradır.
const secenek = secenekGirdisi.omit({ sira: true });

// Birleşim: her seçenekten bir değer, seçeneklerin sırasıyla; birimin alanları panelin birleşim
// girdisinden. Fiyat ve stok basit üründeki gibidir.
const birlesim = birlesimGirdisi.omit({ degerler: true, gorsel: true, sira: true }).extend({
  degerler: z.array(secenekGirdisi.shape.ad).min(1).max(varyantSinirlari.secenek),
  gorsel: katalogGorselAdi.optional(),
  fiyat: fiyatGirdisi.optional(),
  stok: z.int().min(0).max(enCokStok).optional(),
});

const urun = urunGirdisi
  .omit({
    adresAdi: true,
    vergiSinifi: true,
    kategoriler: true,
    etiketler: true,
    marka: true,
    ilgiliUrunler: true,
    ozellikler: true,
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
    ozellikler: z.array(ozellikDegeri).max(ozellikSinirlari.ozellik).default([]),
    secenekler: z.array(secenek).max(varyantSinirlari.secenek).default([]),
    birlesimler: z.array(birlesim).max(varyantSinirlari.birlesim).default([]),
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
    ozellikler: z.array(ozellik).max(ozellikSinirlari.ozellik).default([]),
    urunler: z.array(urun).max(1000).default([]),
  })
  .superRefine((katalog, ctx) => {
    const kategoriler = tekrarlariBul(katalog.kategoriler, "kategoriler", ctx);
    const markalar = tekrarlariBul(katalog.markalar, "markalar", ctx);
    const etiketler = tekrarlariBul(katalog.etiketler, "etiketler", ctx);
    const urunler = tekrarlariBul(katalog.urunler, "urunler", ctx);
    const ozellikler = new Map<string, (typeof katalog.ozellikler)[number]>();
    katalog.ozellikler.forEach((tanim, sira) => {
      if (ozellikler.has(tanim.ad)) {
        ctx.addIssue({
          code: "custom",
          message: hata("ozellik-ad-tekrar"),
          path: ["ozellikler", sira, "ad"],
        });
      }
      ozellikler.set(tanim.ad, tanim);
      // Servisin alanlar arası kuralları (ozellikServisi.ekle ile aynı): birim yalnız sayıda, seçenek
      // yalnız listede.
      const sorunlar = ozellikAlanKurallari({ tur: tanim.tur, birim: tanim.birim ?? null });
      if ((tanim.secenekler?.length ?? 0) > 0 && tanim.tur !== "liste") {
        sorunlar.push({ alan: "secenekler", kod: "secenek-yalniz-liste" });
      }
      for (const sorun of sorunlar) {
        ctx.addIssue({
          code: "custom",
          message: sorun.kod,
          path: ["ozellikler", sira, sorun.alan],
        });
      }
    });
    katalog.urunler.forEach((oge, sira) => {
      const yer = (alan: string, ...ek: (string | number)[]) => ["urunler", sira, alan, ...ek];
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
      ozellikDegerleriniDenetle(oge.ozellikler, ozellikler, (kod, ...ek) =>
        ctx.addIssue({ code: "custom", message: hata(kod), path: yer("ozellikler", ...ek) }),
      );
      varyantlariDenetle(oge, gorseller, (kod, alan, ...ek) =>
        ctx.addIssue({ code: "custom", message: hata(kod), path: yer(alan, ...ek) }),
      );
    });
  });

type KatalogUrunu = z.output<typeof urun>;
type Bildir = (kod: KatalogBaslangicHatasi, alan: string, ...ek: (string | number)[]) => void;

// Ürünün özellik değerleri: özellik dosyada tanımlı, her özellikte bir değer, değer türüne uygun
// (servisin değer şemasıyla), liste değeri özelliğin seçeneklerinden biri.
const ozellikDegerleriniDenetle = (
  degerler: KatalogUrunu["ozellikler"],
  tanimlar: Map<string, z.output<typeof ozellik>>,
  bildir: (kod: KatalogBaslangicHatasi, ...yer: number[]) => void,
) => {
  const gorulen = new Set<string>();
  degerler.forEach(({ ozellik: ad, deger }, i) => {
    if (gorulen.has(ad)) bildir("ozellik-tekrar", i);
    gorulen.add(ad);
    const tanim = tanimlar.get(ad);
    if (tanim === undefined) {
      bildir("ozellik-tanimsiz", i);
      return;
    }
    if (tanim.tur === "liste") {
      if (typeof deger !== "string" || !(tanim.secenekler ?? []).includes(deger)) {
        bildir("ozellik-secenek-gecersiz", i);
      }
      return;
    }
    if (!degerSemalari[tanim.tur].safeParse(deger).success) bildir("ozellik-deger-gecersiz", i);
  });
};

// Seçenekli ürünün birim bilgileri birleşimlerdedir (dosya başındaki not).
const varyantliUrundeYazilmaz = ["fiyat", "stok", ...birimAlanAdlari] as const;

const varyantlariDenetle = (oge: KatalogUrunu, gorseller: Set<string>, bildir: Bildir) => {
  if (oge.secenekler.length === 0) {
    if (oge.birlesimler.length > 0) bildir("seceneksiz-birlesim", "birlesimler");
    return;
  }
  if (oge.birlesimler.length === 0) bildir("birlesimsiz-secenek", "birlesimler");
  for (const alan of varyantliUrundeYazilmaz) {
    if (oge[alan] !== undefined) bildir("varyant-birim-alani", alan);
  }
  const anahtarlar = new Set<string>();
  oge.birlesimler.forEach((b, i) => {
    const uygun =
      b.degerler.length === oge.secenekler.length &&
      b.degerler.every((deger, s) => oge.secenekler[s]?.degerler.includes(deger));
    if (!uygun) bildir("birlesim-gecersiz", "birlesimler", i, "degerler");
    const anahtar = JSON.stringify(b.degerler);
    if (anahtarlar.has(anahtar)) bildir("birlesim-tekrar", "birlesimler", i, "degerler");
    anahtarlar.add(anahtar);
    if (b.gorsel !== undefined && !gorseller.has(b.gorsel)) {
      bildir("birlesim-gorsel-tanimsiz", "birlesimler", i, "gorsel");
    }
    if (!oge.stokTakibi && b.stok !== undefined) {
      bildir("takipsiz-stok", "birlesimler", i, "stok");
    }
  });
};
export type KatalogBaslangici = z.output<typeof katalogBaslangicSemasi>;

export const bosKatalog = (): KatalogBaslangici => ({
  kategoriler: [],
  markalar: [],
  etiketler: [],
  ozellikler: [],
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
    const fiyatiDenetle = (fiyat: z.output<typeof fiyatGirdisi>, onEk: string) => {
      const ana = (alan: "indirimBaslangici" | "indirimBitisi") => {
        const yerel = fiyat[alan];
        if (yerel === null) return null;
        const an = yerelZamandan(yerel, site.saatDilimi);
        if (an === undefined)
          sorunlar.push({ yer: yer(`${onEk}.${alan}`), kod: "indirim-zamani-gecersiz" });
        return an ?? null;
      };
      const indirimBaslangici = ana("indirimBaslangici");
      const indirimBitisi = ana("indirimBitisi");
      for (const sorun of fiyatAlanKurallari({ ...fiyat, indirimBaslangici, indirimBitisi })) {
        sorunlar.push({ yer: yer(`${onEk}.${sorun.alan}`), kod: sorun.kod });
      }
    };
    if (urun.fiyat !== undefined) fiyatiDenetle(urun.fiyat, "fiyat");
    urun.birlesimler.forEach((b, i) => {
      if (b.fiyat !== undefined) fiyatiDenetle(b.fiyat, `birlesimler.${i}.fiyat`);
    });
    return sorunlar;
  });
};
