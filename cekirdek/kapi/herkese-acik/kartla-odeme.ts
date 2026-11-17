// Kartla ödeme eklentisinin uçları (kart 0215, karar 0142; uç belgesi: cekirdek/kapi/uclar.md). Uçlar yalnız yönlendirir:
// kurallar eklentinin servisindedir.
//
// - POST /kapi/herkese-acik/kartla-odeme/donus: ödeme kuruluşu müşterinin tarayıcısını belirteçle geri gönderir (form,
//   başka siteden). Sonuç kuruluşa sorulur; sipariş kurulduysa erişim çerezi yazılır ve sipariş alındı sayfasına, yoksa
//   ödeme adımına sonucun koduyla gidilir. Tarayıcıdan gelen başka hiçbir bilgi kullanılmaz.
// - POST /kapi/herkese-acik/kartla-odeme/bildirim: kuruluşun sunucudan bildirimi. İmzası (X-IYZ-SIGNATURE-V3) tutmazsa
//   yetki; tutarsa aynı tamamlama çalışır (müşteri dönmese de sipariş kurulur).
// - GET /kapi/herkese-acik/kartla-odeme/taksitler?birim=…: ürün sayfasının taksit tablosu. Eklenti kapalıysa ya da ayar
//   "gösterme" ise bulunamadı.
// Eklenti kapalıyken dönüş ve bildirim yalnız başlatılmış ödemeyi tamamlar (parası çekilmiş müşteri kaybolmaz); yeni
// ödeme zaten başlatılamaz. Üçü de tema demosunda kapalıdır: demo ödeme almaz.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { kurulusAnahtarlari } from "../../eklentiler/kartla-odeme/baslat.ts";
import { bildirimImzaBasligi, bildirimiDogrula } from "../../eklentiler/kartla-odeme/iyzico.ts";
import {
  bildirimSemasi,
  donusSemasi,
  taksitlerSemasi,
} from "../../eklentiler/kartla-odeme/semalar.ts";
import { kartlaOdemeServisi } from "../../eklentiler/kartla-odeme/servis.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { odemeDonusParametresi } from "../../kayitlar/odeme.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { vitrinAdresleri } from "../../vitrin/adresler.ts";
import { siparisErisimCereziYaz } from "../siparis-cerezi.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata, Yonlendirme } from "../zarf.ts";

export const kartlaOdemeDonusUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  disKurulus: true,
  sema: donusSemasi,
  izin: herkeseAcik,
  sinir: "bildirim",
  isle: async ({ token }, _istek, yanit) => {
    const sonuc = await kartlaOdemeServisi(calisanSite()).tamamla(siteninVeritabani(), token, {
      erisimVer: true,
    });
    if (sonuc.tur === "siparis") {
      if (sonuc.erisimAnahtari !== undefined) {
        yanit.cerezYaz(siparisErisimCereziYaz(sonuc.erisimAnahtari));
      }
      return new Yonlendirme(vitrinAdresleri.siparisAlindi);
    }
    return new Yonlendirme(
      `${vitrinAdresleri.odeme}?${new URLSearchParams({ [odemeDonusParametresi]: sonuc.sonuc })}`,
    );
  },
});

export const kartlaOdemeBildirimUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  disKurulus: true,
  sema: bildirimSemasi,
  izin: herkeseAcik,
  sinir: "bildirim",
  isle: async (girdi, istek) => {
    const anahtarlar = kurulusAnahtarlari();
    const bildirim =
      anahtarlar === undefined
        ? undefined
        : bildirimiDogrula(anahtarlar, girdi, istek.headers.get(bildirimImzaBasligi));
    if (bildirim === undefined) throw new BilinenHata("yetki");
    const sonuc = await kartlaOdemeServisi(calisanSite()).tamamla(
      siteninVeritabani(),
      bildirim.belirtec,
      { erisimVer: false },
    );
    // Kuruluşa ulaşılamadıysa başarı dönülmez: kuruluş bildirimi yeniden dener (bağımsız kontrolün bulgusu).
    if (sonuc.kurulus === "ulasilamadi") throw new BilinenHata("hizmet-kullanilamiyor");
    return {};
  },
});

export const kartlaOdemeTaksitlerUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: taksitlerSemasi,
  izin: herkeseAcik,
  sinir: "genel",
  isle: async ({ birim }) =>
    kartlaOdemeServisi(calisanSite()).taksitTablosu(siteninVeritabani(), birim),
});
