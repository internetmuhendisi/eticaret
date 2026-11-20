// Sipariş modülünün izinleri (kart 0214, 0234; karar 0040, 0141, 0145). Kayıt: cekirdek/kayitlar/izinler.ts. Müşteri
// yalnız kendi havale siparişi için ödediğini bildirir; üye olmayan müşteri herkese açık uçla, numara ve e-postayla
// bildirir. Yönetici siparişleri görür (siparis.gor), hazırlamaya alır, kargoya verir, teslim işaretler ve not ekler
// (siparis.yonet); havaleyi yalnız onaylama izni olan onaylar (kullanıcı kararı: görevlide yok, para işidir). İptal ve
// iade de para işidir, ayrı izindir (siparis.iade, görevlide yok). Müşteri kendi siparişi için iade talebi açar ve ayar
// izin veriyorsa siparişini kendisi iptal eder (kart 0239); talebin onayı ve reddi iade kararıdır, siparis.iade
// ister (kullanıcı kararı, karar 0151).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const siparisIzinleri = {
  "siparis.kendi.havale-bildir": { giris: "musteri", kapsam: "kendi" },
  "siparis.kendi.iade-talebi": { giris: "musteri", kapsam: "kendi" },
  "siparis.kendi.iptal": { giris: "musteri", kapsam: "kendi" },
  "siparis.gor": { giris: "yonetici", kapsam: "tumu" },
  "siparis.yonet": { giris: "yonetici", kapsam: "tumu" },
  "siparis.havale-onayla": { giris: "yonetici", kapsam: "tumu" },
  // İptal ve iade (kart 0235, karar 0147): para işidir, yalnız mağaza sahibi (kullanıcı kararı). İade talebinin
  // onayı ve reddi de bu izinledir (kart 0239).
  "siparis.iade": { giris: "yonetici", kapsam: "tumu" },
  // Elle sipariş (kart 0236, karar 0148): görevli de girer (siparis.yonet); "ödeme alındı" ile açmak para işidir, ayrı
  // izindir (görevlide yok, kullanıcı kararı).
  "siparis.elden-tahsil": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
