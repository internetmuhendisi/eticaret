// Tema değerlerini sayfaya yazılacak CSS'e çevirir (karar 0076). Açık tema değerleri :root'a, koyu
// tema değerleri cihazın koyu tema tercihine yazılır. Sayfanın kökündeki zorlananRenkOzniteligi ikisinden
// birini cihazdan bağımsız seçer (kart 0104, bileşen kataloğu). Her değer önce şemadan geçer: mağaza
// sahibinin seçtiği değerler de buradan geçer (kart 0105). Şemaya uymayan değerde hata atar; sayfayı
// yazan cekirdek/temalar/birlesim.ts hatayı kaydedip başlangıç değerlerini yazar.
import { z } from "zod";
import {
  type BagliRenkAdi,
  bagKaynagi,
  bagliRenkAdlari,
  baslikDonusumleri,
  golgeAdlari,
  kalinlikAdlari,
  koseAdlari,
  renkAdiMi,
  renkAdlari,
  type TemaDegerleri,
  temaBoslukAdlari,
  yaziBoyuAdlari,
  yaziTipiAdlari,
} from "./degerler.ts";
import { degiskenAdi } from "./degisken-adlari.ts";
import { zorlananRenkOzniteligi } from "./renk-ozniteligi.ts";

const nesne = <A extends string, S extends z.ZodType>(adlar: readonly A[], sema: S) =>
  z.strictObject(Object.fromEntries(adlar.map((ad) => [ad, sema])) as Record<A, S>);

// Değerler yalnız bu kalıplara uyabilir. Hiçbiri ; { } < > " ' \ içeremez: değer kendi satırından
// çıkıp başka bir CSS kuralı ya da HTML yazamaz.
export const renkSemasi = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
export const olcuSemasi = z.string().regex(/^(?:0|\d+(?:\.\d+)?(?:rem|px|em))$/);
// Gölge: "none" ya da virgülle ayrılmış katmanlar (kart 0124: Yumuşak Mevsim'in kart gölgesi iki katlıdır).
const golgeKatmani =
  "-?\\d+(?:px)? -?\\d+(?:px)? \\d+(?:px)?(?: \\d+(?:px)?)? rgb\\(\\d{1,3} \\d{1,3} \\d{1,3} \\/ (?:0|1|0?\\.\\d+)\\)";
const golge = z.string().regex(new RegExp(`^(?:none|${golgeKatmani}(?:, ${golgeKatmani})*)$`));
// Bağlı renk: bir renk adı ya da renk; açık ve koyu temada ayrı verilebilir (kart 0124).
const renkKaynagi = z.union([z.enum(renkAdlari), renkSemasi]);
const renkBagi = z.union([renkKaynagi, z.strictObject({ acik: renkKaynagi, koyu: renkKaynagi })]);
const harfAraligi = z.string().regex(/^(?:normal|0|-?0?\.\d{1,3}em)$/);
export const yaziTipiSemasi = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9 -]*(?:, [A-Za-z][A-Za-z0-9 -]*)*$/);
const kalinlik = z.string().regex(/^[1-9]00$/);
const satir = z.string().regex(/^\d(?:\.\d{1,2})?$/);

export const temaDegerleriSemasi = z.strictObject({
  renkler: z.strictObject({
    acik: nesne(renkAdlari, renkSemasi),
    koyu: nesne(renkAdlari, renkSemasi),
  }),
  golgeler: z.strictObject({ acik: nesne(golgeAdlari, golge), koyu: nesne(golgeAdlari, golge) }),
  yaziTipleri: nesne(yaziTipiAdlari, yaziTipiSemasi),
  kalinliklar: nesne(kalinlikAdlari, kalinlik),
  yaziBoylari: nesne(yaziBoyuAdlari, z.strictObject({ boy: olcuSemasi, satir })),
  koseler: nesne(koseAdlari, olcuSemasi),
  renkBaglari: nesne(bagliRenkAdlari, renkBagi),
  baslikBicimi: z.strictObject({ donusum: z.enum(baslikDonusumleri), harfAraligi }),
  bosluklar: nesne(temaBoslukAdlari, olcuSemasi),
  urunSutunu: z.number().int().min(2).max(6),
});

