// Kargo ayarları uçları (kart 0212, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: tutarın okunması ve
// sınırı kargo servisinde, yazımı ve değişiklik kaydı mağaza ayarları servisindedir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { kargoAyarlariDurumuSemasi, kargoAyarlariSemasi } from "../../moduller/kargo/semalar.ts";
import { kargoAyarlariniDegistir, kargoAyarlariniOku } from "../../moduller/kargo/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

// GET /kapi/yonetici/kargo-ayarlari: kargo ücreti, ücretsiz kargo sınırı ve sınırın baktığı tutar.
export const kargoAyarlariDurumuUcu = ucTanimla({
  giris: "yonetici",
  sema: kargoAyarlariDurumuSemasi,
  izin: "magaza-ayarlari.gor",
  sinir: "genel",
  isle: () => kargoAyarlariniOku(siteninVeritabani(), calisanSite()),
});

// POST /kapi/yonetici/kargo-ayarlari: üç ayarı birlikte değiştirir.
export const kargoAyarlariUcu = ucTanimla({
  giris: "yonetici",
  sema: kargoAyarlariSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    kargoAyarlariniDegistir(
      siteninVeritabani(),
      calisanSite(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});
