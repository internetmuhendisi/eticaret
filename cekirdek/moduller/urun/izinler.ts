// Ürün modülünün izinleri (kart 0076, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Silme ayrı izindir: sınırlı role ürün değiştirme verilip silme verilmeyebilir (karar 0062).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const urunIzinleri = {
  "urun.gor": { giris: "yonetici", kapsam: "tumu" },
  "urun.degistir": { giris: "yonetici", kapsam: "tumu" },
  "urun.sil": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
