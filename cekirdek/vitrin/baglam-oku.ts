// Vitrin bağlamını okur (kart 0108, karar 0083): üst ve alt kısım bölümlerinin alan değerleri dışında kullandığı
// veri istek başına bir kez okunur ve bölümlere verilir. Bölüm veritabanına kendisi gitmez.
//
// - Mağaza adı, iletişim bilgileri, adres ve sosyal hesaplar mağaza ayarlarından (tek okuma).
// - Logo logo ucundan: mağaza sahibinin yüklediği, yoksa sitenin ilk logosu; ikisi de yoksa adres yoktur.
// - Menüler yalnız çizilecek bölümlerin seçtikleri, koduyla; menünün görünmeyen öğeleri menü servisinde süzülür.
//   Bağlantıların adresi burada kurulur (cekirdek/vitrin/adresler.ts).
// - Parça görünümleri sitenin geçerli temasından (kart 0109): kayıtlı tema kullanılamıyorsa başlangıç teması;
//   mağaza sahibinin filtre yeri seçimi temanınkinin üstüne yazılır (parcaGorunumleriniKur, kart 0148).
// - Bölümlerin seçtiği kategoriler (silinmemişler) ve bölümlerin ve kategorilerin görselleri, vitrin görseli
//   ucunun adresleriyle (kart 0110). Yer tutucuların değerleri mağaza ayarlarından.
// - Bölümlerin seçtiği markalar (silinmemişler) ve logoları; ürün bölümlerinin kaynaklarının ürün kartları
//   (kart 0111, cekirdek/vitrin/urun-kaynagi.ts). Ürün bölümü yoksa ürün sorgusu atılmaz.
// - Ödeme işaretleri sitede açık ödeme yöntemlerinden gelir; ödeme modülü yazılana kadar yoktur.
import { and, inArray, isNull } from "drizzle-orm";
import type { Site } from "../ayar-semasi/site-klasoru";
import { ilAdi, ilceAdi } from "../bolgeler/bolgeler";
import { altyapiAdi } from "../kayitlar/altyapi";
import { type GorselBoyutu, gorselBoyutAdlari } from "../kayitlar/gorsel";
import { yazilanIslevler } from "../kayitlar/islevler";
import { sosyalHesapAdresleri } from "../kayitlar/sosyal-siteler";
import type { YerTutucu } from "../kayitlar/yer-tutucular";
import { takvimGunu } from "../metinler/bicimleyici";
import { siteninBicimleyicisi } from "../metinler/site-metni";
import { type GorselBoyutDosyasi, gorselBoyutlariniOku } from "../moduller/dosya/servis";
import { vitrinGorseliAdresi } from "../moduller/duzen/gorsel";
import { type VitrinBlogKarti, vitrinBlogYazilari } from "../moduller/icerik/vitrin";
import { kategoriler } from "../moduller/kategori/model";
import { logonunYolu, magazaLogosu } from "../moduller/magaza-ayarlari/logo";
import { siteninMagazaAyarlari } from "../moduller/magaza-ayarlari/servis";
import { markalar } from "../moduller/marka/model";
import {
  kategoriMenuleriniSec,
  type MenuDali,
  type VitrinHedefi,
  vitrinMenusu,
} from "../moduller/menu/servis";
import { anaSayfaYorumlari } from "../moduller/yorum/servis";
import { parcaGorunumleriniKur } from "../temalar/ayarlar";
import type { Veritabani } from "../veritabani/baglanti";
import { kimligiDuzelt, kimlikMi } from "../veritabani/kimlik";
import { kayitAdresleri } from "./adresler";
import type {
  BaglamGorseli,
  BaglamKategorisi,
  BaglamMarkasi,
  BaglamMenuDali,
  VitrinBaglami,
} from "./bolum-kutuphanesi/baglam";
import type { BolumKutuphanesi, BolumOrnegi } from "./bolum-kutuphanesi/duzen";
import {
  type BaglamBlogYazisi,
  type BaglamYorumu,
  blogKaynagiAnahtari,
  yorumKaynagiAnahtari,
  yorumKaynakTurleri,
} from "./bolum-kutuphanesi/islev-verisi";
import { bolumBaglari, bolumunUrunKaynaklari } from "./bolum-kutuphanesi/tarif";
import type { UrunKaynagi } from "./bolum-kutuphanesi/urun-kaynagi";
import { blogAdetleri } from "./bolumler/blog-yazilari/tarif";
import { yorumAdetleri } from "./bolumler/musteri-yorumlari/tarif";
import { vitrinTemasi } from "./tema-secimi";
import { kaynaklarinUrunleri } from "./urun-kaynagi";

