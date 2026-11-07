// Vergi modülünün izinleri (kart 0074, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const vergiIzinleri = {
  "vergi.gor": { giris: "yonetici", kapsam: "tumu" },
  "vergi.degistir": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
