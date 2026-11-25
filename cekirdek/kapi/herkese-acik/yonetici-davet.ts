// Ekibe davetin kabul sayfasının uçları (kart 0275, karar 0179; uç belgesi cekirdek/kapi/uclar.md). Davetle gelen kişi
// henüz hesabı olmadığı için izin taşıyamaz: uçlar herkese açık girişte, sıkı sınırlıdır. Bağlantının anahtarı 32 bayt
// rastgeledir, tahmin edilemez: robot sorusu yoktur. Kullanılmış, süresi dolmuş, geri alınmış ve uydurma bağlantı aynı
// cevabı alır. Tema demosunda kapalıdır: hesap doğurur (karar 0127).
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { davetiKabulEt, davetiOku } from "../../moduller/ekip/davet.ts";
import { davetKabulSemasi, davetOkuSemasi } from "../../moduller/ekip/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { girisAdimiCereziYaz } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

// POST /kapi/herkese-acik/yonetici-davet-oku: bağlantının davet ettiği e-posta ve roller.
export const yoneticiDavetOkuUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: davetOkuSemasi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async ({ anahtar }) => davetiOku(siteninVeritabani(), anahtar),
});

// POST /kapi/herkese-acik/yonetici-davet-kabul: hesabı açar ve iki aşamalı girişin kurulumu için ara adımı çereze
// yazar; ekran kurulum sayfasına geçer. Oturum açılmaz (karar 0044).
export const yoneticiDavetKabulUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: davetKabulSemasi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async (girdi, _istek, yanit) => {
    const { adimAnahtari } = await davetiKabulEt(siteninVeritabani(), girdi);
    yanit.cerezYaz(girisAdimiCereziYaz(adimAnahtari));
    return { sonraki: "kurulum" as const };
  },
});
