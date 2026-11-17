// POST /kapi/musteri/odeme (kart 0213, karar 0140; uç belgesi: cekirdek/kapi/uclar.md). Giriş yapmış müşteri ödeme
// adımında "Siparişi onayla"ya basar: ödeme oturumu kendi hesabına açılır, sepetin stoğu ayrılır. E-posta hesabındandır,
// müşterinin kimliği yalnız kapıdan gelir; bir önceki oturum yalnız kendisininse serbest kalır.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { uyeOdemeGirdisi } from "../../moduller/odeme/semalar.ts";
import { odemeServisi } from "../../moduller/odeme/servis.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { oturumSuresiSaniye } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const uyeOdemeUcu = ucTanimla({
  giris: "musteri",
  sema: uyeOdemeGirdisi,
  izin: "odeme.kendi.baslat",
  sinir: "siki",
  isle: async ({ robotCevabi, bilgiler, kalemler, onceki }, _istek, _yanit, { hesapKimligi }) => {
    await robotCevabiniDogrula(robotCevabi);
    const site = calisanSite();
    const sonuc = await odemeServisi(site).oturumAc(
      siteninVeritabani(),
      { kim: { tur: "uye", musteri: hesapKimligi }, bilgiler, kalemler, onceki },
      oturumSuresiSaniye("musteri", site.ayarlar),
    );
    // Ayırmanın bittiği an sitenin saat dilimiyle yazılı da gelir: ekran tarih biçimlendirmez.
    return {
      oturum: sonuc.oturum,
      bitis: sonuc.bitis.toISOString(),
      bitisYazili: siteninBicimleyicisi(site.ayarlar).tarihSaat(sonuc.bitis),
    };
  },
});
