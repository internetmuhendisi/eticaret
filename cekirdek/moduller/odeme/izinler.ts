// Ödeme modülünün izinleri (kart 0213, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts. Üye olmayan müşterinin ödemesi
// herkese açık uçtadır; giriş yapmış müşteri kendi adına ödeme adımını tamamlar.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const odemeIzinleri = {
  "odeme.kendi.baslat": { giris: "musteri", kapsam: "kendi" },
} as const satisfies Record<string, IzinTanimi>;
