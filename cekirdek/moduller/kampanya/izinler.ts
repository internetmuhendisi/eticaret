// Kampanya modülünün izinleri (kart 0313, karar 0040 ve 0188). Kayıt: cekirdek/kayitlar/izinler.ts.
// Kuponları görmek görevliye ve sipariş görevlisine de açıktır (müşterinin kupon sorusunu cevaplarlar); açmak,
// değiştirmek ve kapatmak yalnız mağaza sahibinindir: kupon doğrudan ciroyu etkiler (kullanıcı kararı).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const kampanyaIzinleri = {
  "kupon.gor": { giris: "yonetici", kapsam: "tumu" },
  "kupon.degistir": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
