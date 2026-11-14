// POST /kapi/herkese-acik/yonetici-cikis (uç belgesi: cekirdek/kapi/uclar.md). Rolü olmayan yönetici
// de çıkabilmeli, süresi dolmuş oturumun çerezleri de silinmeli; bu yüzden izin istemez.
import { z } from "zod";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { girisAdimiCerezi } from "../../kayitlar/oturum.ts";
import { gunlukluCikis } from "../../moduller/oturum/giris.ts";
import { girisAdiminiSil } from "../../moduller/oturum/iki-asamali-giris.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import {
  cerezOku,
  girisAdimiCereziniSil,
  istektekiAnahtarlar,
  oturumCerezleriniSil,
} from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const yoneticiCikisUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "acik",
  sema: z.strictObject({}),
  izin: herkeseAcik,
  sinir: "genel",
  isle: async (_girdi, istek, yanit) => {
    // Önce çerezler: veritabanı kapalıyken de ortak bilgisayarda oturum tarayıcıda kalmasın.
    yanit.cerezYaz(...oturumCerezleriniSil("yonetici"), girisAdimiCereziniSil());
    await girisAdiminiSil(siteninVeritabani(), cerezOku(istek, girisAdimiCerezi));
    await gunlukluCikis(siteninVeritabani(), "yonetici", istektekiAnahtarlar(istek, "yonetici"));
    return {};
  },
});
