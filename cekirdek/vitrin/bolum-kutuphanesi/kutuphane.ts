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
import { duyuruSeridi } from "../bolumler/duyuru-seridi/tarif.ts";
import { iletisimBilgileri } from "../bolumler/iletisim-bilgileri/tarif.ts";
import { menuSatiri } from "../bolumler/menu-satiri/tarif.ts";
import { odemeIsaretleri } from "../bolumler/odeme-isaretleri/tarif.ts";
import { sosyalHesaplar } from "../bolumler/sosyal-hesaplar/tarif.ts";
import { telifSatiri } from "../bolumler/telif-satiri/tarif.ts";
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
};
