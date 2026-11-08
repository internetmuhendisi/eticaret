// Ürün özelliği modülünün izinleri (kart 0086, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Silme ayrı izindir: görevli özellik ekler ve değiştirir, silemez (kullanıcı kararı, karar 0072).
// Ürünün özellik değerleri ürünün parçasıdır, urun.degistir ile yazılır.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const ozellikIzinleri = {
  "ozellik.gor": { giris: "yonetici", kapsam: "tumu" },
  "ozellik.degistir": { giris: "yonetici", kapsam: "tumu" },
  "ozellik.sil": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
