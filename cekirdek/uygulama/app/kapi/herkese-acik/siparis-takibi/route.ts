// Kapının adres dosyası yalnız ucu bağlar; uç cekirdek/kapi/ altında tanımlıdır.
import {
  siparisTakibiKapatUcu,
  siparisTakibiUcu,
} from "../../../../../kapi/herkese-acik/siparis-takibi";

export const POST = siparisTakibiUcu;
export const DELETE = siparisTakibiKapatUcu;
