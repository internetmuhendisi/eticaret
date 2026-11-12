// Yorum modülünün izinleri (kart 0139, karar 0040 ve 0109). Kayıt: cekirdek/kayitlar/izinler.ts.
// Müşteri yalnız kendi adına yorum yazar ve yazıp yazamayacağını sorar. Görevli yorumları görür, onaylar ya da
// reddeder ve ana sayfada gösterilecekleri işaretler (kart 0139, kullanıcı kararı).
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const yorumIzinleri = {
  "yorum.kendi.yaz": { giris: "musteri", kapsam: "kendi" },
  "yorum.gor": { giris: "yonetici", kapsam: "tumu" },
  "yorum.onayla": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