const hedefAdresi = (hedef: VitrinHedefi): { adres?: string; yeniSekme: boolean } => {
  switch (hedef.tur) {
    case "kategori":
    case "marka":
    case "urun":
    case "sayfa":
    case "blog-yazisi":
      return { adres: kayitAdresleri[hedef.tur](hedef.adresAdi), yeniSekme: false };
    case "adres":
      return { adres: hedef.adres, yeniSekme: hedef.yeniSekme };
    case "baslik":
      return { yeniSekme: false };
  }
};

export const menuDallari = (dallar: readonly MenuDali[]): BaglamMenuDali[] =>
  dallar.map((dal) => ({
    kimlik: dal.kimlik,
    metin: dal.metin,
    ...hedefAdresi(dal.hedef),
    altlar: menuDallari(dal.altlar),
  }));

// Bölümlerin başvurduğu kayıtlar, türüne göre (tarifteki menü, kategori ve görsel alanlarından).
const bolumlerinBaglari = (
  bolumler: readonly BolumOrnegi[],
  kutuphane: BolumKutuphanesi,
  tur: "menu" | "kategori" | "marka" | "gorsel",
): string[] => {
  const kimlikler = new Set<string>();
  for (const bolum of bolumler) {
    const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
    if (tarif === undefined) continue;
    for (const kimlik of bolumBaglari(tarif, bolum.degerler)[tur].keys()) kimlikler.add(kimlik);
  }
  return [...kimlikler].toSorted();
};

// Bölümlerin seçtiği menülerin kodları.
export const bolumlerinMenuKodlari = (
  bolumler: readonly BolumOrnegi[],
  kutuphane: BolumKutuphanesi,
): string[] => bolumlerinBaglari(bolumler, kutuphane, "menu");

// Görselin bağlamdaki hâli: kayıttaki boyutların vitrin adresleri, küçükten büyüğe (kart 0110).
export const baglamGorseli = (
  dosya: string,
  boyutlar: Partial<Record<GorselBoyutu, GorselBoyutDosyasi>>,
): BaglamGorseli | undefined => {
  const kaynaklar = gorselBoyutAdlari.flatMap((boyut) => {
    const boyutDosyasi = boyutlar[boyut];
    return boyutDosyasi === undefined
      ? []
      : [{ adres: vitrinGorseliAdresi(dosya, boyut), genislik: boyutDosyasi.genislik }];
  });
  const olcu = boyutlar.orta ?? boyutlar.buyuk ?? boyutlar.kucuk ?? boyutlar.tam;
  if (kaynaklar.length === 0 || olcu === undefined) return undefined;
  return { kaynaklar, genislik: olcu.genislik, yukseklik: olcu.yukseklik };
};

// Bölümlerin seçtiği kategoriler ve görselleri (kart 0110): silinmemiş olanlar, tek sorgu.
const kategorileriOku = async (
  vt: Veritabani,
  kimlikler: string[],
): Promise<Record<string, BaglamKategorisi>> => {
  const gecerli = kimlikler.filter(kimlikMi);
  if (gecerli.length === 0) return {};
  const satirlar = await vt
    .select({
      kimlik: kategoriler.kimlik,
      ad: kategoriler.ad,
      adresAdi: kategoriler.adres_adi,
      gorsel: kategoriler.gorsel_kimligi,
    })
    .from(kategoriler)
    .where(and(inArray(kategoriler.kimlik, gecerli), isNull(kategoriler.silinme_zamani)));
  return Object.fromEntries(
    satirlar.map((satir) => [
      satir.kimlik,
      {
        ad: satir.ad,
        adres: kayitAdresleri.kategori(satir.adresAdi),
        ...(satir.gorsel === null ? {} : { gorsel: satir.gorsel }),
      },
    ]),
  );
};

