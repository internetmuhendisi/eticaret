// POST /kapi/herkese-acik/yonetici-kurulum-onay (uç belgesi: cekirdek/kapi/uclar.md). İki aşamalı girişin
// kurulumunu ilk kodla bitirir, yedek kodları bir kez döner. Henüz oturum yoktur, izin taşınamaz.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { girisAdimiCerezi } from "../../kayitlar/oturum.ts";
import { kurulumuOnayla } from "../../moduller/oturum/iki-asamali-giris.ts";
import { kodSemasi } from "../../moduller/oturum/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { istemciAdresi, sayacAdresi } from "../istek-siniri.ts";
import {
  cerezOku,
  girisAdimiCereziniSil,
  oturumCerezleri,
  oturumSuresiSaniye,
} from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const yoneticiKurulumOnayUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "acik",
  sema: kodSemasi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async ({ kod }, istek, yanit) => {
    const sure = oturumSuresiSaniye("yonetici", calisanSite().ayarlar);
    const { anahtarlar, yedekKodlari } = await kurulumuOnayla(
      siteninVeritabani(),
      cerezOku(istek, girisAdimiCerezi),
      kod,
      sayacAdresi(istemciAdresi(istek)),
      sure,
    );
    yanit.cerezYaz(...oturumCerezleri("yonetici", anahtarlar, sure), girisAdimiCereziniSil());
    return { yedekKodlari };
  },
});
