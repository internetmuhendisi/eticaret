// Panel listelerinin ortak tanımı (kart 0258, .claude/rules/liste-motoru.md). Bir listenin süzgeçleri, araması,
// sıralamaları, sayfası ve toplu işlemleri tek tanımda yazılır; sayfa (sunucu), liste ekranı (tarayıcı) ve liste
// ucu aynı tanımdan okur. Bu dosya sunucuda ve tarayıcıda çalışır: tarayıcıya gitmeyecek bir şey içe aktarmaz.
//
// Adres: süzgeçler kendi koduyla (çok değerli süzgeç virgülle: ?odeme=havale,kart; kapının GET okuması tekrarlanan
// parametreyi taşımaz), aranan metin "ara", sıralama "sirala", sayfa "sayfa". Varsayılan sıralama, ilk sayfa ve boş
// arama adrese yazılmaz. Tanınmayan değer yok sayılır (eski ya da elle yazılmış adres listeyi bozmaz); sayfa sınır
// dışıysa sunucu en yakın geçerli sayfayı verir. Aranan metni adrese yazmayan liste (adreste: false; sipariş
// araması kişisel bilgi taşır, karar 0145) aramayı liste ucuna gönderir; adresteki "ara" o listede okunmaz.
import { z } from "zod";
import type { IzinAdi } from "../../kayitlar/izinler";
import { suzgecDegerSiniri } from "../../kayitlar/liste";
import { gunEkle, takvimGunuMu } from "../../metinler/bicimleyici";
import { kimlikSemasi } from "../../veritabani/kimlik";

export type SuzgecTanimi = {
  // Adresteki parametrenin adı.
  kod: string;
  // Sekme: tek değer, sekme şeridinde sayılarıyla ("Tümü" seçimsizdir). Seçenekler: birden çok değer, açılır
  // menüde onay öğeleriyle; seçilenler şeritte kaldırılabilir. Kayıt (kart 0262): seçenekleri sitenin kayıtlarıdır
  // (kategori, marka), sunucu sayfayla birlikte verir; adreste kimlikle durur (küçük harfe çevrilir), tanım
  // seçenek taşımaz. Kimlik olmayan değer yok sayılır; olmayan ya da silinmiş kaydı servis eşleştirmez.
  // Değer (kart 0267): seçenekleri sunucunun verdiği serbest metinlerdir (siparişlerdeki kargo firması adları);
  // adreste her değer ayrıca kodlanır (adında virgül olabilir), en çok degerEnCok harf, en çok kayitSuzgeciSiniri
  // değer. Tarih (kart 0267): tek değer, hazır aralık (seceneklerde, tarihHazirlari'ndan) ya da iki takvim günü
  // ("2026-11-01_2026-11-21", bir ucu boş olabilir); günler sunucuda sitenin saat dilimiyle anlara çevrilir.
  tur: "sekme" | "secenekler" | "kayit" | "deger" | "tarih";
  secenekler: readonly string[];
  // Değer süzgecinde bir değerin en çok harf sayısı.
  degerEnCok?: number;
  // Eski adreslerin değeri (kart 0267): yayınlanmış bir değer kalkınca adresteki eski değer yenisine çevrilir.
  eskiDegerler?: Readonly<Record<string, string>>;
  // Sekmenin varsayılan değeri (kart 0277): verilirse şeritte "Tümü" yoktur, liste bu sekmeyle açılır; değer adrese
  // yazılmaz, süzgeç sayılmaz (boş liste "sonuçsuz" değil "boş" hâldedir).
  varsayilan?: string;
};

// Tarih süzgecinin hazır aralıkları ve kaç günü kapsadıkları (bugün dahil). Adreste kodla durur.
export const tarihHazirlari = { bugun: 1, "son-7-gun": 7, "son-30-gun": 30 } as const;
export type TarihHaziri = keyof typeof tarihHazirlari;

const aralikAyraci = "_";

export type TarihDegeri =
  | { tur: "hazir"; kod: TarihHaziri }
  | { tur: "aralik"; baslangic: string | null; bitis: string | null };

// Tarih süzgecinin adresteki değeri: hazır kod ya da iki gün. Tanınmayan, takvimde olmayan, iki ucu boş ya da
// başlangıcı bitişten sonra olan aralık undefined döner (yok sayılır).
export const tarihDegeriniCoz = (deger: string): TarihDegeri | undefined => {
  if (Object.hasOwn(tarihHazirlari, deger)) return { tur: "hazir", kod: deger as TarihHaziri };
  const parcalar = deger.split(aralikAyraci);
  if (parcalar.length !== 2) return undefined;
  const [baslangic = "", bitis = ""] = parcalar;
  if (baslangic === "" && bitis === "") return undefined;
  if (baslangic !== "" && !takvimGunuMu(baslangic)) return undefined;
  if (bitis !== "" && !takvimGunuMu(bitis)) return undefined;
  if (baslangic !== "" && bitis !== "" && baslangic > bitis) return undefined;
  return { tur: "aralik", baslangic: baslangic || null, bitis: bitis || null };
};