const satirlar = (degerler: [string, string][]) =>
  degerler.map(([ad, deger]) => `${ad}:${deger};`).join("");

// Bağlı renk, bağlandığı rengin değişkenini okur: o renk değişince (mağaza sahibinin ana rengi) o da değişir.
const bagliRenk = (degerler: TemaDegerleri, tema: "acik" | "koyu", ad: BagliRenkAdi): string => {
  const kaynak = bagKaynagi(degerler.renkBaglari[ad], tema);
  return renkAdiMi(kaynak) ? `var(${degiskenAdi.renk(kaynak)})` : kaynak;
};

const renkVeGolge = (degerler: TemaDegerleri, tema: "acik" | "koyu") =>
  satirlar([
    ...renkAdlari.map((ad): [string, string] => [degiskenAdi.renk(ad), degerler.renkler[tema][ad]]),
    ...bagliRenkAdlari.map((ad): [string, string] => [
      degiskenAdi.renk(ad),
      bagliRenk(degerler, tema, ad),
    ]),
    ...golgeAdlari.map((ad): [string, string] => [
      degiskenAdi.golge(ad),
      degerler.golgeler[tema][ad],
    ]),
  ]);

// koyuTema: vitrinde koyu tema açık mı (kart 0105, sitenin tema ayarı). Kapalıysa cihazın koyu tema
// tercihi yok sayılır, sayfa açık temayla çizilir. Kökün özniteliğiyle zorlanan renk (bileşen kataloğu)
// her durumda çalışır.
export function temaDegerleriCss(
  girdi: TemaDegerleri,
  { koyuTema = true }: { koyuTema?: boolean } = {},
): string {
  const degerler = temaDegerleriSemasi.parse(girdi);
  const ortak = satirlar([
    ...yaziTipiAdlari.map((ad): [string, string] => [
      degiskenAdi.yaziTipi(ad),
      degerler.yaziTipleri[ad],
    ]),
    ...kalinlikAdlari.map((ad): [string, string] => [
      degiskenAdi.kalinlik(ad),
      degerler.kalinliklar[ad],
    ]),
    ...yaziBoyuAdlari.flatMap((ad): [string, string][] => [
      [degiskenAdi.yaziBoyu(ad), degerler.yaziBoylari[ad].boy],
      [degiskenAdi.satirYuksekligi(ad), degerler.yaziBoylari[ad].satir],
    ]),
    ...koseAdlari.map((ad): [string, string] => [degiskenAdi.kose(ad), degerler.koseler[ad]]),
    ...temaBoslukAdlari.map((ad): [string, string] => [
      degiskenAdi.bosluk(ad),
      degerler.bosluklar[ad],
    ]),
    [degiskenAdi.baslikDonusumu, degerler.baslikBicimi.donusum],
    [degiskenAdi.baslikHarfAraligi, degerler.baslikBicimi.harfAraligi],
    [degiskenAdi.urunSutunu, String(degerler.urunSutunu)],
  ]);
  return (
    `:root{color-scheme:${koyuTema ? "light dark" : "light"};${ortak}${renkVeGolge(degerler, "acik")}}` +
    (koyuTema
      ? `@media (prefers-color-scheme:dark){:root{${renkVeGolge(degerler, "koyu")}}}`
      : "") +
    // Öznitelikli seçici :root'tan özgüldür, cihazın tercihinin önüne geçer. Kökün dışında tek bir öğeye de
    // verilebilir (sipariş fişi her zaman açık renktedir, kart 0270): değişkenler o öğenin altında geçerlidir.
    `:root[${zorlananRenkOzniteligi}=acik],[${zorlananRenkOzniteligi}=acik]{color-scheme:light;${renkVeGolge(degerler, "acik")}}` +
    `:root[${zorlananRenkOzniteligi}=koyu],[${zorlananRenkOzniteligi}=koyu]{color-scheme:dark;${renkVeGolge(degerler, "koyu")}}`
  );
}
