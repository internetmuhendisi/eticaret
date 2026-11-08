// Etiket modülünün izinleri (kart 0078, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Silme ayrı izindir: sınırlı role değiştirme verilip silme verilmeyebilir (karar 0064).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const etiketIzinleri = {
  "etiket.gor": { giris: "yonetici", kapsam: "tumu" },
  "etiket.degistir": { giris: "yonetici", kapsam: "tumu" },
  "etiket.sil": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
