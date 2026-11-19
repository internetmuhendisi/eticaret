// Sipariş modülünün izinleri (kart 0214, 0234; karar 0040, 0141, 0145). Kayıt: cekirdek/kayitlar/izinler.ts. Müşteri
// yalnız kendi havale siparişi için ödediğini bildirir; üye olmayan müşteri herkese açık uçla, numara ve e-postayla
// bildirir. Yönetici siparişleri görür (siparis.gor), hazırlamaya alır, kargoya verir, teslim işaretler ve not ekler
// (siparis.yonet); havaleyi yalnız onaylama izni olan onaylar (kullanıcı kararı: görevlide yok, para işidir). İptal ve
// iade de para işidir, ayrı izindir (siparis.iade, görevlide yok).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const siparisIzinleri = {
  "siparis.kendi.havale-bildir": { giris: "musteri", kapsam: "kendi" },
  "siparis.gor": { giris: "yonetici", kapsam: "tumu" },
  "siparis.yonet": { giris: "yonetici", kapsam: "tumu" },
  "siparis.havale-onayla": { giris: "yonetici", kapsam: "tumu" },
  // İptal ve iade (kart 0235, karar 0147): para işidir, yalnız mağaza sahibi (kullanıcı kararı).
  "siparis.iade": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
