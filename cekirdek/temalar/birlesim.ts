// Sitenin tasarım değerlerinin birleşimi (.claude/rules/tasarim-sistemi.md, karar 0076). Vitrinin ve
// panelin değerleri yalnız buradan okunur, bileşenler sonucu kullanır.
//
// Bugün bütün siteler başlangıç değerleriyle açılır. Tema yapısı kurulunca (kart 0105) sonuç, sitenin
// seçtiği temanın değerleri ile mağaza sahibinin temanın izin verdiği yerlerdeki değişikliklerinin
// birleşimi olur; panel bu birleşimden yalnız ana rengi alır.
import { temaDegerleriCss } from "../../bilesenler/tasarim-degerleri/css.ts";
import {
  type TemaDegerleri,
  varsayilanTemaDegerleri,
} from "../../bilesenler/tasarim-degerleri/degerler.ts";
import { hatayiKaydet } from "../izleme/hata-katmani.ts";

export function sitenTasarimDegerleri(): TemaDegerleri {
  return varsayilanTemaDegerleri;
}

// Kök düzenin sayfaya yazdığı CSS. Şemaya uymayan değer sayfaya yazılmaz; site düşmez, hata kaydedilir
// ve sayfa başlangıç değerleriyle açılır.
export function sitenTasarimCss(degerler: TemaDegerleri = sitenTasarimDegerleri()): string {
  try {
    return temaDegerleriCss(degerler);
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "tasarim-degerleri" });
    return temaDegerleriCss(varsayilanTemaDegerleri);
  }
}
