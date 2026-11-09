// Bölüm türlerinin görünüşleri (kart 0106, karar 0081): türün kodundan çizen bileşene. Anahtarlar bölüm
// kütüphanesindekilerle (kutuphane.ts) aynıdır; testte denetlenir. Bölüm türleri kendi kartlarıyla gelir.
//
// Görünüş bileşeni içeriği yalnız alan değerlerinden ve veriden alır: ürün adı, fiyat, görsel adresi ya da
// mağazaya özel metin elle yazılmaz (denetim/kurallar/bolum-icerigi.grit). Ekrandaki sabit metin metin
// dosyasından gelir.
import type { ComponentType } from "react";
import type { BolumDegerleri } from "./tarif.ts";

export type BolumGorunumuOzellikleri = { gorunum: string; degerler: BolumDegerleri };
export type BolumGorunumleri = Readonly<Record<string, ComponentType<BolumGorunumuOzellikleri>>>;

export const bolumGorunumleri: BolumGorunumleri = {};
