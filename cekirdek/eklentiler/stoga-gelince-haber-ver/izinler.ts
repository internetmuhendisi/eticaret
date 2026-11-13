// Stoğa gelince haber ver eklentisinin izinleri (kart 0144, karar 0040 ve 0117). Kayıt: cekirdek/kayitlar/izinler.ts.
// Giriş yapmış müşteri kendi hesabının e-postasıyla talep bırakır. Üye olmayan müşteri herkese açık uçla bırakır
// (izin yok, robot korumalı). Yöneticinin panelde bekleyen talepleri görmesi stok bilgisidir: stok.gor ister,
// yeni rol izni gerekmez.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const stokBildirimiIzinleri = {
  "stok-bildirimi.kendi.iste": { giris: "musteri", kapsam: "kendi" },
} as const satisfies Record<string, IzinTanimi>;
