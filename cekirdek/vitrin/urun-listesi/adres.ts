// Ürün listesinin adresteki durumu (kart 0136, karar 0102): filtre, sıralama ve sayfa adreste durur; sayfa
// yenilenince ve paylaşılınca aynı sonuç gelir. Saf işlevlerdir: sunucu sayfayı adresten kurar, tarayıcıdaki
// filtre aynı işlevle yeni adresi kurar.
//
// Parametreler (adlar yayından sonra değişmez, paylaşılmış adresler bozulur):
// - en-az, en-cok: müşterinin yazdığı tutar, aynen ("1.000"); sunucu sitenin para biçimiyle okur.
// - marka: markanın adres adı, birden çok.
// - secenek-<seçenek>: seçeneğin değeri, birden çok ("secenek-beden=m").
// - ozellik-<özellik>: özelliğin değeri, birden çok ("ozellik-kumas=pamuk").
// - stok=var: yalnız stoktakiler.
// - ara: aranan metin, yazıldığı gibi (arama sayfası, kart 0137); filtre ve sıralama değişince korunur.
// - sirala: sıralama; sayfanın varsayılanıysa yazılmaz. Sayfanın tanımadığı sıralama ("en-uygun" kategori
//   sayfasında) yok sayılır.
// - sayfa: 1'den büyükse.
// Tanınmayan parametre yok sayılır. Sıralama ve filtre değişince sayfa başa döner.
import { type AramaSiralamasi, listeSiralamalari } from "../../kayitlar/liste";
import { kendiAlani } from "../../moduller/urun/filtre";

export const listeParametreleri = {
  enAz: "en-az",
  enCok: "en-cok",
  marka: "marka",
  ara: "ara",
  secenekOneki: "secenek-",
  ozellikOneki: "ozellik-",
  stok: "stok",
  stokVar: "var",
  sirala: "sirala",
  sayfa: "sayfa",
} as const;

export type ListeDurumu = {
  // Aranan metin (arama sayfası); kırpılmış, boşsa yok.
  arama?: string;
  // Yazıldığı gibi; okunamayan tutar filtreye girmez, ekran hatayı gösterir.
  fiyatYazisi: { enAz?: string; enCok?: string };
  markalar: readonly string[];
  secenekler: Readonly<Record<string, readonly string[]>>;
  ozellikler: Readonly<Record<string, readonly string[]>>;
  stoktakiler: boolean;
  // Verilmemişse sayfanın varsayılanı.
  siralama?: AramaSiralamasi;
  sayfa: number;
};

export type AdresParametreleri = Record<string, string | string[] | undefined>;

const listele = (deger: string | string[] | undefined): string[] =>
  (Array.isArray(deger) ? deger : deger === undefined ? [] : [deger]).filter((d) => d !== "");

const tekrarsiz = (degerler: string[]) => [...new Set(degerler)];

const siralamaMi = (
  deger: string | undefined,
  izinli: readonly AramaSiralamasi[],
): deger is AramaSiralamasi => (izinli as readonly (string | undefined)[]).includes(deger);

// izinli: sayfanın sıralamaları (kategori sayfası listeSiralamalari, arama aramaSiralamalari).
export const adrestenDurum = (
  parametreler: AdresParametreleri,
  izinli: readonly AramaSiralamasi[] = listeSiralamalari,
): ListeDurumu => {
  const p = listeParametreleri;
  const tek = (ad: string) => listele(parametreler[ad])[0];
  const onekli = (onek: string) =>
    Object.fromEntries(
      Object.keys(parametreler)
        .filter((ad) => ad.startsWith(onek) && ad.length > onek.length)
        .toSorted()
        .map((ad) => [ad.slice(onek.length), tekrarsiz(listele(parametreler[ad]))] as const)
        .filter(([, degerler]) => degerler.length > 0),
    );
  const enAz = tek(p.enAz)?.trim();
  const enCok = tek(p.enCok)?.trim();
  const sirala = tek(p.sirala);
  const arama = tek(p.ara)?.trim();
  // Yalnız rakam: "1e3", "0x10" gibi yazılışlar sayıya çevrilmez.
  const sayfaYazisi = tek(p.sayfa);
  const sayfa =
    sayfaYazisi !== undefined && /^\d{1,9}$/.test(sayfaYazisi) ? Number(sayfaYazisi) : 1;
  return {
    ...(arama === undefined || arama === "" ? {} : { arama }),
    fiyatYazisi: {
      ...(enAz === undefined || enAz === "" ? {} : { enAz }),
      ...(enCok === undefined || enCok === "" ? {} : { enCok }),
    },
    markalar: tekrarsiz(listele(parametreler[p.marka])),
    secenekler: onekli(p.secenekOneki),
    ozellikler: onekli(p.ozellikOneki),
    stoktakiler: tek(p.stok) === p.stokVar,
    ...(siralamaMi(sirala, izinli) ? { siralama: sirala } : {}),
    sayfa: Math.max(sayfa, 1),
  };
};