// Bölümlerin seçtiği markalar ve logoları (kart 0111): silinmemiş olanlar, tek sorgu.
const markalariOku = async (
  vt: Veritabani,
  kimlikler: string[],
): Promise<Record<string, BaglamMarkasi>> => {
  const gecerli = kimlikler.filter(kimlikMi).map(kimligiDuzelt);
  if (gecerli.length === 0) return {};
  const satirlar = await vt
    .select({
      kimlik: markalar.kimlik,
      ad: markalar.ad,
      adresAdi: markalar.adres_adi,
      logo: markalar.logo_kimligi,
    })
    .from(markalar)
    .where(and(inArray(markalar.kimlik, gecerli), isNull(markalar.silinme_zamani)));
  return Object.fromEntries(
    satirlar.map((satir) => [
      satir.kimlik,
      {
        ad: satir.ad,
        adres: kayitAdresleri.marka(satir.adresAdi),
        ...(satir.logo === null ? {} : { logo: satir.logo }),
      },
    ]),
  );
};

// Bölümlerin ürün kaynakları (kart 0111).
const bolumlerinUrunKaynaklari = (
  bolumler: readonly BolumOrnegi[],
  kutuphane: BolumKutuphanesi,
): UrunKaynagi[] =>
  bolumler.flatMap((bolum) => {
    const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
    return tarif === undefined ? [] : bolumunUrunKaynaklari(tarif, bolum.degerler);
  });

// Yorum gösteren bölümlerin verisi (kart 0139, karar 0090): yorum işlevine bağlı bölüm varsa iki kaynağın
// (işaretlenenler, en yeniler) en çok adedi okunur, her adet anahtarı o listenin başıdır. Bölüm yoksa okunmaz.
const yorumKaynaklari = async (
  vt: Veritabani,
  bolumler: readonly BolumOrnegi[],
  kutuphane: BolumKutuphanesi,
  an: Date,
): Promise<Record<string, readonly BaglamYorumu[]>> => {
  const yorumBolumuVar = bolumler.some(
    (bolum) => Object.hasOwn(kutuphane, bolum.tur) && kutuphane[bolum.tur]?.islev === "yorum",
  );
  if (!yorumBolumuVar || !yazilanIslevler.yorum) return {};
  const enCok = Math.max(...Object.values(yorumAdetleri));
  const sonuc: Record<string, readonly BaglamYorumu[]> = {};
  for (const tur of yorumKaynakTurleri) {
    const liste = (
      await anaSayfaYorumlari(vt, { isaretlenenler: tur === "isaretlenenler", adet: enCok, an })
    ).map(({ kimlik, puan, metin, ad }) => ({ kimlik, puan, metin, ad }));
    for (const adet of Object.values(yorumAdetleri)) {
      sonuc[yorumKaynagiAnahtari({ tur, adet })] = liste.slice(0, adet);
    }
  }
  return sonuc;
};

// Blog bölümlerinin yazıları (kart 0272): blog açıkken bölümlerin her kaynağının (son yazılar ya da bir kategori) en
// çok adedi bir kez okunur, her adet anahtarı o listenin başıdır. Bölüm yoksa ya da blog kapalıysa okunmaz.
const blogKaynaklari = async (
  vt: Veritabani,
  bolumler: readonly BolumOrnegi[],
  kutuphane: BolumKutuphanesi,
  blogAcik: boolean,
  an: Date,
): Promise<Record<string, readonly VitrinBlogKarti[]>> => {
  if (!blogAcik || !yazilanIslevler.blog) return {};
  const kategoriler = new Set<string | undefined>();
  for (const bolum of bolumler) {
    if (!Object.hasOwn(kutuphane, bolum.tur) || kutuphane[bolum.tur]?.islev !== "blog") continue;
    const kategori = (bolum.degerler as { kategori?: unknown }).kategori;
    kategoriler.add(typeof kategori === "string" && kategori !== "" ? kategori : undefined);
  }
  const enCok = Math.max(...Object.values(blogAdetleri));
  const sonuc: Record<string, readonly VitrinBlogKarti[]> = {};
  for (const kategori of kategoriler) {
    const { yazilar } = await vitrinBlogYazilari(vt, { kategori, sayfa: 1, boyut: enCok, an });
    for (const adet of Object.values(blogAdetleri)) {
      sonuc[
        blogKaynagiAnahtari(
          kategori === undefined ? { tur: "son", adet } : { tur: "kategori", kategori, adet },
        )
      ] = yazilar.slice(0, adet);
    }
  }
  return sonuc;
};

