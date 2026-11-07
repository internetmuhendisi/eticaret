// Şifre sıfırlama uçları (uç belgesi: cekirdek/kapi/uclar.md, kart 0034, karar 0052). Yönetici ve müşteri
// için aynı tanım. Giriş yapmamış kişi izin taşıyamayacağı için herkese açık giriştedir.
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { type HesapTuru, sifreSifirlamaAyari } from "../../kayitlar/oturum.ts";
import { sifirlamaIstekSemasi, sifreYenileSemasi } from "../../moduller/oturum/semalar.ts";
import { sifreSifirlamaIste, sifreYenile } from "../../moduller/oturum/sifre-sifirlama.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { vitrinAdresleri } from "../../vitrin/adresler.ts";
import { sifreYenileAdresi } from "../../yonetim-paneli/adresler.ts";
import { ucTanimla } from "../uc.ts";

const yenilemeYollari: Record<HesapTuru, string> = {
  musteri: vitrinAdresleri.sifreYenile,
  yonetici: sifreYenileAdresi,
};

const sifirlamaIstekUcu = (tur: HesapTuru) =>
  ucTanimla({
    giris: "herkese-acik",
    sema: sifirlamaIstekSemasi,
    izin: herkeseAcik,
    sinir: "siki",
    isle: async ({ robotCevabi, ...girdi }) => {
      await robotCevabiniDogrula(robotCevabi);
      // Cevap süresi hesabın kayıtlı olup olmadığını söylemesin.
      const enErken = Date.now() + sifreSifirlamaAyari.enAzCevapMs;
      await sifreSifirlamaIste(siteninVeritabani(), tur, girdi, yenilemeYollari[tur]);
      await new Promise((coz) => setTimeout(coz, Math.max(0, enErken - Date.now())));
      return {};
    },
  });

const sifreYenileUcu = (tur: HesapTuru) =>
  ucTanimla({
    giris: "herkese-acik",
    sema: sifreYenileSemasi,
    izin: herkeseAcik,
    sinir: "siki",
    isle: async (girdi) => {
      await sifreYenile(siteninVeritabani(), tur, girdi);
      return {};
    },
  });

export const musteriSifreSifirlamaUcu = sifirlamaIstekUcu("musteri");
export const yoneticiSifreSifirlamaUcu = sifirlamaIstekUcu("yonetici");
export const musteriSifreYenileUcu = sifreYenileUcu("musteri");
export const yoneticiSifreYenileUcu = sifreYenileUcu("yonetici");