// İki günden adresin değeri (biri boş olabilir).
export const tarihAraligiDegeri = (baslangic: string | null, bitis: string | null): string =>
  `${baslangic ?? ""}${aralikAyraci}${bitis ?? ""}`;

// Süzgecin kapsadığı günler, bugüne göre (sitenin saat dilimindeki takvim günü): iki uç da dahil, boş uç sınırsız.
export const tarihSuzgecininGunleri = (
  deger: TarihDegeri,
  bugun: string,
): { baslangic: string | null; bitis: string | null } =>
  deger.tur === "hazir"
    ? { baslangic: gunEkle(bugun, 1 - tarihHazirlari[deger.kod]), bitis: bugun }
    : { baslangic: deger.baslangic, bitis: deger.bitis };

// Değer süzgecinin adresteki bir değeri: kodlanmış metin. Çözülemeyen yazılış yok sayılır.
const degeriCoz = (yazi: string): string | undefined => {
  try {
    return decodeURIComponent(yazi).trim();
  } catch {
    return undefined;
  }
};

// Tarih süzgecinde adreste yazılı günler (iki günlü aralığın dolu uçları): sayfa onları sitenin biçimiyle yazıp
// şeride verir (gunYazilari, kart 0267). Hazır aralıkta gün yoktur.
export const tarihSuzgecininAyrikGunleri = (durum: ListeDurumu, kod: string): string[] => {
  const deger = durum.suzgecler[kod]?.[0];
  const cozulen = deger === undefined ? undefined : tarihDegeriniCoz(deger);
  return cozulen?.tur === "aralik"
    ? [cozulen.baslangic, cozulen.bitis].filter((gun) => gun !== null)
    : [];
};

export type ListeTanimi = {
  // Toplu işlemin ve testlerin adı.
  kod: string;
  // Panel sayfasının adresi (/yonetim/...).
  adres: string;
  suzgecler: readonly SuzgecTanimi[];
  arama: null | { enCok: number; adreste: boolean };
  // İlki varsayılandır.
  siralamalar: readonly [string, ...string[]];
  // Sütun başlığından sıralanabilen sütunlar: sütunun azalan ve artan sıralaması.
  siralanabilirSutunlar: Readonly<Record<string, { azalan: string; artan: string }>>;
  // Sayfa sayfa mı okunur: sayfasız liste kendi sınırı kadar satırı tek sayfada gösterir, sayfa adresi yok sayılır.
  sayfali: boolean;
  // Satır seçimiyle yapılan işlemler; her biri kendi izniyle (izni olmayana görünmez, uç yine denetler).
  topluIslemler: readonly { kod: string; izin: IzinAdi }[];
};

export type ListeDurumu = {
  suzgecler: Record<string, string[]>;
  ara: string;
  siralama: string;
  sayfa: number;
};

type Sorgu = Record<string, string | string[] | undefined>;

const ilkDeger = (deger: string | string[] | undefined): string | undefined =>
  Array.isArray(deger) ? deger[0] : deger;

// Adresin sorgusundan listenin durumu. Kalıtılmış adlar (constructor, __proto__) okunmaz: sorgu nesnesinin kendi
// alanları okunur.
// Adresin "?" sonrasından sayfanın okuduğu biçim: aynı adın birden çok değeri dizi olur (uçlar listenin adresini
// alınca: Excel dışa aktarması, siparişlerin dışa aktarması).
export const sorgudanDegerler = (sorgu: string): Sorgu => {
  // Kalıtımsız nesne: "__proto__" adı da düz alan olur.
  const okunan: Record<string, string | string[]> = Object.create(null);
  for (const [ad, deger] of new URLSearchParams(sorgu)) {
    const onceki = okunan[ad];
    okunan[ad] =
      onceki === undefined ? deger : [...(Array.isArray(onceki) ? onceki : [onceki]), deger];
  }
  return okunan;
};