// Telefonun bağlantısı: yalnız rakam ve baştaki +.
const telefonAdresi = (telefon: string) => `tel:${telefon.replace(/[^\d+]/g, "")}`;

export const vitrinBaglaminiOku = async (
  vt: Veritabani,
  site: Site,
  bolumler: readonly BolumOrnegi[],
  kutuphane: BolumKutuphanesi,
  an: Date = new Date(),
): Promise<VitrinBaglami> => {
  const kodlar = bolumlerinMenuKodlari(bolumler, kutuphane);
  const ayarlarSozu = siteninMagazaAyarlari(vt, site);
  const [
    ayarlar,
    logo,
    menuler,
    kategoriMenuKodlari,
    tema,
    kategoriListesi,
    markaListesi,
    urunler,
    yorumlar,
  ] = await Promise.all([
    ayarlarSozu,
    magazaLogosu(vt, { site }),
    // Blog yazısına bağlı menü öğesi blog açıkken görünür (kart 0273): menüler ayarlarla birlikte okunur.
    ayarlarSozu.then((menuAyarlari) =>
      Promise.all(
        kodlar.map(
          async (kod) =>
            [kod, await vitrinMenusu(vt, kod, { blogAcik: menuAyarlari.blogAcik })] as const,
        ),
      ),
    ),
    kategoriMenuleriniSec(vt, kodlar),
    vitrinTemasi(vt, site),
    kategorileriOku(vt, bolumlerinBaglari(bolumler, kutuphane, "kategori")),
    markalariOku(vt, bolumlerinBaglari(bolumler, kutuphane, "marka")),
    kaynaklarinUrunleri(vt, site, bolumlerinUrunKaynaklari(bolumler, kutuphane), an),
    yorumKaynaklari(vt, bolumler, kutuphane, an),
  ]);
  const blogKartlari = await blogKaynaklari(vt, bolumler, kutuphane, ayarlar.blogAcik, an);
  // Bölümlerin ve seçtikleri kategorilerin görselleri tek okumayla (silinmiş görsel yok).
  const gorselKimlikleri = [
    ...new Set([
      ...bolumlerinBaglari(bolumler, kutuphane, "gorsel"),
      ...Object.values(kategoriListesi).flatMap((kategori) =>
        kategori.gorsel === undefined ? [] : [kategori.gorsel],
      ),
      ...Object.values(markaListesi).flatMap((marka) =>
        marka.logo === undefined ? [] : [marka.logo],
      ),
      ...Object.values(blogKartlari).flatMap((liste) =>
        liste.flatMap((yazi) => (yazi.kapak === null ? [] : [yazi.kapak.dosya])),
      ),
    ]),
  ].filter(kimlikMi);
  const boyutlar = await gorselBoyutlariniOku(vt, gorselKimlikleri);
  const gorseller = Object.fromEntries(
    [...boyutlar].flatMap(([dosya, dosyaninBoyutlari]) => {
      const gorsel = baglamGorseli(dosya, dosyaninBoyutlari);
      return gorsel === undefined ? [] : [[dosya, gorsel] as const];
    }),
  );
  const bicim = siteninBicimleyicisi(site.ayarlar);
  // 0 iş günü "aynı gün" demektir: "0 iş gününde kargoda" yazılmasın diye değer yoktur, madde çizilmez (kart
  // 0110 kontrolü). Mağaza sahibi aynı gün kargoyu metne elle yazar.
  const yerTutucuDegerleri: Partial<Record<YerTutucu, string>> =
    ayarlar.kargoyaVermeSuresi === 0
      ? {}
      : { kargoyaVermeSuresi: bicim.sayi(ayarlar.kargoyaVermeSuresi) };
  const adres = ayarlar.magazaAdresi;
  const bolge =
    adres === undefined
      ? undefined
      : [
          adres.ilce === undefined ? undefined : ilceAdi(adres.ilce),
          adres.il === undefined ? undefined : ilAdi(adres.il),
        ]
          .filter((parca) => parca !== undefined)
          .join(" / ");
  return {
    magazaAdi: ayarlar.magazaAdi ?? site.kimlik.gorunenAd,
    musteriOturumu: site.ayarlar.temaDemosu ? "yok" : "sorulur",
    ...(logo === undefined ? {} : { logoAdresi: logonunYolu(logo) }),
    iletisim: {
      ...(ayarlar.iletisimTelefonu === undefined
        ? {}
        : {
            telefon: {
              metin: ayarlar.iletisimTelefonu,
              adres: telefonAdresi(ayarlar.iletisimTelefonu),
            },
          }),
      ...(ayarlar.iletisimEpostasi === undefined
        ? {}
        : {
            eposta: {
              metin: ayarlar.iletisimEpostasi,
              adres: `mailto:${ayarlar.iletisimEpostasi}`,
            },
          }),
      ...(adres === undefined
        ? {}
        : {
            adres: [
              adres.adres,
              [adres.postaKodu, bolge]
                .filter((parca) => parca !== undefined && parca !== "")
                .join(" "),
            ].filter((satir) => satir !== ""),
          }),
    },
    sosyalHesaplar: ayarlar.sosyalHesaplar.map(({ site: sosyalSite, hesap }) => ({
      site: sosyalSite,
      adres: sosyalHesapAdresleri[sosyalSite](hesap),
    })),
    odemeIsaretleri: [],
    menuler: Object.fromEntries(
      menuler.flatMap(([kod, dallar]) =>
        dallar === undefined ? [] : [[kod, menuDallari(dallar)]],
      ),
    ),
    kategoriMenuleri: kategoriMenuKodlari,
    gorseller,
    kategoriler: kategoriListesi,
    markalar: markaListesi,
    urunler,
    an,
    // Bülten işlevi yazılınca doldurulur (kart 0112, islev-verisi.ts); yorumlar kart 0139, blog kart 0272.
    yorumlar,
    blogYazilari: Object.fromEntries(
      Object.entries(blogKartlari).map(([anahtar, liste]) => [
        anahtar,
        liste.map(
          (yazi): BaglamBlogYazisi => ({
            kimlik: yazi.kimlik,
            baslik: yazi.baslik,
            ...(yazi.ozet === null ? {} : { ozet: yazi.ozet }),
            adres: kayitAdresleri["blog-yazisi"](yazi.adresAdi),
            tarih: {
              yazili: bicim.uzunTarih(yazi.yayinZamani),
              makine: takvimGunu(yazi.yayinZamani, site.ayarlar.saatDilimi),
            },
            ...(yazi.kapak === null || gorseller[yazi.kapak.dosya] === undefined
              ? {}
              : { gorsel: yazi.kapak.dosya }),
          }),
        ),
      ]),
    ),
    yerTutucular: yerTutucuDegerleri,
    parcaGorunumleri: parcaGorunumleriniKur(tema.tema.tanim, tema.ayarlar),
    // Blog yazılmış işlevdir, ama vitrinde mağaza sahibinin ayarıyla açılır (kart 0272).
    islevler: { ...yazilanIslevler, blog: yazilanIslevler.blog && ayarlar.blogAcik },
    sayilar: {},
    yil: bicim.yil(an),
    ...(site.ayarlar.vitrindeAltyapiAdi ? { altyapiAdi } : {}),
  };
};
