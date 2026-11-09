// Vitrin bağlamını okur (kart 0108, karar 0083): üst ve alt kısım bölümlerinin alan değerleri dışında kullandığı
// veri istek başına bir kez okunur ve bölümlere verilir. Bölüm veritabanına kendisi gitmez.
//
// - Mağaza adı, iletişim bilgileri, adres ve sosyal hesaplar mağaza ayarlarından (tek okuma).
// - Logo logo ucundan: mağaza sahibinin yüklediği, yoksa sitenin ilk logosu; ikisi de yoksa adres yoktur.
// - Menüler yalnız çizilecek bölümlerin seçtikleri, koduyla; menünün görünmeyen öğeleri menü servisinde süzülür.
//   Bağlantıların adresi burada kurulur (cekirdek/vitrin/adresler.ts).
// - Parça görünümleri sitenin geçerli temasından (kart 0109): kayıtlı tema kullanılamıyorsa başlangıç teması.
// - Ödeme işaretleri sitede açık ödeme yöntemlerinden gelir; ödeme modülü yazılana kadar yoktur.
import type { Site } from "../ayar-semasi/site-klasoru";
import { ilAdi, ilceAdi } from "../bolgeler/bolgeler";
import { altyapiAdi } from "../kayitlar/altyapi";
import { yazilanIslevler } from "../kayitlar/islevler";
import { sosyalHesapAdresleri } from "../kayitlar/sosyal-siteler";
import { siteninBicimleyicisi } from "../metinler/site-metni";
import { logoUcuYolu, magazaLogosu } from "../moduller/magaza-ayarlari/logo";
import { siteninMagazaAyarlari } from "../moduller/magaza-ayarlari/servis";
import { type MenuDali, type VitrinHedefi, vitrinMenusu } from "../moduller/menu/servis";
import { temaServisi } from "../moduller/tema/servis";
import type { Veritabani } from "../veritabani/baglanti";
import { kayitAdresleri } from "./adresler";
import type { BaglamMenuDali, VitrinBaglami } from "./bolum-kutuphanesi/baglam";
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

// Bölümlerin seçtiği menülerin kodları (tarifteki menü alanlarından).
export const bolumlerinMenuKodlari = (
  bolumler: readonly BolumOrnegi[],
  kutuphane: BolumKutuphanesi,
): string[] => {
  const kodlar = new Set<string>();
  for (const bolum of bolumler) {
    const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
    if (tarif === undefined) continue;
    for (const kod of bolumBaglari(tarif, bolum.degerler).menu.keys()) kodlar.add(kod);
  }
  return [...kodlar].toSorted();
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
  const [ayarlar, logo, menuler, tema] = await Promise.all([
    siteninMagazaAyarlari(vt, site),
    magazaLogosu(vt, { site }),
    Promise.all(kodlar.map(async (kod) => [kod, await vitrinMenusu(vt, kod)] as const)),
    temaServisi(() => site).gecerliTema(vt),
  ]);
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
    parcaGorunumleri: tema.tema.tanim.gorunumler,
    islevler: yazilanIslevler,
    sayilar: {},
    yil: siteninBicimleyicisi(site.ayarlar).yil(an),
    ...(site.ayarlar.vitrindeAltyapiAdi ? { altyapiAdi } : {}),
  };
};
