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
import { kimlikSemasi } from "../../veritabani/kimlik";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik-bicimi";

export type SuzgecTanimi = {
  // Adresteki parametrenin adı.
  kod: string;
  // Sekme: tek değer, sekme şeridinde sayılarıyla ("Tümü" seçimsizdir). Seçenekler: birden çok değer, açılır
  // menüde onay öğeleriyle; seçilenler şeritte kaldırılabilir. Kayıt (kart 0262): seçenekleri sitenin kayıtlarıdır
  // (kategori, marka), sunucu sayfayla birlikte verir; adreste kimlikle durur (küçük harfe çevrilir), tanım
  // seçenek taşımaz. Kimlik olmayan değer yok sayılır; olmayan ya da silinmiş kaydı servis eşleştirmez.
  tur: "sekme" | "secenekler" | "kayit";
  secenekler: readonly string[];
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
export const listeDurumunuOku = (tanim: ListeTanimi, sorgu: Sorgu): ListeDurumu => {
  const oku = (ad: string) => (Object.hasOwn(sorgu, ad) ? (ilkDeger(sorgu[ad]) ?? "").trim() : "");
  const suzgecler: Record<string, string[]> = {};
  for (const suzgec of tanim.suzgecler) {
    const istenen = oku(suzgec.kod).split(",");
    const secilen = gecerliDegerler(suzgec, istenen);
    if (secilen.length > 0) {
      suzgecler[suzgec.kod] = suzgec.tur === "sekme" ? secilen.slice(0, 1) : secilen;
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

// Süzgecin değerlerinden tanınanlar, tanımın sırasıyla (kayıt süzgecinde verilen sırayla, tekrarsız).
const gecerliDegerler = (suzgec: SuzgecTanimi, istenen: readonly string[]): string[] =>
  suzgec.tur === "kayit"
    ? [...new Set(istenen.filter(kimlikMi).map(kimligiDuzelt))]
    : suzgec.secenekler.filter((secenek) => istenen.includes(secenek));

// Listenin sorgusu: adres ve liste ucu için. "ara" yalnız verilirse yazılır (adreste olmayan aramada uç sorgusu).
export const listeSorgusu = (tanim: ListeTanimi, durum: ListeDurumu): URLSearchParams => {
  const sorgu = new URLSearchParams();
  for (const suzgec of tanim.suzgecler) {
    const secilen = gecerliDegerler(suzgec, durum.suzgecler[suzgec.kod] ?? []);
    if (secilen.length > 0) sorgu.set(suzgec.kod, secilen.join(","));
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

// Durumun varsayılandan farkı var mı: süzgeç ya da arama seçiliyse liste "sonuçsuz", değilse "boş" hâldedir.
export const suzgecliMi = (durum: ListeDurumu): boolean =>
  durum.ara !== "" || Object.values(durum.suzgecler).some((degerler) => degerler.length > 0);

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
    const deger =
      suzgec.tur === "kayit" ? kimlikSemasi : z.enum(suzgec.secenekler as [string, ...string[]]);
    alanlar[suzgec.kod] = z
      .string()
      .transform((yazi) => yazi.split(","))
      .pipe(suzgec.tur === "sekme" ? z.array(deger).length(1) : z.array(deger).min(1))
      .optional();
  }
  return z.strictObject(alanlar).transform(
    (girdi): ListeDurumu => ({
      suzgecler: Object.fromEntries(
        tanim.suzgecler.flatMap((suzgec) => {
          const degerler = girdi[suzgec.kod] as string[] | undefined;
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
