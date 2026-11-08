// Fiyat modülünün izinleri (kart 0080, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Fiyatı değiştirmek ürünü değiştirmekten ayrı izindir: görevli fiyatı görür, değiştiremez (karar 0066).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const fiyatIzinleri = {
  "fiyat.gor": { giris: "yonetici", kapsam: "tumu" },
  "fiyat.degistir": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
