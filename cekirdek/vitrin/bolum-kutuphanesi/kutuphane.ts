// Bölüm kütüphanesi (kart 0106, karar 0081): mağazanın düzenine konabilecek bölüm türlerinin tarifleri.
// Her bölüm türünün kodu (tarifi ve görünüşü) cekirdek/vitrin/bolumler/<tür>/ klasöründedir ve elle içerik
// taşıyamaz (denetim/kurallar/bolum-icerigi.grit); bu klasör kütüphanenin altyapısıdır.
// Tema ve site klasörü yalnız buradaki türlere başvurabilir. Her türün görünüşü gorunumler.tsx'tedir; ikisinin
// anahtarları aynı olmalı (testler/kutuphane.test.ts).
//
// Bölüm türleri kendi kartlarıyla gelir (0108 üst ve alt kısım, 0110 afiş ve tanıtım, 0111 ürün, 0112
// işleve bağlı bölümler). O güne kadar kütüphane boştur; kütüphanenin kendisi bir deneme bölümüyle
// sınanır (cekirdek/katalog/deneme-bolumu/).
import type { BolumKutuphanesi } from "./duzen.ts";

export const bolumKutuphanesi: BolumKutuphanesi = {};
