// Marka modülünün izinleri (kart 0078, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Silme ayrı izindir: sınırlı role değiştirme verilip silme verilmeyebilir (karar 0064).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const markaIzinleri = {
  "marka.gor": { giris: "yonetici", kapsam: "tumu" },
  "marka.degistir": { giris: "yonetici", kapsam: "tumu" },
  "marka.sil": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
