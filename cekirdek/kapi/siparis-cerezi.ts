// Sipariş alındı sayfasının erişim çerezi (kart 0214, karar 0141). Yalnız sipariş alındı sayfasının yoluna gider,
// tarayıcının koduna açık değildir; değeri siparişin erişim anahtarıdır, veritabanında özeti durur.
import { siparisErisimCerezi } from "../kayitlar/siparis.ts";

export const siparisErisimCereziYaz = (anahtar: string): string =>
  `${siparisErisimCerezi.ad}=${anahtar}; Path=${siparisErisimCerezi.yol}; Max-Age=${siparisErisimCerezi.saniye}; HttpOnly; Secure; SameSite=Lax`;
