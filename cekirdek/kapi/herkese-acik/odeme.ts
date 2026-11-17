// POST /kapi/herkese-acik/odeme (kart 0213, karar 0140; uç belgesi: cekirdek/kapi/uclar.md). Üye olmayan müşteri
// ödeme adımında "Siparişi onayla"ya basar: ödeme oturumu açılır, sepetin stoğu ayrılır, isterse hesap açılır (açılan
// hesabın oturum çerezleri yazılır). Uç yalnız yönlendirir: kurallar ödeme servisindedir. Üye olmadan alışveriş
// kapalıysa oturum-yok (ekran girişe yönlendirir). Tema demosunda kapalıdır: ziyaretçi sipariş vermez.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { misafirOdemeGirdisi } from "../../moduller/odeme/semalar.ts";
import { odemeServisi } from "../../moduller/odeme/servis.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { oturumCerezleri, oturumSuresiSaniye } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const odemeUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: misafirOdemeGirdisi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async (
    { robotCevabi, eposta, hesap, bilgiler, kalemler, onceki, gorulenToplam },
    _istek,
    yanit,
  ) => {
    // Veritabanına bakmadan önce: robot stoğu ya da e-postanın kayıtlı olup olmadığını soramasın.
    await robotCevabiniDogrula(robotCevabi);
    const site = calisanSite();
    const sure = oturumSuresiSaniye("musteri", site.ayarlar);
    const sonuc = await odemeServisi(site).odemeOturumuAc(
      siteninVeritabani(),
      { kim: { tur: "misafir", eposta, hesap }, bilgiler, kalemler, onceki, gorulenToplam },
      sure,
    );
    if (sonuc.anahtarlar !== undefined) {
      yanit.cerezYaz(...oturumCerezleri("musteri", sonuc.anahtarlar, sure));
    }
    // Ayırmanın bittiği an sitenin saat dilimiyle yazılı da gelir: ekran tarih biçimlendirmez.
    return {
      oturum: sonuc.oturum,
      bitis: sonuc.bitis.toISOString(),
      bitisYazili: siteninBicimleyicisi(site.ayarlar).tarihSaat(sonuc.bitis),
    };
  },
});
