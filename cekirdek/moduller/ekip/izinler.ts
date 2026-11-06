// Ekip modülünün izinleri (karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const ekipIzinleri = {
  "ekip.kendi-hesabi.gor": { giris: "yonetici", kapsam: "kendi" },
  "ekip.gor": { giris: "yonetici", kapsam: "tumu" },
  "ekip.rol-ata": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