export const listeDurumunuOku = (tanim: ListeTanimi, sorgu: Sorgu): ListeDurumu => {
  const oku = (ad: string) => (Object.hasOwn(sorgu, ad) ? (ilkDeger(sorgu[ad]) ?? "").trim() : "");
  const suzgecler: Record<string, string[]> = {};
  for (const suzgec of tanim.suzgecler) {
    const istenen = oku(suzgec.kod)
      .split(",")
      .flatMap((deger) => {
        if (suzgec.tur === "deger") {
          const cozulen = degeriCoz(deger);
          return cozulen === undefined ? [] : [cozulen];
        }
        return [suzgec.eskiDegerler?.[deger] ?? deger];
      });
    const secilen = gecerliDegerler(suzgec, istenen);
    if (secilen.length > 0) {
      suzgecler[suzgec.kod] =
        suzgec.tur === "sekme" || suzgec.tur === "tarih" ? secilen.slice(0, 1) : secilen;
    } else if (suzgec.varsayilan !== undefined) {
      suzgecler[suzgec.kod] = [suzgec.varsayilan];
    }
  }
  const sayfa = oku("sayfa");
  const siralama = oku("sirala");
  return {
    suzgecler,
    ara:
      tanim.arama === null || !tanim.arama.adreste
        ? ""
        : Array.from(oku("ara")).slice(0, tanim.arama.enCok).join(""),
    siralama: tanim.siralamalar.includes(siralama) ? siralama : tanim.siralamalar[0],
    sayfa: tanim.sayfali && /^\d{1,5}$/.test(sayfa) ? Math.max(1, Number(sayfa)) : 1,
  };
};

// Kayıt ve değer süzgecinde en çok bu kadar değer (cekirdek/kayitlar/liste.ts).
export const kayitSuzgeciSiniri = suzgecDegerSiniri;

// Süzgecin değerlerinden tanınanlar, tanımın sırasıyla (kayıt süzgecinde verilen sırayla, tekrarsız, sınıra kadar).
// Kayıt değeri liste ucunun şemasıyla aynı kuralla denetlenir (kimlikSemasi): sayfa ile uç ayrışmasın.
const gecerliDegerler = (suzgec: SuzgecTanimi, istenen: readonly string[]): string[] => {
  if (suzgec.tur === "kayit") {
    return [
      ...new Set(
        istenen.flatMap((deger) => {
          const sonuc = kimlikSemasi.safeParse(deger);
          return sonuc.success ? [sonuc.data] : [];
        }),
      ),
    ].slice(0, kayitSuzgeciSiniri);
  }
  if (suzgec.tur === "deger") {
    const enCok = suzgec.degerEnCok ?? 0;
    return [
      ...new Set(istenen.filter((deger) => deger !== "" && Array.from(deger).length <= enCok)),
    ].slice(0, kayitSuzgeciSiniri);
  }
  if (suzgec.tur === "tarih") {
    return istenen.filter((deger) => tarihSuzgeciDegeriMi(suzgec, deger)).slice(0, 1);
  }
  return suzgec.secenekler.filter((secenek) => istenen.includes(secenek));
};

// Tarih süzgecinin değeri geçerli mi: tanımın hazırlarından biri ya da geçerli bir aralık.
const tarihSuzgeciDegeriMi = (suzgec: SuzgecTanimi, deger: string): boolean => {
  const cozulen = tarihDegeriniCoz(deger);
  return (
    cozulen !== undefined && (cozulen.tur === "aralik" || suzgec.secenekler.includes(cozulen.kod))
  );
};

// Listenin sorgusu: adres ve liste ucu için. "ara" yalnız verilirse yazılır (adreste olmayan aramada uç sorgusu).
export const listeSorgusu = (tanim: ListeTanimi, durum: ListeDurumu): URLSearchParams => {
  const sorgu = new URLSearchParams();
  for (const suzgec of tanim.suzgecler) {
    const secilen = gecerliDegerler(suzgec, durum.suzgecler[suzgec.kod] ?? []);
    if (secilen.length === 1 && secilen[0] === suzgec.varsayilan) continue;
    if (secilen.length > 0) {
      sorgu.set(
        suzgec.kod,
        (suzgec.tur === "deger" ? secilen.map(encodeURIComponent) : secilen).join(","),
      );
    }
  }
  if (durum.ara !== "") sorgu.set("ara", durum.ara);
  if (durum.siralama !== tanim.siralamalar[0]) sorgu.set("sirala", durum.siralama);
  if (durum.sayfa > 1) sorgu.set("sayfa", String(durum.sayfa));
  return sorgu;
};

