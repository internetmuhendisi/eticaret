// Canlı Çarşı (karar 0075): ilk demo site için seçilen yön. Bugün yalnız değerleri ve mağaza sahibinin
// seçebileceği ana renk yazılıdır. Yazı tipi, köşe ve düğme seçenekleri, parça görünümleri ve başlangıç
// düzeni kart 0114'te yazılır.
import { varsayilanTemaDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { TemaTanimiGirdisi } from "../sema.ts";

export const canliCarsi: TemaTanimiGirdisi = {
  degerler: varsayilanTemaDegerleri,
  magazaSecenekleri: { renkler: ["birincil"], yaziTipleri: {}, koseler: {}, dugmeBicimleri: {} },
  gorunumler: {},
  baslangicDuzeni: { "ust-kisim": [], "ana-sayfa": [], "alt-kisim": [] },
};
