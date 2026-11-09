// Bölüm türü tarifi ve alanlarının şeması (kart 0106, karar 0081).
//
// Vitrinin üst kısmı, ana sayfası ve alt kısmı bölümlerden kurulur. Her bölüm türü kendi tarifini yazar:
// adı, hangi düzen alanlarına konabileceği, mağaza sahibinin doldurduğu alanlar ve her alanın türü, görünüm
// seçenekleri ve bağlı olduğu işlev. Alanların şeması, panelin düzenleme formu (cekirdek/yonetim-paneli/
// bolum-formu.tsx) ve düzen servisi (cekirdek/moduller/duzen/) aynı tariften çıkar: ikinci bir form ya da
// şema tanımı yazılmaz.
//
// Bu dosya düz TypeScript'tir, ekran kodu almaz: site klasörü doğrulaması ve tema şeması da Node ile okur.
// Bölümün ekrandaki görünüşü ayrıdır (gorunumler.tsx).
import { z } from "zod";
import type { RenkAdi } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { Islev } from "../../kayitlar/islevler.ts";
import type { DuzenAlani } from "../../kayitlar/tema.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import {
  kayitDegeriYasakMi,
  kayitMetni,
  kayitMetniHatasi,
} from "../../moduller/degisiklik-kaydi/deger.ts";

// Alanın panelde görünen adı ve boş bırakılıp bırakılamayacağı.
type Ortak = { ad: MetinAnahtari; zorunlu?: boolean };

// Liste dışındaki alan türleri. Liste yalnız bunlardan kurulur, iç içe liste yoktur.
export type TekAlanTarifi =
  // Tek satır metin, en çok enCok harf.
  | (Ortak & { tur: "metin"; enCok: number })
  // Çok satırlı düz metin (HTML değil).
  | (Ortak & { tur: "uzun-metin"; enCok: number })
  // Dosya deposundaki bir görsel (kimliği).
  | (Ortak & { tur: "gorsel" })
  // Sitenin kendi adresi (/ ile başlar) ya da https bağlantısı.
  | (Ortak & { tur: "baglanti" })
  // Bölümde gösterilecek ürünler: bir kategoriden, markadan, etiketten, yeni gelenler, indirimdekiler ya da
  // elle seçilenler.
  | (Ortak & { tur: "urun-kaynagi"; enCokUrun: number })
  | (Ortak & { tur: "kategori" })
  | (Ortak & { tur: "marka" })
  // Sitenin saat diliminde yerel tarih (saatli: tarih ve saat).
  | (Ortak & { tur: "tarih"; saatli: boolean })
  // Temanın renklerinden biri; yalnız tarifin saydığı renkler.
  | (Ortak & { tur: "renk"; renkler: readonly [RenkAdi, ...RenkAdi[]] });

// Liste: aynı alanlardan oluşan öğeler (afişin kareleri, güven şeridinin maddeleri).
export type ListeTarifi = {
  tur: "liste";
  ad: MetinAnahtari;
  // Bir öğenin panelde görünen adı ("Kare 1" gibi sırasıyla yazılır).
  ogeAdi: MetinAnahtari;
  enAz: number;
  enCok: number;
  alanlar: Readonly<Record<string, TekAlanTarifi>>;
};

export type AlanTarifi = TekAlanTarifi | ListeTarifi;
export type AlanTuru = AlanTarifi["tur"];

export type BolumTarifi = {
  // Bölüm türünün kodu: küçük harf, rakam ve tire.
  tur: string;
  ad: MetinAnahtari;
  // Konabileceği düzen alanları.
  duzenAlanlari: readonly [DuzenAlani, ...DuzenAlani[]];
  // Mağaza sahibinin doldurduğu alanlar, formdaki sırasıyla. Alan kodları camelCase'tir.
  alanlar: Readonly<Record<string, AlanTarifi>>;
  // Görünüm seçenekleri; ilki varsayılandır.
  gorunumler: readonly [
    { kod: string; ad: MetinAnahtari },
    ...{ kod: string; ad: MetinAnahtari }[],
  ];
  // Bağlı olduğu işlev (cekirdek/kayitlar/islevler.ts): işlev yokken bölüm vitrinde çizilmez.
  islev?: Islev;
};

// Alan değerlerinin hata kodları. Şemanın kendi hataları (tür, uzunluk) zod kodlarıyla döner.
export const bolumAlanHatalari = [
  "baglanti-gecersiz",
  "denetim-karakteri",
  kayitMetniHatasi,
  "tarih-gecersiz",
  "ayni-urun-iki-kez",
  "baslangicta-kayit-secilemez",
  "kayit-yok",
  "gorsel-gecersiz",
] as const;
export type BolumAlanHatasi = (typeof bolumAlanHatalari)[number];

