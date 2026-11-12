// Favori modülünün izinleri (kart 0140, karar 0040 ve 0110). Kayıt: cekirdek/kayitlar/izinler.ts.
// Müşteri yalnız kendi favorilerini görür ve değiştirir. Yöneticinin favori izni yoktur: favoriler müşterinin
// kendi tercihidir.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const favoriIzinleri = {
  "favori.kendi.gor": { giris: "musteri", kapsam: "kendi" },
  "favori.kendi.degistir": { giris: "musteri", kapsam: "kendi" },
} as const satisfies Record<string, IzinTanimi>;
