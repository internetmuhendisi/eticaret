// Düzen modülünün izinleri (kart 0106, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Temadaki kararla aynı: görevli düzeni ne görür ne değiştirir, mağazanın görünüşü yalnız mağaza sahibinin
// kararıdır (kart 0105, kullanıcı kararı).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const duzenIzinleri = {
  "duzen.gor": { giris: "yonetici", kapsam: "tumu" },
  "duzen.degistir": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
