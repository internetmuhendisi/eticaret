// Sipariş çerezleri (kart 0214, 0238; karar 0141, 0150). Erişim çerezi yalnız sipariş alındı sayfasının, takip
// çerezi yalnız sipariş takibi sayfasının yoluna gider; ikisi de tarayıcının koduna açık değildir. Değerleri anahtardır,
// veritabanında özeti durur.
import { siparisErisimCerezi, siparisTakipCerezi } from "../kayitlar/siparis.ts";

export const siparisErisimCereziYaz = (anahtar: string): string =>
  `${siparisErisimCerezi.ad}=${anahtar}; Path=${siparisErisimCerezi.yol}; Max-Age=${siparisErisimCerezi.saniye}; HttpOnly; Secure; SameSite=Lax`;

// Takip çerezi iki yola yazılır: sayfanın yolu ve takip uçlarının yolu (kart 0239). Tarayıcı çerezi yalnız yolunun
// altına gönderir: uçlar (talep, iptal, takibi kapatma) sayfanın çerezini görmez.
const takipYollari = [siparisTakipCerezi.yol, siparisTakipCerezi.kapiYolu] as const;

export const siparisTakipCereziYaz = (anahtar: string): string[] =>
  takipYollari.map(
    (yol) =>
      `${siparisTakipCerezi.ad}=${anahtar}; Path=${yol}; Max-Age=${siparisTakipCerezi.saniye}; HttpOnly; Secure; SameSite=Lax`,
  );

export const siparisTakipCereziSil = (): string[] =>
  takipYollari.map(
    (yol) => `${siparisTakipCerezi.ad}=; Path=${yol}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
