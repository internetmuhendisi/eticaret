// Sınıfları birleştirir (kart 0103, shadcn/ui'ın cn işlevi). Çakışan iki sınıftan sonra yazılan kalır:
// sinif("p-2", "p-4") → "p-4". Parçalar kendi sınıflarını, kullanan sayfanın verdiğiyle bu işlevle birleştirir.
// tailwind-merge Tailwind'in hazır adlarını bilir; bizim adlarımızı tasarım değerlerinden öğrenir. Öğrenmezse
// text-govde (yazı boyu) ile text-yazi (renk) çakışıyor sanıp birini siler.
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import {
  golgeAdlari,
  kalinlikAdlari,
  koseAdlari,
  renkAdlari,
  sabitDegerler,
  yaziBoyuAdlari,
  yaziTipiAdlari,
} from "../tasarim-degerleri/degerler.ts";

const birlestir = extendTailwindMerge({
  override: {
    theme: {
      color: [...renkAdlari, "transparent", "current", "inherit"],
      spacing: Object.keys(sabitDegerler.bosluklar),
      text: [...yaziBoyuAdlari],
      font: [...yaziTipiAdlari],
      "font-weight": [...kalinlikAdlari],
      radius: [...koseAdlari, "none", "full"],
      shadow: [...golgeAdlari, "none"],
      breakpoint: Object.keys(sabitDegerler.kirilmaNoktalari),
      container: Object.keys(sabitDegerler.genislikler),
    },
  },
  extend: {
    classGroups: {
      z: [{ z: Object.keys(sabitDegerler.katmanlar) }],
    },
  },
});

export function sinif(...siniflar: ClassValue[]): string {
  return birlestir(clsx(siniflar));
}
