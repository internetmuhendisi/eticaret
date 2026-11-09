// Menü modülünün izinleri (kart 0107, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
// Tema ve düzendeki kararla aynı: menüler mağazanın görünüşüdür, yalnız tam yetkili roller görür ve değiştirir
// (kart 0107, kullanıcı kararı). Silme değiştirmeye dahildir.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const menuIzinleri = {
  "menu.gor": { giris: "yonetici", kapsam: "tumu" },
  "menu.degistir": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
