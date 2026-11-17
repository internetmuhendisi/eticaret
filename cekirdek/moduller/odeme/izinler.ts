// Ödeme modülünün izinleri (kart 0213, karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts. Üye olmayan müşterinin ödemesi
// herkese açık uçtadır; giriş yapmış müşteri kendi adına ödeme adımını tamamlar.
// Ödeme yöntemleri ve banka hesapları (kart 0214, karar 0141): görmek ve değiştirmek ayrı izindir; banka hesabının
// değişmesi paranın gittiği hesabın değişmesidir (kullanıcı kararı: görevli görür, değiştiremez).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const odemeIzinleri = {
  "odeme.kendi.baslat": { giris: "musteri", kapsam: "kendi" },
} as const satisfies Record<string, IzinTanimi>;

export const odemeYontemiIzinleri = {
  "odeme-yontemi.gor": { giris: "yonetici", kapsam: "tumu" },
  "odeme-yontemi.degistir": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
