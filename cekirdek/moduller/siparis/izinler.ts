// Sipariş modülünün izinleri (kart 0214, karar 0040 ve 0141). Kayıt: cekirdek/kayitlar/izinler.ts. Bu kartta müşteri
// yalnız kendi havale siparişi için ödediğini bildirir; üye olmayan müşteri herkese açık uçla, numara ve e-postayla
// bildirir. Siparişleri görmek ve yönetmek on üçüncü bölümdedir.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const siparisIzinleri = {
  "siparis.kendi.havale-bildir": { giris: "musteri", kapsam: "kendi" },
} as const satisfies Record<string, IzinTanimi>;
