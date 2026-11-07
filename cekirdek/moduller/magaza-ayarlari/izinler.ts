// Mağaza ayarları modülünün izinleri (kart 0069, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const magazaAyarlariIzinleri = {
  "magaza-ayarlari.gor": { giris: "yonetici", kapsam: "tumu" },
  "magaza-ayarlari.degistir": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
