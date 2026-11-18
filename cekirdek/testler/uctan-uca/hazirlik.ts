// Tarayıcı testlerinden önce bir kez çalışır (kart 0129): sitenin başlangıç kataloğunu, menülerini ve düzenini
// arka plan sürecinin açılıştaki işleviyle kurar. Testler sitenin gerçek hâlini görür; kontrol hattında arka plan
// süreci açılmadığı için düzen başka türlü kurulmaz ve düzene yazan testler "hizmet kullanılamıyor" alır.
// Kuruluysa hiçbir şey yazmaz. Bir adım yazılamazsa testler başlamaz.
//
// Sonra uygulamanın her yolunu bir kez ister (kart 0222, isinma.ts): Playwright sunucuyu hazırlıktan önce açar,
// yollar testler başlamadan derlenir.
import { existsSync } from "node:fs";
import type { FullConfig } from "@playwright/test";
import { baslangiclariKur } from "../../arka-plan-isleri/baslangic";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { yollariIsit } from "./isinma";

export default async function hazirlik(ayar: FullConfig): Promise<void> {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const vt = baglan(veritabaniAdresi());
  try {
    await baslangiclariKur(vt, (hata, adim) => {
      throw new Error(`Tarayıcı testlerinin hazırlığı: ${adim} yazılamadı.`, { cause: hata });
    });
  } finally {
    await vt.$client.end();
  }
  const kokAdres = ayar.projects[0]?.use.baseURL;
  if (kokAdres === undefined) throw new Error("Tarayıcı testlerinin hazırlığı: kök adres yok.");
  await yollariIsit(kokAdres);
}
