// İçerik modülünün izinleri (kart 0272, karar 0040 ve 0176). Kayıt: cekirdek/kayitlar/izinler.ts.
// Bugün yalnız tam yetkili rol (mağaza sahibi) taşır; "İçerik editörü" rolü kart 0274'te gelir.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const icerikIzinleri = {
  "icerik.gor": { giris: "yonetici", kapsam: "tumu" },
  "icerik.degistir": { giris: "yonetici", kapsam: "tumu" },
  "icerik.sil": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
