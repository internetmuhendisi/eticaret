// Tailwind'in tanıdığı değerler (karar 0076). Tailwind'in kendi teması hiç yüklenmez (tailwind.css),
// bu yüzden hazır palet, hazır ölçüler ve hazır kırılma noktaları yoktur; Tailwind yalnız buradaki
// adları tanır. Adlar ve sabit değerler degerler.ts'ten okunur, burada değer yazılmaz.
// Tema değerleri CSS değişkenidir: sınıf değişkeni okur, değişkenin değerini sayfa yazar (css.ts).
import {
  bagliRenkAdlari,
  golgeAdlari,
  kalinlikAdlari,
  koseAdlari,
  renkAdlari,
  sabitDegerler,
  temaBoslukAdlari,
  yaziBoyuAdlari,
  yaziTipiAdlari,
} from "./degerler.ts";
import { degiskenAdi } from "./degisken-adlari.ts";

const eslestir = <A extends string, D>(adlar: readonly A[], deger: (ad: A) => D) =>
  Object.fromEntries(adlar.map((ad) => [ad, deger(ad)])) as Record<A, D>;

const degisken = (ad: string) => `var(${ad})`;
const sure = sabitDegerler.sureler;

export default {
  // Taranacak dosyalar CSS'te @source ile verilir.
  content: [],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentcolor",
      inherit: "inherit",
      ...eslestir(renkAdlari, (ad) => degisken(degiskenAdi.renk(ad))),
      ...eslestir(bagliRenkAdlari, (ad) => degisken(degiskenAdi.renk(ad))),
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
    // Sabit ölçek ve temadan gelen boşluklar (kart 0124: p-kart-ici, gap-bolum).
    spacing: {
      ...sabitDegerler.bosluklar,
      ...eslestir(temaBoslukAdlari, (ad) => degisken(degiskenAdi.bosluk(ad))),
    },
    // Tam genişlikteki ürün ızgarasının ve şeridinin geniş ekrandaki sütunları temanın sayısıdır (kart 0124).
    gridTemplateColumns: {
      urun: `repeat(${degisken(degiskenAdi.urunSutunu)}, minmax(0, 1fr))`,
    },
    flexBasis: {
      urun: `calc(100% / ${degisken(degiskenAdi.urunSutunu)})`,
    },
    screens: sabitDegerler.kirilmaNoktalari,
    containers: sabitDegerler.kapsayicilar,
    maxWidth: sabitDegerler.genislikler,
    zIndex: sabitDegerler.katmanlar,
    // Açılış ve kapanış hareketleri (kart 0103). Süreler degerler.ts'ten gelir; hareketin kendisi
    // (@keyframes) tailwind.css'tedir: Tailwind 4 bu ayar dosyasındaki keyframes alanını CSS'e yazmaz
    // (ölçüldü). Her animasyonun tanımı olduğunu testler/tailwind.test.ts denetler. Hareketi azaltmayı
    // seçen kullanıcıda tailwind.css hepsini durdurur.
    animation: {
      "geciken-gorunum": `geciken-gorunum 0s ${sabitDegerler.yukleniyorGecikmesi} forwards`,
      belir: `belir ${sure.kisa} ease-out`,
      kaybol: `kaybol ${sure.kisa} ease-in forwards`,
      "ortu-belir": `ortu-belir ${sure.orta} ease-out`,
      "ortu-kaybol": `ortu-kaybol ${sure.orta} ease-in forwards`,
      "sagdan-gir": `sagdan-gir ${sure.uzun} ease-out`,
      "saga-cik": `saga-cik ${sure.orta} ease-in forwards`,
      "soldan-gir": `soldan-gir ${sure.uzun} ease-out`,
      "sola-cik": `sola-cik ${sure.orta} ease-in forwards`,
      "alttan-gir": `alttan-gir ${sure.uzun} ease-out`,
      "alta-cik": `alta-cik ${sure.orta} ease-in forwards`,
      "akordeon-ac": `akordeon-ac ${sure.orta} ease-out`,
      "akordeon-kapa": `akordeon-kapa ${sure.orta} ease-in`,
      don: `don ${sure.don} linear infinite`,
      nabiz: `nabiz ${sure.nabiz} ease-in-out infinite`,
    },
    transitionDuration: sure,
  },
};
