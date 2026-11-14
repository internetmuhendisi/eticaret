// POST /kapi/herkese-acik/musteri-kayit (uç belgesi: cekirdek/kapi/uclar.md). Hesap açar ve oturumu başlatır.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { kayitSemasi } from "../../moduller/musteri/semalar.ts";
import { musteriKaydet } from "../../moduller/musteri/servis.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { oturumCerezleri, oturumSuresiSaniye } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const musteriKayitUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: kayitSemasi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async ({ robotCevabi, ...girdi }, _istek, yanit) => {
    // Veritabanına bakmadan önce: e-postanın kayıtlı olup olmadığını robot soramasın.
    await robotCevabiniDogrula(robotCevabi);
    const sure = oturumSuresiSaniye("musteri", calisanSite().ayarlar);
    const anahtarlar = await musteriKaydet(siteninVeritabani(), girdi, sure);
    yanit.cerezYaz(...oturumCerezleri("musteri", anahtarlar, sure));
    return {};
  },
});
