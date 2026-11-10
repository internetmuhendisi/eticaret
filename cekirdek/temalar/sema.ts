// Tema tanımının şeması (kart 0105, .claude/rules/tasarim-sistemi.md). Hazır temalar (hazir/) ve bir
// siteye özel temalar (siteler/<kod>/tema/) aynı şemadan geçer; geçmeyen tema açılmaz, onu kullanan site
// doğrulamadan geçmez.
//
// Bir tema dört şeydir:
// - degerler: tasarım değerlerinin tamamı, açık ve koyu temada. Her yazı ve işaret çifti okunur olmalı.
// - magazaSecenekleri: mağaza sahibinin değiştirebileceği değerler. Hangi renkleri kendisi seçebileceği,
//   yazı tipi, köşe ve düğme biçimi için seçenekler. Seçenek seçilmemişse temanın kendi değeri geçerlidir.
// - gorunumler: parçaların görünüm tipleri. Kayıttaki (cekirdek/kayitlar/tema.ts) her parça için bir
//   görünüm seçilir.
// - baslangicDuzeni: üst kısım, ana sayfa ve alt kısımda sırasıyla bölümler. Her bölüm kütüphanede olmalı,
//   o alana konabilmeli, görünümü ve alan değerleri tarifine uymalı (kart 0106). Kayda başvuran alanlar
//   (görsel, kategori, marka, seçilen ürünler) başlangıçta boş kalır.
//
// Kütüphane şemaya parametre olarak verilir: testler deneme bölümü ve görünümüyle dener, çekirdek gerçek
// kayıtla çalışır.
import { z } from "zod";
import {
  olcuSemasi,
  temaDegerleriSemasi,
  yaziTipiSemasi,
} from "../../bilesenler/tasarim-degerleri/css.ts";
import {
  genelYaziTipleri,
  renkAdlari,
  type TemaDegerleri,
  yuklenenYaziTipleri,
} from "../../bilesenler/tasarim-degerleri/degerler.ts";
import { parcaGorunumleri } from "../kayitlar/tema.ts";
import {
  type BolumKutuphanesi,
  baslangicDuzeniSemasi,
  baslangicDuzeniSorunlari,
} from "../vitrin/bolum-kutuphanesi/duzen.ts";
import { bolumKutuphanesi } from "../vitrin/bolum-kutuphanesi/kutuphane.ts";
import { okunmayanCiftler, olculenRenkler } from "./okunurluk.ts";

export type TemaKutuphanesi = {
  bolumTurleri: BolumKutuphanesi;
  parcaGorunumleri: Readonly<Record<string, readonly string[]>>;
};
export const cekirdekKutuphanesi: TemaKutuphanesi = {
  bolumTurleri: bolumKutuphanesi,
  parcaGorunumleri,
};

// Tema, seçenek, bölüm ve görünüm kodları: küçük harf, rakam ve tire.
export const kodSemasi = z
  .string()
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// Tema tanımının hata kodları. Şemanın kendi hataları (eksik alan, yanlış tür) zod kodlarıyla döner.
export const temaTanimiHatalari = [
  "kontrast-yetersiz",
  "yazi-tipi-yuklu-degil",
  "gorunum-eksik",
  "parca-tanimsiz",
  "gorunum-tanimsiz",
  "ayni-renk-iki-kez",
  "renk-olculmuyor",
] as const;
export type TemaTanimiHatasi = (typeof temaTanimiHatalari)[number];

const yaziTipiSecenegi = z.strictObject({ govde: yaziTipiSemasi, baslik: yaziTipiSemasi });

const tanimSemasi = z.strictObject({
  degerler: temaDegerleriSemasi,
  magazaSecenekleri: z.strictObject({
    renkler: z
      .array(z.enum(renkAdlari))
      .refine((liste) => new Set(liste).size === liste.length, "ayni-renk-iki-kez"),
    yaziTipleri: z.record(kodSemasi, yaziTipiSecenegi),
    koseler: z.record(kodSemasi, z.strictObject({ kucuk: olcuSemasi, orta: olcuSemasi })),
    dugmeBicimleri: z.record(kodSemasi, olcuSemasi),
  }),
  gorunumler: z.record(z.string(), kodSemasi),
  baslangicDuzeni: baslangicDuzeniSemasi,
});
export type TemaTanimi = z.output<typeof tanimSemasi>;
export type TemaTanimiGirdisi = z.input<typeof tanimSemasi>;

