// GET /kapi/herkese-acik/hesap-durumu (kart 0187, 0237; uç belgesi: cekirdek/kapi/uclar.md). Vitrinin hesap durumu
// (cekirdek/vitrin/hesap-durumu.ts) sayfa başına bir kez sorar. Girişsiz ziyaretçi hata değil başarılı bir "girişsiz"
// cevabı alır: eski soru (GET /kapi/musteri/hesabim) 401 ile dönüyor, tarayıcı her sayfada konsola hata yazıyordu.
// Oturum çerezi tarayıcı koduna kapalı olduğu için (HttpOnly) soru oturumsuz da gider. Oturumu kapı gibi okur:
// kısa anahtarın süresi dolduysa yenileme anahtarıyla yeniler ve çerezleri yazar.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { hesapDurumuSemasi } from "../../moduller/musteri/semalar.ts";
import { musteriHesabi } from "../../moduller/musteri/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { istektenOturumAl, oturumSuresiSaniye } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

export const hesapDurumuUcu = ucTanimla({
  giris: "herkese-acik",
  // Demoda tarayıcı oturum sormaz (sayfa kökündeki işaret); uç da kapalıdır.
  temaDemosunda: "kapali",
  sema: hesapDurumuSemasi,
  izin: herkeseAcik,
  sinir: "genel",
  isle: async (_girdi, istek, yanit) => {
    const vt = siteninVeritabani();
    const { hesapKimligi, cerezler } = await istektenOturumAl(
      vt,
      "musteri",
      istek,
      oturumSuresiSaniye("musteri", calisanSite().ayarlar),
    );
    yanit.cerezYaz(...cerezler);
    const hesap = hesapKimligi === null ? null : await musteriHesabi(vt, hesapKimligi);
    return hesap === null
      ? { girisli: false as const }
      : { girisli: true as const, eposta: hesap.eposta };
  },
});
