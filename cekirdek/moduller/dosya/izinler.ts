// Dosya modülünün izinleri (kart 0261, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Sitedeki görselleri görmek: panelin görsel önizlemesi ve görsel seçimi (kategori görseli, marka logosu, vitrin
// bölümleri). Görsel kendi başına gizli bilgi değildir; görevli de görür (kart 0261).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const dosyaIzinleri = {
  "dosya.gor": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
