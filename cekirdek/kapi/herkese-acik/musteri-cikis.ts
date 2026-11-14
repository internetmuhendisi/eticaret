// POST /kapi/herkese-acik/musteri-cikis (uç belgesi: cekirdek/kapi/uclar.md). Süresi dolmuş oturumun
// çerezleri de silinsin diye izin istemez.
import { z } from "zod";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { gunlukluCikis } from "../../moduller/oturum/giris.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { istektekiAnahtarlar, oturumCerezleriniSil } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const musteriCikisUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: z.strictObject({}),
  izin: herkeseAcik,
  sinir: "genel",
  isle: async (_girdi, istek, yanit) => {
    // Önce çerezler: veritabanı kapalıyken de ortak bilgisayarda oturum tarayıcıda kalmasın.
    yanit.cerezYaz(...oturumCerezleriniSil("musteri"));
    await gunlukluCikis(siteninVeritabani(), "musteri", istektekiAnahtarlar(istek, "musteri"));
    return {};
  },
});
