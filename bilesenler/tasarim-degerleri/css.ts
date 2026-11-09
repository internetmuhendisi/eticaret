// Tema değerlerini sayfaya yazılacak CSS'e çevirir (karar 0076). Açık tema değerleri :root'a, koyu
// tema değerleri cihazın koyu tema tercihine yazılır. Sayfanın kökündeki zorlananRenkOzniteligi ikisinden
// birini cihazdan bağımsız seçer (kart 0104, bileşen kataloğu). Her değer önce şemadan geçer: mağaza
// sahibinin seçtiği değerler de buradan geçer (kart 0105). Şemaya uymayan değerde hata atar; sayfayı
// yazan cekirdek/temalar/birlesim.ts hatayı kaydedip başlangıç değerlerini yazar.
import { z } from "zod";
import {
  golgeAdlari,
  kalinlikAdlari,
  koseAdlari,
  renkAdlari,
  type TemaDegerleri,
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
const golge = z
  .string()
  .regex(
    /^(?:none|-?\d+(?:px)? -?\d+(?:px)? \d+(?:px)?(?: \d+(?:px)?)? rgb\(\d{1,3} \d{1,3} \d{1,3} \/ (?:0|1|0?\.\d+)\))$/,
  );
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
});

const satirlar = (degerler: [string, string][]) =>
  degerler.map(([ad, deger]) => `${ad}:${deger};`).join("");

const renkVeGolge = (degerler: TemaDegerleri, tema: "acik" | "koyu") =>
  satirlar([
    ...renkAdlari.map((ad): [string, string] => [degiskenAdi.renk(ad), degerler.renkler[tema][ad]]),
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
  ]);
  return (
    `:root{color-scheme:${koyuTema ? "light dark" : "light"};${ortak}${renkVeGolge(degerler, "acik")}}` +
    (koyuTema
      ? `@media (prefers-color-scheme:dark){:root{${renkVeGolge(degerler, "koyu")}}}`
      : "") +
    // Öznitelikli seçici :root'tan özgüldür, cihazın tercihinin önüne geçer.
    `:root[${zorlananRenkOzniteligi}=acik]{color-scheme:light;${renkVeGolge(degerler, "acik")}}` +
    `:root[${zorlananRenkOzniteligi}=koyu]{color-scheme:dark;${renkVeGolge(degerler, "koyu")}}`
  );
}
