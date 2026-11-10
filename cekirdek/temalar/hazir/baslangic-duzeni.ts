// Hazır temaların başlangıç düzeni (kart 0114, karar 0075'in bölüm sırası; üç temada aynı).
//
// Tema bütün sitelerde ortaktır: düzeninde sitenin kaydına (kategori, marka, ürün, görsel) başvuran ya da
// metin isteyen bölüm yoktur (afiş, güven şeridi, kategori kutuları, marka logoları, bülten). Onlar sitenin
// başlangıç düzenindedir (siteler/<kod>/baslangic/duzen.json). Temanın düzeni, dosyası olmayan site ve tema
// değişikliğinde "yeni temanın düzenini uygula" yolu (karar 0091) için ürün bölümlerinin sırasını verir; aynı
// türden bölümün içeriği eski düzenden taşınır.
//
// Üst ve alt kısım (kart 0108) sitenin menülerine koduyla bağlanır (ana-menu, kategori-menusu, alt-bilgi);
// sitede o kodda menü yoksa bölüm boş kalır.
import type { TemaTanimiGirdisi } from "../sema.ts";

export const hazirTemaBaslangicDuzeni: TemaTanimiGirdisi["baslangicDuzeni"] = {
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
  "ana-sayfa": [
    { tur: "urun-vitrini", degerler: { urunler: { tur: "yeni", adet: 10 } } },
    { tur: "firsatlar", gorunum: "yan-panelli" },
    { tur: "urun-vitrini", degerler: { urunler: { tur: "indirimli", adet: 10 } } },
    { tur: "musteri-yorumlari" },
    { tur: "blog-yazilari" },
  ],
  "alt-kisim": [
    { tur: "iletisim-bilgileri", gorunum: "liste" },
    { tur: "baglanti-sutunlari", gorunum: "sutunlu", degerler: { menu: "alt-bilgi" } },
    { tur: "sosyal-hesaplar", gorunum: "liste" },
    { tur: "telif-satiri", gorunum: "duz" },
    { tur: "odeme-isaretleri", gorunum: "yazili" },
  ],
};