// Durumu değiştiren adres. Süzgeç, arama ya da sıralama değişince ilk sayfaya dönülür; sayfa yalnız açıkça
// verilince korunur. Adreste olmayan arama adrese yazılmaz.
export const listeAdresi = (
  tanim: ListeTanimi,
  durum: ListeDurumu,
  degisiklik: Partial<ListeDurumu> = {},
): string => {
  const yeni: ListeDurumu = {
    ...durum,
    ...degisiklik,
    sayfa: degisiklik.sayfa ?? 1,
  };
  if (tanim.arama === null || !tanim.arama.adreste) yeni.ara = "";
  const yazi = listeSorgusu(tanim, yeni).toString();
  return yazi === "" ? tanim.adres : `${tanim.adres}?${yazi}`;
};

// Durumun varsayılandan farkı var mı: süzgeç ya da arama seçiliyse liste "sonuçsuz", değilse "boş" hâldedir. Sekmenin
// varsayılan değeri süzgeç sayılmaz.
export const suzgecliMi = (durum: ListeDurumu, tanim?: ListeTanimi): boolean =>
  durum.ara !== "" ||
  Object.entries(durum.suzgecler).some(([kod, degerler]) => {
    const varsayilan = tanim?.suzgecler.find((suzgec) => suzgec.kod === kod)?.varsayilan;
    return degerler.length > 0 && !(degerler.length === 1 && degerler[0] === varsayilan);
  });

// Liste ucunun girdisi (GET): süzgeçler virgülle, aranan metin, sıralama ve sayfa. Uç tanınmayan süzgeç değerini
// reddeder (ekran yalnız tanımdakileri gönderir); sayfanın üst sınırı yoktur, servis son sayfaya çeker.
export const listeUcuSemasi = (tanim: ListeTanimi) => {
  const alanlar: Record<string, z.ZodType> = {
    sirala: z.enum(tanim.siralamalar).default(tanim.siralamalar[0]),
    sayfa: z.coerce.number().int().min(1).max(10_000).default(1),
  };
  if (tanim.arama !== null) {
    alanlar["ara"] = z.string().trim().max(tanim.arama.enCok).default("");
  }
  for (const suzgec of tanim.suzgecler) {
    if (suzgec.tur === "tarih") {
      // Tek değer: hazır kod ya da geçerli aralık (tarihDegeriniCoz).
      alanlar[suzgec.kod] = z
        .string()
        .refine((yazi) => tarihSuzgeciDegeriMi(suzgec, yazi))
        .transform((yazi) => [yazi])
        .optional();
      continue;
    }
    if (suzgec.tur === "deger") {
      // Her değer kodlanmış gelir (listeSorgusu); çözülemeyen, boş ya da uzun değer reddedilir.
      alanlar[suzgec.kod] = z
        .string()
        .transform((yazi) => yazi.split(",").map((parca) => degeriCoz(parca) ?? ""))
        .pipe(
          z
            .array(
              z
                .string()
                .min(1)
                .refine((deger) => Array.from(deger).length <= (suzgec.degerEnCok ?? 0)),
            )
            .min(1)
            .max(kayitSuzgeciSiniri),
        )
        .optional();
      continue;
    }
    const deger =
      suzgec.tur === "kayit" ? kimlikSemasi : z.enum(suzgec.secenekler as [string, ...string[]]);
    alanlar[suzgec.kod] = z
      .string()
      .transform((yazi) => yazi.split(","))
      .pipe(
        suzgec.tur === "sekme"
          ? z.array(deger).length(1)
          : z
              .array(deger)
              .min(1)
              .max(suzgec.tur === "kayit" ? kayitSuzgeciSiniri : 1000),
      )
      .optional();
  }
  return z.strictObject(alanlar).transform(
    (girdi): ListeDurumu => ({
      suzgecler: Object.fromEntries(
        tanim.suzgecler.flatMap((suzgec) => {
          const degerler =
            (girdi[suzgec.kod] as string[] | undefined) ??
            (suzgec.varsayilan === undefined ? undefined : [suzgec.varsayilan]);
          return degerler === undefined ? [] : [[suzgec.kod, [...new Set(degerler)]]];
        }),
      ),
      ara: (girdi["ara"] as string | undefined) ?? "",
      siralama: girdi["sirala"] as string,
      sayfa: girdi["sayfa"] as number,
    }),
  );
};

// Listenin bir sayfası: satırlar (sunucuda biçimlenmiş, tarayıcıya gidebilir), toplam, geçerli sayfa (sınır dışı
// istenen sayfa en yakın geçerli sayfaya çekilir), sayfa sayısı ve sayfa başına satır. Sekme süzgecinin her
// değerinin sayısı "sekmeSayilari"ndadır ("" bütün kayıtlar); sayılar öteki süzgeçlere uyar, sekmeye uymaz.
export type ListeVerisi<Satir> = {
  satirlar: Satir[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
  sayfaBoyu: number;
  sekmeSayilari: Record<string, number>;
};
