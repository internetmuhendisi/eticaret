// Müşteri modülünün izinleri (karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts. Müşterinin rolü
// yoktur: geçerli oturumu olan her müşteri bu izinlere sahiptir, kapsamı yalnız kendi kayıtlarıdır.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const musteriIzinleri = {
  "musteri.kendi-hesabi.gor": { giris: "musteri", kapsam: "kendi" },
  // Hesap bilgileri: şifre değiştirme ve kampanya izni (kart 0237).
  "musteri.kendi-hesabi.degistir": { giris: "musteri", kapsam: "kendi" },
  // Adres defteri (kart 0237, karar 0149).
  "musteri.kendi-adresleri.gor": { giris: "musteri", kapsam: "kendi" },
  "musteri.kendi-adresleri.degistir": { giris: "musteri", kapsam: "kendi" },
} as const satisfies Record<string, IzinTanimi>;
