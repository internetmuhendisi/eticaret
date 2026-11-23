// Müşteri modülünün izinleri (karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts. Müşterinin rolü
// yoktur: geçerli oturumu olan her müşteri kendi izinlerine sahiptir, kapsamı yalnız kendi kayıtlarıdır. Yöneticinin
// izinleri panelin müşteri ekranlarınındır.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const musteriIzinleri = {
  "musteri.kendi-hesabi.gor": { giris: "musteri", kapsam: "kendi" },
  // Hesap bilgileri: şifre değiştirme ve kampanya izni (kart 0237).
  "musteri.kendi-hesabi.degistir": { giris: "musteri", kapsam: "kendi" },
  // Adres defteri (kart 0237, karar 0149).
  "musteri.kendi-adresleri.gor": { giris: "musteri", kapsam: "kendi" },
  "musteri.kendi-adresleri.degistir": { giris: "musteri", kapsam: "kendi" },
  // Panelin müşteri ekranları (kart 0271, karar 0173): listeyi ve ayrıntıyı görmek (kişisel veri), not eklemek ve
  // silmek, müşteriye şifre sıfırlama bağlantısı göndermek. Görevlide yok (kullanıcı kararı); ileride "Sipariş
  // görevlisi" rolü (kart 0274) görür.
  "musteri.gor": { giris: "yonetici", kapsam: "tumu" },
  "musteri.not": { giris: "yonetici", kapsam: "tumu" },
  "musteri.sifre-sifirlama": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
