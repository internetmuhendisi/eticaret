// Müşteri modülünün izinleri (karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts. Müşterinin rolü
// yoktur: geçerli oturumu olan her müşteri bu izinlere sahiptir, kapsamı yalnız kendi kayıtlarıdır.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const musteriIzinleri = {
  "musteri.kendi-hesabi.gor": { giris: "musteri", kapsam: "kendi" },
} as const satisfies Record<string, IzinTanimi>;
