// Eksik parçalı uç örnekleri (kart 0013, karar 0024). Her örnek tür kontrolünde hata vermelidir.
// Örneğin üstündeki beklenen hata yorumu, altındaki satır hatasız derlenirse kendisi hata verir;
// böylece eksik parçalı bir uç tür kontrolünden geçmeye başlarsa kontrol kırmızıya düşer.
// Dosya çalışmaz, yalnız tür kontrolü içindir.
import { z } from "zod";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { ucTanimla } from "../uc.ts";

export const eksikUcOrnekleri = () => [
  // @ts-expect-error tema demosundaki durumu beyan edilmemiş herkese açık uç (kart 0116)
  ucTanimla({
    giris: "herkese-acik",
    sema: z.strictObject({}),
    izin: herkeseAcik,
    sinir: "genel",
    isle: async () => 1,
  }),
  ucTanimla({
    giris: "yonetici",
    sema: z.strictObject({}),
    izin: "ekip.gor",
    sinir: "genel",
    // @ts-expect-error tema demosu beyanı yalnız herkese açık girişte yazılır
    temaDemosunda: "kapali",
    isle: async () => 1,
  }),
  // @ts-expect-error şemasız uç
  ucTanimla({ giris: "herkese-acik", izin: herkeseAcik, sinir: "genel", isle: async () => 1 }),
  // @ts-expect-error izinsiz uç
  ucTanimla({
    giris: "herkese-acik",
    sema: z.strictObject({}),
    sinir: "genel",
    isle: async () => 1,
  }),
  // @ts-expect-error sınırsız uç
  ucTanimla({
    giris: "herkese-acik",
    sema: z.strictObject({}),
    izin: herkeseAcik,
    isle: async () => 1,
  }),
  ucTanimla({
    giris: "yonetici",
    sema: z.strictObject({}),
    // @ts-expect-error herkese açık beyanı yalnız herkese açık girişte geçerlidir
    izin: herkeseAcik,
    sinir: "genel",
    isle: async () => 1,
  }),
  ucTanimla({
    giris: "musteri",
    sema: z.strictObject({}),
    // @ts-expect-error yönetici izni müşteri girişinde geçerli değildir
    izin: "ekip.gor",
    sinir: "genel",
    isle: async () => 1,
  }),
  ucTanimla({
    giris: "yonetici",
    sema: z.strictObject({}),
    // @ts-expect-error müşteri izni yönetici girişinde geçerli değildir
    izin: "musteri.kendi-hesabi.gor",
    sinir: "genel",
    isle: async () => 1,
  }),
  ucTanimla({
    giris: "yonetici",
    sema: z.strictObject({}),
    // @ts-expect-error kayıtta olmayan izin
    izin: "ekip.uydurma",
    sinir: "genel",
    isle: async () => 1,
  }),
  ucTanimla({
    giris: "sahip",
    sema: z.strictObject({}),
    // @ts-expect-error sahip girişinin henüz izni yoktur, uç yazılamaz
    izin: "ekip.gor",
    sinir: "genel",
    isle: async () => 1,
  }),
  ucTanimla({
    // @ts-expect-error kayıtta olmayan giriş
    giris: "gizli",
    sema: z.strictObject({}),
    izin: herkeseAcik,
    sinir: "genel",
    isle: async () => 1,
  }),
];
