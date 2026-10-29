// Sunucuda konsola yazılan her satır günlükten geçer (kart 0014, karar 0025). Next.js ve
// kütüphaneler hataları kendileri konsola yazar; bu satırlar da seviyeli, site kod adlı ve
// maskelenmiş olur. Uygulama açılırken bir kez çağrılır (instrumentation.ts).
import type { GunlukSeviyesi } from "../kayitlar/izleme.ts";
import { type Gunluk, gunluk } from "./gunluk.ts";

const konsolSeviyeleri = {
  debug: "bilgi",
  info: "bilgi",
  log: "bilgi",
  warn: "uyari",
  error: "hata",
} as const satisfies Partial<Record<keyof Console, GunlukSeviyesi>>;

// İlk değer metinse satırın mesajıdır, öteki değerler alanlara gider.
const konsolSatiri =
  (yaz: Gunluk[GunlukSeviyesi]) =>
  (...degerler: unknown[]): void => {
    const [ilk, ...geri] = degerler;
    // Next.js satır arası için boş satır yazar; günlükte boş satır olmaz.
    if (degerler.length === 0 || (ilk === "" && geri.length === 0)) return;
    if (typeof ilk === "string") {
      yaz(ilk, geri.length === 0 ? {} : { degerler: geri });
    } else {
      yaz("konsol", { degerler });
    }
  };

export const konsoluGunlugeBagla = (hedef: Gunluk = gunluk): void => {
  for (const [yontem, seviye] of Object.entries(konsolSeviyeleri)) {
    Object.assign(console, { [yontem]: konsolSatiri(hedef[seviye]) });
  }
};
