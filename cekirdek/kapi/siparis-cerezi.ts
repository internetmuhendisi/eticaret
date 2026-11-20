// Sipariş çerezleri (kart 0214, 0238; karar 0141, 0150). Erişim çerezi yalnız sipariş alındı sayfasının, takip
// çerezi yalnız sipariş takibi sayfasının yoluna gider; ikisi de tarayıcının koduna açık değildir. Değerleri anahtardır,
// veritabanında özeti durur.
import { siparisErisimCerezi, siparisTakipCerezi } from "../kayitlar/siparis.ts";

export const siparisErisimCereziYaz = (anahtar: string): string =>
  `${siparisErisimCerezi.ad}=${anahtar}; Path=${siparisErisimCerezi.yol}; Max-Age=${siparisErisimCerezi.saniye}; HttpOnly; Secure; SameSite=Lax`;

export const siparisTakipCereziYaz = (anahtar: string): string =>
  `${siparisTakipCerezi.ad}=${anahtar}; Path=${siparisTakipCerezi.yol}; Max-Age=${siparisTakipCerezi.saniye}; HttpOnly; Secure; SameSite=Lax`;

export const siparisTakipCereziSil = (): string =>
  `${siparisTakipCerezi.ad}=; Path=${siparisTakipCerezi.yol}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
