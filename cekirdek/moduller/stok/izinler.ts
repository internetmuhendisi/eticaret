// Stok modülünün izinleri (kart 0082, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Görevli stoğu görür ve elle düzeltir (kullanıcı kararı, karar 0068). Siparişin düşürmesi ve iptalin
// artırması izin değil, sipariş akışının parçasıdır.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const stokIzinleri = {
  "stok.gor": { giris: "yonetici", kapsam: "tumu" },
  "stok.duzelt": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
