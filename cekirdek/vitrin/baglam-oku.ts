// Vitrin bağlamını okur (kart 0108, karar 0083): üst ve alt kısım bölümlerinin alan değerleri dışında kullandığı
// veri istek başına bir kez okunur ve bölümlere verilir. Bölüm veritabanına kendisi gitmez.
//
// - Mağaza adı, iletişim bilgileri, adres ve sosyal hesaplar mağaza ayarlarından (tek okuma).
// - Logo logo ucundan: mağaza sahibinin yüklediği, yoksa sitenin ilk logosu; ikisi de yoksa adres yoktur.
// - Menüler yalnız çizilecek bölümlerin seçtikleri, koduyla; menünün görünmeyen öğeleri menü servisinde süzülür.
//   Bağlantıların adresi burada kurulur (cekirdek/vitrin/adresler.ts).
// - Parça görünümleri sitenin geçerli temasından (kart 0109): kayıtlı tema kullanılamıyorsa başlangıç teması.
// - Bölümlerin seçtiği kategoriler (silinmemişler) ve bölümlerin ve kategorilerin görselleri, vitrin görseli
//   ucunun adresleriyle (kart 0110). Yer tutucuların değerleri mağaza ayarlarından.
// - Ödeme işaretleri sitede açık ödeme yöntemlerinden gelir; ödeme modülü yazılana kadar yoktur.
import { and, inArray, isNull } from "drizzle-orm";
import type { Site } from "../ayar-semasi/site-klasoru";
import { ilAdi, ilceAdi } from "../bolgeler/bolgeler";
import { altyapiAdi } from "../kayitlar/altyapi";
import { type GorselBoyutu, gorselBoyutAdlari } from "../kayitlar/gorsel";
import { yazilanIslevler } from "../kayitlar/islevler";
import { sosyalHesapAdresleri } from "../kayitlar/sosyal-siteler";
import type { YerTutucu } from "../kayitlar/yer-tutucular";
import { siteninBicimleyicisi } from "../metinler/site-metni";
import { type GorselBoyutDosyasi, gorselBoyutlariniOku } from "../moduller/dosya/servis";
import { vitrinGorseliAdresi } from "../moduller/duzen/gorsel";
import { kategoriler } from "../moduller/kategori/model";
import { logoUcuYolu, magazaLogosu } from "../moduller/magaza-ayarlari/logo";
import { siteninMagazaAyarlari } from "../moduller/magaza-ayarlari/servis";
import { type MenuDali, type VitrinHedefi, vitrinMenusu } from "../moduller/menu/servis";
import { temaServisi } from "../moduller/tema/servis";
import type { Veritabani } from "../veritabani/baglanti";
import { kimlikMi } from "../veritabani/turler";
import { kayitAdresleri } from "./adresler";
import type {
  BaglamGorseli,
  BaglamKategorisi,
  BaglamMenuDali,
  VitrinBaglami,
} from "./bolum-kutuphanesi/baglam";
import type { BolumKutuphanesi, BolumOrnegi } from "./bolum-kutuphanesi/duzen";
import { bolumBaglari } from "./bolum-kutuphanesi/tarif";

const hedefAdresi = (hedef: VitrinHedefi): { adres?: string; yeniSekme: boolean } => {
  switch (hedef.tur) {
    case "kategori":
    case "marka":
    case "urun":
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
  tur: "menu" | "kategori" | "gorsel",
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
  const [ayarlar, logo, menuler, tema, kategoriListesi] = await Promise.all([
    siteninMagazaAyarlari(vt, site),
    magazaLogosu(vt, { site }),
    Promise.all(kodlar.map(async (kod) => [kod, await vitrinMenusu(vt, kod)] as const)),
    temaServisi(() => site).gecerliTema(vt),
    kategorileriOku(vt, bolumlerinBaglari(bolumler, kutuphane, "kategori")),
  ]);
  // Bölümlerin ve seçtikleri kategorilerin görselleri tek okumayla (silinmiş görsel yok).
  const gorselKimlikleri = [
    ...new Set([
      ...bolumlerinBaglari(bolumler, kutuphane, "gorsel"),
      ...Object.values(kategoriListesi).flatMap((kategori) =>
        kategori.gorsel === undefined ? [] : [kategori.gorsel],
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
  const yerTutucuDegerleri: Record<YerTutucu, string> = {
    kargoyaVermeSuresi: bicim.sayi(ayarlar.kargoyaVermeSuresi),
  };
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
    ...(logo === undefined ? {} : { logoAdresi: `${logoUcuYolu}?s=${logo.etiket.slice(0, 16)}` }),
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
    gorseller,
    kategoriler: kategoriListesi,
    yerTutucular: yerTutucuDegerleri,
    parcaGorunumleri: tema.tema.tanim.gorunumler,
    islevler: yazilanIslevler,
    sayilar: {},
    yil: bicim.yil(an),
    ...(site.ayarlar.vitrindeAltyapiAdi ? { altyapiAdi } : {}),
  };
};
