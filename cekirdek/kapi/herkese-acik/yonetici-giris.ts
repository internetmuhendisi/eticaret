// POST /kapi/herkese-acik/yonetici-giris (uç belgesi: cekirdek/kapi/uclar.md). Giriş yapmamış kişi
// izin taşıyamayacağı için herkese açık giriştedir.
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { yoneticiSifreAsamasi } from "../../moduller/oturum/iki-asamali-giris.ts";
import { girisSemasi } from "../../moduller/oturum/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { istemciAdresi, sayacAdresi } from "../istek-siniri.ts";
import { girisAdimiCereziYaz } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const yoneticiGirisUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "acik",
  sema: girisSemasi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async (girdi, istek, yanit) => {
    // Oturum açılmaz: yalnız ara adım. Oturum koddan ya da kurulumdan sonra başlar (kart 0028).
    const { anahtar, durum } = await yoneticiSifreAsamasi(
      siteninVeritabani(),
      girdi,
      sayacAdresi(istemciAdresi(istek)),
    );
    yanit.cerezYaz(girisAdimiCereziYaz(anahtar));
    return { sonraki: durum };
  },
});