// Durumdan sorgu kısmı ("?marka=a&sayfa=2"); boşsa boş metin. Sıra sabittir: aynı durum aynı adrestir.
export const durumdanSorgu = (durum: ListeDurumu, varsayilanSiralama: AramaSiralamasi): string => {
  const p = listeParametreleri;
  const sorgu = new URLSearchParams();
  if (durum.arama !== undefined) sorgu.append(p.ara, durum.arama);
  if (durum.fiyatYazisi.enAz !== undefined) sorgu.append(p.enAz, durum.fiyatYazisi.enAz);
  if (durum.fiyatYazisi.enCok !== undefined) sorgu.append(p.enCok, durum.fiyatYazisi.enCok);
  for (const marka of durum.markalar) sorgu.append(p.marka, marka);
  for (const [onek, gruplar] of [
    [p.secenekOneki, durum.secenekler],
    [p.ozellikOneki, durum.ozellikler],
  ] as const) {
    for (const [anahtar, degerler] of Object.entries(gruplar).toSorted(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      for (const deger of degerler) sorgu.append(`${onek}${anahtar}`, deger);
    }
  }
  if (durum.stoktakiler) sorgu.append(p.stok, p.stokVar);
  if (durum.siralama !== undefined && durum.siralama !== varsayilanSiralama) {
    sorgu.append(p.sirala, durum.siralama);
  }
  if (durum.sayfa > 1) sorgu.append(p.sayfa, String(durum.sayfa));
  const metni = sorgu.toString();
  return metni === "" ? "" : `?${metni}`;
};

// Filtre ya da sıralama var mı? Varsa sayfa arama motorlarının dizinine girmez (yalnız sayfa numarası serbest).
export const filtreliMi = (durum: ListeDurumu): boolean =>
  durum.fiyatYazisi.enAz !== undefined ||
  durum.fiyatYazisi.enCok !== undefined ||
  durum.markalar.length > 0 ||
  Object.keys(durum.secenekler).length > 0 ||
  Object.keys(durum.ozellikler).length > 0 ||
  durum.stoktakiler ||
  durum.siralama !== undefined;

// Değişiklikler: filtre ya da sıralama değişince sayfa başa döner.
const basa = (durum: ListeDurumu): ListeDurumu => ({ ...durum, sayfa: 1 });

const degistir = (
  gruplar: Readonly<Record<string, readonly string[]>>,
  anahtar: string,
  deger: string,
  secili: boolean,
): Record<string, readonly string[]> => {
  const mevcut = (kendiAlani(gruplar, anahtar) ?? []).filter((d) => d !== deger);
  const yeni = secili ? [...mevcut, deger] : mevcut;
  const { [anahtar]: _, ...digerleri } = gruplar;
  return yeni.length === 0 ? digerleri : { ...digerleri, [anahtar]: yeni };
};

export type ListeDegisikligi =
  | { tur: "marka"; deger: string; secili: boolean }
  | { tur: "secenek" | "ozellik"; anahtar: string; deger: string; secili: boolean }
  | { tur: "stok"; secili: boolean }
  | { tur: "fiyat"; enAz?: string; enCok?: string }
  | { tur: "fiyat-kaldir" }
  | { tur: "sirala"; siralama: AramaSiralamasi }
  | { tur: "temizle" };

export const durumuDegistir = (durum: ListeDurumu, degisiklik: ListeDegisikligi): ListeDurumu => {
  switch (degisiklik.tur) {
    case "marka": {
      const mevcut = durum.markalar.filter((m) => m !== degisiklik.deger);
      return basa({
        ...durum,
        markalar: degisiklik.secili ? [...mevcut, degisiklik.deger] : mevcut,
      });
    }
    case "secenek":
      return basa({
        ...durum,
        secenekler: degistir(
          durum.secenekler,
          degisiklik.anahtar,
          degisiklik.deger,
          degisiklik.secili,
        ),
      });
    case "ozellik":
      return basa({
        ...durum,
        ozellikler: degistir(
          durum.ozellikler,
          degisiklik.anahtar,
          degisiklik.deger,
          degisiklik.secili,
        ),
      });
    case "stok":
      return basa({ ...durum, stoktakiler: degisiklik.secili });
    case "fiyat": {
      const enAz = degisiklik.enAz?.trim();
      const enCok = degisiklik.enCok?.trim();
      return basa({
        ...durum,
        fiyatYazisi: {
          ...(enAz === undefined || enAz === "" ? {} : { enAz }),
          ...(enCok === undefined || enCok === "" ? {} : { enCok }),
        },
      });
    }
    case "fiyat-kaldir":
      return basa({ ...durum, fiyatYazisi: {} });
    case "sirala":
      return basa({ ...durum, siralama: degisiklik.siralama });
    case "temizle":
      return {
        ...(durum.arama === undefined ? {} : { arama: durum.arama }),
        fiyatYazisi: {},
        markalar: [],
        secenekler: {},
        ozellikler: {},
        stoktakiler: false,
        ...(durum.siralama === undefined ? {} : { siralama: durum.siralama }),
        sayfa: 1,
      };
  }
};
