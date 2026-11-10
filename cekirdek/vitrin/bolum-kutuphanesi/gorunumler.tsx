// Bölüm türlerinin görünüşleri (kart 0106, karar 0081): türün kodundan çizen bileşene. Anahtarlar bölüm
// kütüphanesindekilerle (kutuphane.ts) aynıdır; testte denetlenir. Bölüm türleri kendi kartlarıyla gelir.
//
// Görünüş bileşeni içeriği yalnız alan değerlerinden ve veriden alır: ürün adı, fiyat, görsel adresi ya da
// mağazaya özel metin elle yazılmaz (denetim/kurallar/bolum-icerigi.grit). Ekrandaki sabit metin metin
// dosyasından gelir. Mağaza adı, logo, iletişim ve menüler bağlamdan gelir (kart 0108, baglam.ts).
import type { ComponentType } from "react";
import { BaglantiSutunlariGorunumu } from "../bolumler/baglanti-sutunlari/gorunum";
import { BlogYazilariGorunumu } from "../bolumler/blog-yazilari/gorunum";
import { BultenKaydiGorunumu } from "../bolumler/bulten-kaydi/gorunum";
import { DuyuruSeridiGorunumu } from "../bolumler/duyuru-seridi/gorunum";
import { FirsatlarGorunumu } from "../bolumler/firsatlar/gorunum";
import { GenisAfisGorunumu } from "../bolumler/genis-afis/gorunum";
import { GuvenSeridiGorunumu } from "../bolumler/guven-seridi/gorunum";
import { IletisimBilgileriGorunumu } from "../bolumler/iletisim-bilgileri/gorunum";
import { KampanyaAfisleriGorunumu } from "../bolumler/kampanya-afisleri/gorunum";
import { KategoriKutulariGorunumu } from "../bolumler/kategori-kutulari/gorunum";
import { KayanAfisGorunumu } from "../bolumler/kayan-afis/gorunum";
import { MarkaLogolariGorunumu } from "../bolumler/marka-logolari/gorunum";
import { MenuSatiriGorunumu } from "../bolumler/menu-satiri/gorunum";
import { MusteriYorumlariGorunumu } from "../bolumler/musteri-yorumlari/gorunum";
import { OdemeIsaretleriGorunumu } from "../bolumler/odeme-isaretleri/gorunum";
import { SekmeliVitrinGorunumu } from "../bolumler/sekmeli-vitrin/gorunum";
import { SosyalHesaplarGorunumu } from "../bolumler/sosyal-hesaplar/gorunum";
import { TelifSatiriGorunumu } from "../bolumler/telif-satiri/gorunum";
import { UrunVitriniGorunumu } from "../bolumler/urun-vitrini/gorunum";
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