const kimlikSemasi = z.uuid();

// Bağlantı: sitenin kendi adresi (tek / ile başlar) ya da kullanıcı adı, şifre ve port taşımayan https
// adresi. javascript:, data: ve http: geçmez.
export const baglantiGecerliMi = (adres: string): boolean => {
  if (/\p{Cc}/u.test(adres)) return false;
  if (adres.startsWith("/")) return !adres.startsWith("//") && !/[\s\\]/.test(adres);
  if (!URL.canParse(adres)) return false;
  const url = new URL(adres);
  return url.protocol === "https:" && url.username === "" && url.password === "" && url.port === "";
};

// Takvimde gerçekten olan gün: 31 Şubat geçmez.
const gercekGunMu = (yil: number, ay: number, gun: number) => {
  const tarih = new Date(Date.UTC(yil, ay - 1, gun));
  return (
    tarih.getUTCFullYear() === yil && tarih.getUTCMonth() === ay - 1 && tarih.getUTCDate() === gun
  );
};
export const tarihGecerliMi = (deger: string, saatli: boolean): boolean => {
  const eslesme = saatli
    ? /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(deger)
    : /^(\d{4})-(\d{2})-(\d{2})$/.exec(deger);
  if (eslesme === null) return false;
  return gercekGunMu(Number(eslesme[1]), Number(eslesme[2]), Number(eslesme[3]));
};

// Başlangıç değeri (temanın ya da sitenin başlangıç düzeni) veritabanındaki bir kayda başvuramaz: kayıtların
// kimliği kurulumda üretilir. Bu alanlar başlangıçta boş kalır; adres adıyla bağlanması kart 0114'tedir.
type Kip = { baslangic: boolean };

const baslangictaYok = z.never({ error: "baslangicta-kayit-secilemez" });

const urunKaynagiSemasi = (enCokUrun: number, { baslangic }: Kip) => {
  const adet = z.int().min(1).max(enCokUrun);
  const kayitli = <T extends string, A extends string>(tur: T, alan: A) =>
    z.strictObject({ tur: z.literal(tur), [alan]: kimlikSemasi, adet } as {
      tur: z.ZodLiteral<T>;
      adet: typeof adet;
    } & Record<A, typeof kimlikSemasi>);
  const kayitsizlar = [
    z.strictObject({ tur: z.literal("yeni"), adet }),
    z.strictObject({ tur: z.literal("indirimli"), adet }),
  ] as const;
  if (baslangic) return z.discriminatedUnion("tur", kayitsizlar);
  return z.discriminatedUnion("tur", [
    ...kayitsizlar,
    kayitli("kategori", "kategori"),
    kayitli("marka", "marka"),
    kayitli("etiket", "etiket"),
    z.strictObject({
      tur: z.literal("elle"),
      urunler: z
        .array(kimlikSemasi)
        .min(1)
        .max(enCokUrun)
        .refine((liste) => new Set(liste).size === liste.length, "ayni-urun-iki-kez"),
    }),
  ]);
};

const tekAlanSemasi = (alan: TekAlanTarifi, kip: Kip): z.ZodType => {
  switch (alan.tur) {
    case "metin":
      return kayitMetni(alan.enCok).refine((deger) => !/\p{Cc}/u.test(deger), "denetim-karakteri");
    case "uzun-metin":
      // Satır sonu ve sekme serbest, öteki denetim karakterleri değil.
      return kayitMetni(alan.enCok).refine(
        (deger) => !/[^\P{Cc}\n\r\t]/u.test(deger),
        "denetim-karakteri",
      );
    case "gorsel":
    case "kategori":
    case "marka":
      return kip.baslangic ? baslangictaYok : kimlikSemasi;
    case "baglanti":
      return z.strictObject({
        adres: z
          .string()
          .trim()
          .max(2000)
          .refine(baglantiGecerliMi, "baglanti-gecersiz")
          // Adres değişiklik kaydına girer: kaydın kabul etmediği biçim (https://site/@hesap gibi e-posta
          // kalıbına uyan adres) burada kodla reddedilir, kayıtta beklenmeyen hataya dönmez.
          .refine((adres) => !kayitDegeriYasakMi(adres), kayitMetniHatasi),
        yeniSekme: z.boolean().default(false),
      });
    case "urun-kaynagi":
      return urunKaynagiSemasi(alan.enCokUrun, kip);
    case "tarih":
      return z.string().refine((deger) => tarihGecerliMi(deger, alan.saatli), "tarih-gecersiz");
    case "renk":
      return z.enum(alan.renkler);
  }
};

