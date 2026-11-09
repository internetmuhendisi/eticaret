// Tailwind'in tanıdığı değerler (karar 0076). Tailwind'in kendi teması hiç yüklenmez (tailwind.css),
// bu yüzden hazır palet, hazır ölçüler ve hazır kırılma noktaları yoktur; Tailwind yalnız buradaki
// adları tanır. Adlar ve sabit değerler degerler.ts'ten okunur, burada değer yazılmaz.
// Tema değerleri CSS değişkenidir: sınıf değişkeni okur, değişkenin değerini sayfa yazar (css.ts).
import {
  golgeAdlari,
  kalinlikAdlari,
  koseAdlari,
  renkAdlari,
  sabitDegerler,
  yaziBoyuAdlari,
  yaziTipiAdlari,
} from "./degerler.ts";
import { degiskenAdi } from "./degisken-adlari.ts";

const eslestir = <A extends string, D>(adlar: readonly A[], deger: (ad: A) => D) =>
  Object.fromEntries(adlar.map((ad) => [ad, deger(ad)])) as Record<A, D>;

const degisken = (ad: string) => `var(${ad})`;

export default {
  // Taranacak dosyalar CSS'te @source ile verilir.
  content: [],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentcolor",
      inherit: "inherit",
      ...eslestir(renkAdlari, (ad) => degisken(degiskenAdi.renk(ad))),
    },
    boxShadow: {
      none: "none",
      ...eslestir(golgeAdlari, (ad) => degisken(degiskenAdi.golge(ad))),
    },
    fontFamily: eslestir(yaziTipiAdlari, (ad) => degisken(degiskenAdi.yaziTipi(ad))),
    fontWeight: eslestir(kalinlikAdlari, (ad) => degisken(degiskenAdi.kalinlik(ad))),
    fontSize: eslestir(yaziBoyuAdlari, (ad) => [
      degisken(degiskenAdi.yaziBoyu(ad)),
      { lineHeight: degisken(degiskenAdi.satirYuksekligi(ad)) },
    ]),
    borderRadius: {
      none: "0px",
      ...eslestir(koseAdlari, (ad) => degisken(degiskenAdi.kose(ad))),
    },
    spacing: sabitDegerler.bosluklar,
    screens: sabitDegerler.kirilmaNoktalari,
    maxWidth: sabitDegerler.genislikler,
    zIndex: sabitDegerler.katmanlar,
    // Kod birkaç saniyede yüklenmezse görünen yazı (kart 0057): görünmez başlar, gecikmeden sonra görünür.
    keyframes: { "geciken-gorunum": { to: { visibility: "visible" } } },
    animation: {
      "geciken-gorunum": `geciken-gorunum 0s ${sabitDegerler.yukleniyorGecikmesi} forwards`,
    },
  },
};
