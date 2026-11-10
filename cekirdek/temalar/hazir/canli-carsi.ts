// Canlı Çarşı (karar 0075): ilk demo site için seçilen yön. Yoğun, renkli, sırada 5 ürünlü bir pazar.
// Değerleri tasarım değerlerinin başlangıç değerleridir (bilesenler/tasarim-degerleri/degerler.ts). Mağaza
// sahibinin seçenekleri ve başlangıç düzeni üç hazır temada ortaktır (magaza-secenekleri.ts,
// baslangic-duzeni.ts).
import { varsayilanTemaDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { TemaTanimiGirdisi } from "../sema.ts";
import { hazirTemaBaslangicDuzeni } from "./baslangic-duzeni.ts";
import { hazirTemaSecenekleri } from "./magaza-secenekleri.ts";

export const canliCarsi: TemaTanimiGirdisi = {
  degerler: varsayilanTemaDegerleri,
  magazaSecenekleri: hazirTemaSecenekleri,
  // Taslaktaki ürün kartı dikeydir (karar 0075).
  gorunumler: { "urun-karti": "dikey" },
  baslangicDuzeni: hazirTemaBaslangicDuzeni,
};