// Kod tema tanımının ya da düzenin (cekirdek/vitrin/bolum-kutuphanesi/duzen.ts, duzenHatalari) hata kodudur.
type Sorun = { yer: (string | number)[]; kod: TemaTanimiHatasi | string };

// Yazı tipi listesindeki her ad sitede barındırılan ya da cihazın genel yazı tipi olmalı.
const yukluMu = (liste: string): boolean =>
  liste
    .split(", ")
    .every(
      (ad) =>
        Object.hasOwn(yuklenenYaziTipleri, ad) ||
        (genelYaziTipleri as readonly string[]).includes(ad),
    );

const kontrastSorunlari = (degerler: TemaDegerleri): Sorun[] =>
  (["acik", "koyu"] as const).flatMap((mod) =>
    okunmayanCiftler(degerler.renkler[mod]).map(
      ({ on }): Sorun => ({ yer: ["degerler", "renkler", mod, on], kod: "kontrast-yetersiz" }),
    ),
  );

// Şemanın tek tek alanlara bakarak denetleyemediği kurallar.
export const temaKurallari = (tema: TemaTanimi, kutuphane: TemaKutuphanesi): Sorun[] => {
  const sorunlar: Sorun[] = kontrastSorunlari(tema.degerler);
  const yaziTipleri: [(string | number)[], string][] = [
    ...Object.entries(tema.degerler.yaziTipleri).map(
      ([ad, liste]): [(string | number)[], string] => [["degerler", "yaziTipleri", ad], liste],
    ),
    ...Object.entries(tema.magazaSecenekleri.yaziTipleri).flatMap(([kod, secenek]) =>
      (["govde", "baslik"] as const).map((ad): [(string | number)[], string] => [
        ["magazaSecenekleri", "yaziTipleri", kod, ad],
        secenek[ad],
      ]),
    ),
  ];
  for (const [yer, liste] of yaziTipleri) {
    if (!yukluMu(liste)) sorunlar.push({ yer, kod: "yazi-tipi-yuklu-degil" });
  }
  // Mağaza sahibine açılan her renk en az bir okunurluk çiftinde olmalı: yoksa seçtiği renk hiç ölçülmezdi.
  tema.magazaSecenekleri.renkler.forEach((ad, sira) => {
    if (!olculenRenkler.has(ad)) {
      sorunlar.push({ yer: ["magazaSecenekleri", "renkler", sira], kod: "renk-olculmuyor" });
    }
  });
  for (const [parca, gorunumler] of Object.entries(kutuphane.parcaGorunumleri)) {
    const secilen = Object.hasOwn(tema.gorunumler, parca) ? tema.gorunumler[parca] : undefined;
    if (secilen === undefined) sorunlar.push({ yer: ["gorunumler", parca], kod: "gorunum-eksik" });
    else if (!gorunumler.includes(secilen)) {
      sorunlar.push({ yer: ["gorunumler", parca], kod: "gorunum-tanimsiz" });
    }
  }
  for (const parca of Object.keys(tema.gorunumler)) {
    if (!Object.hasOwn(kutuphane.parcaGorunumleri, parca)) {
      sorunlar.push({ yer: ["gorunumler", parca], kod: "parca-tanimsiz" });
    }
  }
  // Başlangıç düzeni bölüm kütüphanesinin kurallarından geçer (kart 0106).
  for (const { yer, kod } of baslangicDuzeniSorunlari(
    tema.baslangicDuzeni,
    kutuphane.bolumTurleri,
    { kayit: "yok" },
  )) {
    sorunlar.push({ yer: ["baslangicDuzeni", ...yer], kod });
  }
  return sorunlar;
};

export const temaTanimiSemasi = (kutuphane: TemaKutuphanesi = cekirdekKutuphanesi) =>
  tanimSemasi.superRefine((tema, baglam) => {
    for (const { yer, kod } of temaKurallari(tema, kutuphane)) {
      baglam.addIssue({ code: "custom", path: yer, message: kod });
    }
  });

// Bir siteye özel tema dosyası (siteler/<kod>/tema/<tema kodu>.json): tanımın yanında panelde görünen
// adı da taşır. Hazır temaların adı metin dosyasındadır.
export const siteTemasiSemasi = (kutuphane: TemaKutuphanesi = cekirdekKutuphanesi) =>
  z
    .strictObject({ ad: z.string().trim().min(1).max(60), ...tanimSemasi.shape })
    .superRefine((tema, baglam) => {
      for (const { yer, kod } of temaKurallari(tema, kutuphane)) {
        baglam.addIssue({ code: "custom", path: yer, message: kod });
      }
    });
