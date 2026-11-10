// Bölüm kütüphanesi (kart 0106, karar 0081): mağazanın düzenine konabilecek bölüm türlerinin tarifleri.
// Her bölüm türünün kodu (tarifi ve görünüşü) cekirdek/vitrin/bolumler/<tür>/ klasöründedir ve elle içerik
// taşıyamaz (denetim/kurallar/bolum-icerigi.grit); bu klasör kütüphanenin altyapısıdır.
// Tema ve site klasörü yalnız buradaki türlere başvurabilir. Her türün görünüşü gorunumler.tsx'tedir; ikisinin
// anahtarları aynı olmalı (testler/kutuphane.test.ts).
//
// Bölüm türleri kendi kartlarıyla gelir: 0108 üst ve alt kısım (karar 0083), 0110 afiş ve tanıtım, 0111 ürün,
// 0112 işleve bağlı bölümler. Kütüphanenin kendisi ayrıca bir deneme bölümüyle sınanır
// (cekirdek/katalog/deneme-bolumu/).
import { baglantiSutunlari } from "../bolumler/baglanti-sutunlari/tarif.ts";
import { blogYazilari } from "../bolumler/blog-yazilari/tarif.ts";
import { bultenKaydi } from "../bolumler/bulten-kaydi/tarif.ts";
import { duyuruSeridi } from "../bolumler/duyuru-seridi/tarif.ts";
import { firsatlar } from "../bolumler/firsatlar/tarif.ts";
import { genisAfis } from "../bolumler/genis-afis/tarif.ts";
import { guvenSeridi } from "../bolumler/guven-seridi/tarif.ts";
import { iletisimBilgileri } from "../bolumler/iletisim-bilgileri/tarif.ts";
import { kampanyaAfisleri } from "../bolumler/kampanya-afisleri/tarif.ts";
import { kategoriKutulari } from "../bolumler/kategori-kutulari/tarif.ts";
import { kayanAfis } from "../bolumler/kayan-afis/tarif.ts";
import { markaLogolari } from "../bolumler/marka-logolari/tarif.ts";
import { menuSatiri } from "../bolumler/menu-satiri/tarif.ts";
import { musteriYorumlari } from "../bolumler/musteri-yorumlari/tarif.ts";
import { odemeIsaretleri } from "../bolumler/odeme-isaretleri/tarif.ts";
import { sekmeliVitrin } from "../bolumler/sekmeli-vitrin/tarif.ts";
import { sosyalHesaplar } from "../bolumler/sosyal-hesaplar/tarif.ts";
import { telifSatiri } from "../bolumler/telif-satiri/tarif.ts";
import { urunVitrini } from "../bolumler/urun-vitrini/tarif.ts";
import { ustSatir } from "../bolumler/ust-satir/tarif.ts";
import type { BolumKutuphanesi } from "./duzen.ts";

export const bolumKutuphanesi: BolumKutuphanesi = {
  "duyuru-seridi": duyuruSeridi,
  "ust-satir": ustSatir,
  "menu-satiri": menuSatiri,
  "baglanti-sutunlari": baglantiSutunlari,
  "iletisim-bilgileri": iletisimBilgileri,
  "sosyal-hesaplar": sosyalHesaplar,
  "odeme-isaretleri": odemeIsaretleri,
  "telif-satiri": telifSatiri,
  "kayan-afis": kayanAfis,
  "guven-seridi": guvenSeridi,
  "kampanya-afisleri": kampanyaAfisleri,
  "genis-afis": genisAfis,
  "kategori-kutulari": kategoriKutulari,
  "urun-vitrini": urunVitrini,
  "sekmeli-vitrin": sekmeliVitrin,
  firsatlar,
  "marka-logolari": markaLogolari,
  "musteri-yorumlari": musteriYorumlari,
  "blog-yazilari": blogYazilari,
  "bulten-kaydi": bultenKaydi,
};
