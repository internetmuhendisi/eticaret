// POST /kapi/herkese-acik/yonetici-kod (uç belgesi: cekirdek/kapi/uclar.md). Şifreden sonraki ikinci
// aşama. Henüz oturum yoktur, izin taşınamaz; yetki ara adım çerezinden gelir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { girisAdimiCerezi } from "../../kayitlar/oturum.ts";
import { kodlaGirisiBitir } from "../../moduller/oturum/iki-asamali-giris.ts";
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

export const yoneticiKodUcu = ucTanimla({
  giris: "herkese-acik",
  sema: kodSemasi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async ({ kod }, istek, yanit) => {
    const sure = oturumSuresiSaniye("yonetici", calisanSite().ayarlar);
    const anahtarlar = await kodlaGirisiBitir(
      siteninVeritabani(),
      cerezOku(istek, girisAdimiCerezi),
      kod,
      sayacAdresi(istemciAdresi(istek)),
      sure,
    );
    yanit.cerezYaz(...oturumCerezleri("yonetici", anahtarlar, sure), girisAdimiCereziniSil());
    return {};
  },
});
