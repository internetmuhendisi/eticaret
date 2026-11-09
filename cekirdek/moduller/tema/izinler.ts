// Tema modülünün izinleri (kart 0105, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Görevli temayı ne görür ne değiştirir: mağazanın görünüşü yalnız mağaza sahibinin kararıdır
// (kart 0105, kullanıcı kararı).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const temaIzinleri = {
  "tema.gor": { giris: "yonetici", kapsam: "tumu" },
  "tema.degistir": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
