// POST /kapi/herkese-acik/musteri-giris (uç belgesi: cekirdek/kapi/uclar.md). Giriş yapmamış kişi izin
// taşıyamayacağı için herkese açık giriştedir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { musteriGirisi } from "../../moduller/musteri/servis.ts";
import { girisSemasi } from "../../moduller/oturum/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { istemciAdresi, sayacAdresi } from "../istek-siniri.ts";
import { oturumCerezleri, oturumSuresiSaniye } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const musteriGirisUcu = ucTanimla({
  giris: "herkese-acik",
  sema: girisSemasi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async (girdi, istek, yanit) => {
    const sure = oturumSuresiSaniye("musteri", calisanSite().ayarlar);
    const anahtarlar = await musteriGirisi(
      siteninVeritabani(),
      girdi,
      sayacAdresi(istemciAdresi(istek)),
      sure,
    );
    yanit.cerezYaz(...oturumCerezleri("musteri", anahtarlar, sure));
    return {};
  },
});
