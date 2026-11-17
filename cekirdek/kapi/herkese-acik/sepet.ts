// POST /kapi/herkese-acik/sepet (kart 0212, karar 0135; uç belgesi: cekirdek/kapi/uclar.md). Tarayıcıdaki sepetin
// birimleri ve adetleri gelir, sepetin vitrin verisi döner: satırlar, uyarılar, ara toplam, kargo, vergi dökümü ve
// toplam. Ödeme adımı teslimat ve fatura adresinin bölgesini de verir, vergi ona göre hesaplanır (kart 0213).
// Hiçbir şey yazmaz, oturum istemez (sepet tarayıcıdadır). Uç yalnız yönlendirir: hesap sepet modülünde,
// gösterim vitrinin sepet verisindedir. Tema demosunda açıktır: sepet gezintinin parçasıdır, sipariş doğurmaz.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { sepetSemasi } from "../../moduller/sepet/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { sepetGorunumu } from "../../vitrin/sepet/veri.ts";
import { ucTanimla } from "../uc.ts";

export const sepetUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "acik",
  sema: sepetSemasi,
  izin: herkeseAcik,
  sinir: "genel",
  isle: ({ kalemler, vergiBolgeleri }) =>
    sepetGorunumu(siteninVeritabani(), calisanSite(), kalemler, {
      ...(vergiBolgeleri === undefined ? {} : { adresler: vergiBolgeleri }),
    }),
});
