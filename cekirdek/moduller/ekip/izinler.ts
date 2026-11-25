// Ekip modülünün izinleri (karar 0040). Kayıt: cekirdek/kayitlar/izinler.ts.
import type { IzinTanimi } from "../../kayitlar/izinler.ts";

export const ekipIzinleri = {
  "ekip.kendi-hesabi.gor": { giris: "yonetici", kapsam: "kendi" },
  "ekip.gor": { giris: "yonetici", kapsam: "tumu" },
  "ekip.rol-ata": { giris: "yonetici", kapsam: "tumu" },
  // Kart 0274: yöneticinin hesabını kapatır ve iki aşamalı girişini sıfırlar (kart 0053); yönetici kendi yedek
  // kodlarını yeniler.
  "ekip.hesap-kapat": { giris: "yonetici", kapsam: "tumu" },
  "ekip.iki-asama-sifirla": { giris: "yonetici", kapsam: "tumu" },
  "ekip.kendi-hesabi.degistir": { giris: "yonetici", kapsam: "kendi" },
  // Kart 0275: ekibe davet gönderir ve bekleyen daveti geri alır.
  "ekip.davet-et": { giris: "yonetici", kapsam: "tumu" },
} as const satisfies Record<string, IzinTanimi>;
