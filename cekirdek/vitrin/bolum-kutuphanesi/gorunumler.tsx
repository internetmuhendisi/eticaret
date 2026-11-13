// Bölüm türlerinin görünüşleri (kart 0106, karar 0081): türün kodundan çizen bileşene. Anahtarlar bölüm
// kütüphanesindekilerle (kutuphane.ts) aynıdır; testte denetlenir. Bölüm türleri kendi kartlarıyla gelir.
//
// Görünüş bileşeni içeriği yalnız alan değerlerinden ve veriden alır: ürün adı, fiyat, görsel adresi ya da
// mağazaya özel metin elle yazılmaz (denetim/kurallar/bolum-icerigi.grit). Ekrandaki sabit metin metin
// dosyasından gelir. Mağaza adı, logo, iletişim ve menüler bağlamdan gelir (kart 0108, baglam.ts).
import type { ComponentType } from "react";
import {
  BaglantiSutunlariGorunumu,
  baglantiSutunlariDallari,
} from "../bolumler/baglanti-sutunlari/gorunum";
import { BlogYazilariGorunumu, blogYazilariYazilari } from "../bolumler/blog-yazilari/gorunum";
import { BultenKaydiGorunumu, bultenKaydiBosMu } from "../bolumler/bulten-kaydi/gorunum";
import { DuyuruSeridiGorunumu } from "../bolumler/duyuru-seridi/gorunum";
import { FirsatlarGorunumu, firsatKartlari } from "../bolumler/firsatlar/gorunum";
import { GenisAfisGorunumu } from "../bolumler/genis-afis/gorunum";
import { GuvenSeridiGorunumu, guvenSeridiMaddeleri } from "../bolumler/guven-seridi/gorunum";
import { IletisimBilgileriGorunumu, iletisimBosMu } from "../bolumler/iletisim-bilgileri/gorunum";
import { KampanyaAfisleriGorunumu } from "../bolumler/kampanya-afisleri/gorunum";
import { KategoriKutulariGorunumu, kategoriKutulari } from "../bolumler/kategori-kutulari/gorunum";
import { KayanAfisGorunumu } from "../bolumler/kayan-afis/gorunum";
import { MarkaLogolariGorunumu, markaLogolariMarkalari } from "../bolumler/marka-logolari/gorunum";
import { MenuSatiriGorunumu, menuSatiriBosMu } from "../bolumler/menu-satiri/gorunum";
import {
  MusteriYorumlariGorunumu,
  musteriYorumlariYorumlari,
} from "../bolumler/musteri-yorumlari/gorunum";
import {
  OdemeIsaretleriGorunumu,
  odemeIsaretleriBosMu,
} from "../bolumler/odeme-isaretleri/gorunum";
import { SekmeliVitrinGorunumu, sekmeliVitrinSekmeleri } from "../bolumler/sekmeli-vitrin/gorunum";
import { SosyalHesaplarGorunumu, sosyalHesaplarBosMu } from "../bolumler/sosyal-hesaplar/gorunum";
import { TelifSatiriGorunumu } from "../bolumler/telif-satiri/gorunum";
import { UrunVitriniGorunumu, urunVitriniKartlari } from "../bolumler/urun-vitrini/gorunum";
import { UstSatirGorunumu } from "../bolumler/ust-satir/gorunum";
import type { VitrinBaglami } from "./baglam.ts";
import type { BolumDegerleri } from "./tarif.ts";

// baglam: mağaza adı, logo, iletişim, menüler gibi alan değerleri dışındaki veri (kart 0108).
export type BolumGorunumuOzellikleri = {
  gorunum: string;
  degerler: BolumDegerleri;
  baglam: VitrinBaglami;
};
export type BolumGorunumleri = Readonly<Record<string, ComponentType<BolumGorunumuOzellikleri>>>;

export const bolumGorunumleri: BolumGorunumleri = {
  "duyuru-seridi": DuyuruSeridiGorunumu,
  "ust-satir": UstSatirGorunumu,
  "menu-satiri": MenuSatiriGorunumu,
  "baglanti-sutunlari": BaglantiSutunlariGorunumu,
  "iletisim-bilgileri": IletisimBilgileriGorunumu,
  "sosyal-hesaplar": SosyalHesaplarGorunumu,
  "odeme-isaretleri": OdemeIsaretleriGorunumu,
  "telif-satiri": TelifSatiriGorunumu,
  "kayan-afis": KayanAfisGorunumu,
  "guven-seridi": GuvenSeridiGorunumu,
  "kampanya-afisleri": KampanyaAfisleriGorunumu,
  "genis-afis": GenisAfisGorunumu,
  "kategori-kutulari": KategoriKutulariGorunumu,
  "urun-vitrini": UrunVitriniGorunumu,
  "sekmeli-vitrin": SekmeliVitrinGorunumu,
  firsatlar: FirsatlarGorunumu,
  "marka-logolari": MarkaLogolariGorunumu,
  "musteri-yorumlari": MusteriYorumlariGorunumu,
  "blog-yazilari": BlogYazilariGorunumu,
  "bulten-kaydi": BultenKaydiGorunumu,
};

// Vitrinde içeriği boş kaldığı için çizilmeyen bölümler (kart 0172): türün görünüşü boşluğu bu işlevle bulur,
// panel de aynı işlevle "şu an vitrinde görünmüyor" der. İki ayrı kural yazılmaz. Boşluğu yalnız alan
// değerlerine bağlı olan tür (zorunlu metni olan afişler) burada yoktur: şema boş değeri kabul etmez.
export type BolumBoslugu = (degerler: BolumDegerleri, baglam: VitrinBaglami) => boolean;
export const bolumBosluklari = {
  "menu-satiri": menuSatiriBosMu,
  "baglanti-sutunlari": (degerler, baglam) =>
    (baglantiSutunlariDallari(degerler, baglam)?.length ?? 0) === 0,
  "iletisim-bilgileri": (_, baglam) => iletisimBosMu(baglam),
  "sosyal-hesaplar": (_, baglam) => sosyalHesaplarBosMu(baglam),
  "odeme-isaretleri": (_, baglam) => odemeIsaretleriBosMu(baglam),
  "guven-seridi": (degerler, baglam) => guvenSeridiMaddeleri(degerler, baglam).length === 0,
  "kategori-kutulari": (degerler, baglam) => kategoriKutulari(degerler, baglam).length === 0,
  "urun-vitrini": (degerler, baglam) => urunVitriniKartlari(degerler, baglam).length === 0,
  "sekmeli-vitrin": (degerler, baglam) => sekmeliVitrinSekmeleri(degerler, baglam).length === 0,
  firsatlar: (degerler, baglam) => firsatKartlari(degerler, baglam).length === 0,
  "marka-logolari": (degerler, baglam) => markaLogolariMarkalari(degerler, baglam).length === 0,
  "musteri-yorumlari": (degerler, baglam) =>
    musteriYorumlariYorumlari(degerler, baglam).length === 0,
  "blog-yazilari": (degerler, baglam) => blogYazilariYazilari(degerler, baglam).length === 0,
  "bulten-kaydi": (_, baglam) => bultenKaydiBosMu(baglam),
} as const satisfies Readonly<Record<string, BolumBoslugu>>;
export type BosOlabilenBolum = keyof typeof bolumBosluklari;
