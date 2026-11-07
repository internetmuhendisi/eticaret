// Kategori modülünün izinleri (kart 0077, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Silme ayrı izindir: sınırlı role kategori değiştirme ve taşıma verilip silme verilmeyebilir (karar 0063).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const kategoriIzinleri = {
  "kategori.gor": { giris: "yonetici", kapsam: "tumu" },
  "kategori.degistir": { giris: "yonetici", kapsam: "tumu" },
  "kategori.sil": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
