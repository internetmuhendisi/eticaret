// Canlı Çarşı (karar 0075): ilk demo site için seçilen yön. Bugün yalnız değerleri ve mağaza sahibinin
// seçebileceği ana renk yazılıdır. Yazı tipi, köşe ve düğme seçenekleri, parça görünümleri ve ana sayfanın
// başlangıç düzeni kart 0114'te yazılır. Üst ve alt kısım (kart 0108) sitenin menülerine koduyla bağlanır
// (ana-menu, kategori-menusu, alt-bilgi); sitede o kodda menü yoksa bölüm boş kalır.
import { varsayilanTemaDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { TemaTanimiGirdisi } from "../sema.ts";

export const canliCarsi: TemaTanimiGirdisi = {
  degerler: varsayilanTemaDegerleri,
  magazaSecenekleri: { renkler: ["birincil"], yaziTipleri: {}, koseler: {}, dugmeBicimleri: {} },
  gorunumler: {},
  baslangicDuzeni: {
    "ust-kisim": [
      {
        tur: "ust-satir",
        gorunum: "logo-solda",
        degerler: { menuler: [{ menu: "ana-menu" }, { menu: "kategori-menusu" }] },
      },
      {
        tur: "menu-satiri",
        gorunum: "sola-yasli",
        degerler: { anaMenu: "ana-menu", kategoriMenusu: "kategori-menusu" },
      },
    ],
    "ana-sayfa": [],
    "alt-kisim": [
      { tur: "iletisim-bilgileri", gorunum: "liste" },
      { tur: "baglanti-sutunlari", gorunum: "sutunlu", degerler: { menu: "alt-bilgi" } },
      { tur: "sosyal-hesaplar", gorunum: "liste" },
      { tur: "telif-satiri", gorunum: "duz" },
      { tur: "odeme-isaretleri", gorunum: "yazili" },
    ],
  },
};
