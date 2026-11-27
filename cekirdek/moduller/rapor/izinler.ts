// Rapor modülünün izinleri (kart 0317, karar 0040 ve 0195). Kayıt: cekirdek/kayitlar/izinler.ts.
// Raporlar (ciro, sipariş, iade, vergi) yalnız mağaza sahibinindir: ticari bilgidir, görevlinin işi için gerekmez
// (kullanıcı kararı). Hazır sınırlı rollerin hiçbirinde yoktur; tam yetkili rol bütün izinleri taşır.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const raporIzinleri = {
  "rapor.gor": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
