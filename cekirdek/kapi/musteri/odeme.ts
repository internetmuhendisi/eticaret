// POST /kapi/musteri/odeme (kart 0213, karar 0140; uç belgesi: cekirdek/kapi/uclar.md). Giriş yapmış müşteri ödeme
// adımında "Siparişi onayla"ya basar: ödeme oturumu kendi hesabına açılır, sepetin stoğu ayrılır, havale ya da kapıda ödemede sipariş oluşur (kart 0214). E-posta hesabındandır,
// müşterinin kimliği yalnız kapıdan gelir; bir önceki oturum yalnız kendisininse serbest kalır.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { uyeOdemeGirdisi } from "../../moduller/odeme/semalar.ts";
import { odemeServisi } from "../../moduller/odeme/servis.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { istemciAdresi } from "../istek-siniri.ts";
import { oturumSuresiSaniye } from "../oturum-cerezi.ts";
import { siparisErisimCereziYaz } from "../siparis-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const uyeOdemeUcu = ucTanimla({
  giris: "musteri",
  sema: uyeOdemeGirdisi,
  izin: "odeme.kendi.baslat",
  sinir: "siki",
  isle: async (
    { robotCevabi, bilgiler, kalemler, onceki, gorulenToplam, adresiKaydet },
    istek,
    yanit,
    { hesapKimligi },
  ) => {
    await robotCevabiniDogrula(robotCevabi);
    const site = calisanSite();
    const sonuc = await odemeServisi(site).onayla(
      siteninVeritabani(),
      {
        kim: { tur: "uye", musteri: hesapKimligi, adresiKaydet },
        bilgiler,
        kalemler,
        onceki,
        gorulenToplam,
        ip: istemciAdresi(istek),
      },
      oturumSuresiSaniye("musteri", site.ayarlar),
    );
    // Eklentili yöntemde (kartla ödeme, kart 0215) müşteri ödeme kuruluşunun sayfasına gider; sipariş dönüşte kurulur.
    if (sonuc.tur === "yonlendir") return { oturum: sonuc.oturum, yonlendir: sonuc.adres };
    // Sipariş alındı sayfası siparişi yalnız bu tarayıcıya verilen anahtarla açar.
    yanit.cerezYaz(siparisErisimCereziYaz(sonuc.siparis.erisimAnahtari));
    return { oturum: sonuc.oturum, siparis: sonuc.siparis.numara };
  },
});