const alanSemasi = (alan: AlanTarifi, kip: Kip): z.ZodType => {
  if (alan.tur !== "liste") {
    const sema = tekAlanSemasi(alan, kip);
    return alan.zorunlu === true ? sema : sema.optional();
  }
  return (
    z
      .array(
        z.strictObject(
          Object.fromEntries(
            Object.entries(alan.alanlar).map(([kod, alt]) => [kod, alanSemasi(alt, kip)]),
          ),
        ),
      )
      .min(alan.enAz)
      .max(alan.enCok)
      // Verilmeyen liste boştur; en az sınırı yine denetlenir.
      .prefault([])
  );
};

// Bir bölümün alan değerlerinin şeması. Bilinmeyen alan geçmez; boş bırakılabilen alan verilmeyebilir.
// baslangic: temanın ya da sitenin başlangıç düzeni için; kayda başvuran alanlar boş kalmalı.
export const bolumDegerSemasi = (tarif: BolumTarifi, kip: Kip = { baslangic: false }) =>
  z.strictObject(
    Object.fromEntries(
      Object.entries(tarif.alanlar).map(([kod, alan]) => [kod, alanSemasi(alan, kip)]),
    ),
  );

export type BolumDegerleri = Record<string, unknown>;

// Değerlerin veritabanındaki kayıtlara başvuruları: kimlikten, ona başvuran alanların yollarına ("kategori",
// "urunler.urunler.1", "maddeler.0.gorsel"). Düzen servisi bunların var ve silinmemiş olduğunu denetler; hata
// alanın yoluyla döner, panel onu alanın yanında gösterir.
export type BolumBaglari = Record<
  "gorsel" | "kategori" | "marka" | "etiket" | "urun",
  Map<string, string[]>
>;

export const bosBaglar = (): BolumBaglari => ({
  gorsel: new Map(),
  kategori: new Map(),
  marka: new Map(),
  etiket: new Map(),
  urun: new Map(),
});

const bagEkle = (baglar: BolumBaglari, tur: keyof BolumBaglari, kimlik: string, yol: string) => {
  baglar[tur].set(kimlik, [...(baglar[tur].get(kimlik) ?? []), yol]);
};

const tekAlanBaglari = (alan: TekAlanTarifi, deger: unknown, yol: string, baglar: BolumBaglari) => {
  if (deger === undefined) return;
  if (alan.tur === "gorsel" || alan.tur === "kategori" || alan.tur === "marka") {
    bagEkle(baglar, alan.tur, deger as string, yol);
  } else if (alan.tur === "urun-kaynagi") {
    const kaynak = deger as
      | { tur: "elle"; urunler: string[] }
      | { tur: "kategori"; kategori: string }
      | { tur: "marka"; marka: string }
      | { tur: "etiket"; etiket: string }
      | { tur: "yeni" | "indirimli" };
    if (kaynak.tur === "elle") {
      kaynak.urunler.forEach((urun, sira) => {
        bagEkle(baglar, "urun", urun, `${yol}.urunler.${sira}`);
      });
    } else if (kaynak.tur === "kategori") {
      bagEkle(baglar, "kategori", kaynak.kategori, `${yol}.kategori`);
    } else if (kaynak.tur === "marka") bagEkle(baglar, "marka", kaynak.marka, `${yol}.marka`);
    else if (kaynak.tur === "etiket") bagEkle(baglar, "etiket", kaynak.etiket, `${yol}.etiket`);
  }
};

// Şemadan geçmiş değerlerin başvuruları.
export const bolumBaglari = (tarif: BolumTarifi, degerler: BolumDegerleri): BolumBaglari => {
  const baglar = bosBaglar();
  for (const [kod, alan] of Object.entries(tarif.alanlar)) {
    const deger = degerler[kod];
    if (alan.tur !== "liste") {
      tekAlanBaglari(alan, deger, kod, baglar);
      continue;
    }
    ((deger as Record<string, unknown>[] | undefined) ?? []).forEach((oge, sira) => {
      for (const [altKod, alt] of Object.entries(alan.alanlar)) {
        tekAlanBaglari(alt, oge[altKod], `${kod}.${sira}.${altKod}`, baglar);
      }
    });
  }
  return baglar;
};
