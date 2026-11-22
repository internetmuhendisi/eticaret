// Mağaza logosu uçları (kart 0094, karar 0059 ve 0165, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir:
// kaydetme kuralları dosya servisinde, logonun ayarı logo modülündedir. Dosyanın reddi alanın koduyla döner
// (dosyaHatalari); metni ekran çözer.
import {
  logonunYolu,
  logoyuDegistir,
  logoyuKaldir,
  magazaLogosu,
} from "../../moduller/magaza-ayarlari/logo.ts";
import { logoKaldirmaSemasi, logoYuklemeSemasi } from "../../moduller/magaza-ayarlari/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

// Ekranın önizlemesi: logonun kaynağı ve sitenin kendi sayfalarındaki adresi (özetiyle).
const logoDurumu = async () => {
  const logo = await magazaLogosu(siteninVeritabani());
  return logo === undefined
    ? { kaynak: null, adres: null }
    : { kaynak: logo.kaynak, adres: logonunYolu(logo) };
};

// POST /kapi/yonetici/logo-yukle: gövdedeki görseli yeni logo yapar.
export const logoYuklemeUcu = ucTanimla({
  giris: "yonetici",
  govde: "dosya",
  sema: logoYuklemeSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "yukleme",
  isle: async ({ dosya }, _istek, _yanit, { hesapKimligi }) => {
    const sonuc = await logoyuDegistir(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      dosya,
    );
    if (!sonuc.tamam) throw new BilinenHata("dogrulama", [{ alan: "dosya", kod: sonuc.hata }]);
    return logoDurumu();
  },
});

// POST /kapi/yonetici/logo-kaldir: yüklenen logoyu kaldırır, sitenin ilk logosuna (yoksa mağaza adına) dönülür.
export const logoKaldirmaUcu = ucTanimla({
  giris: "yonetici",
  sema: logoKaldirmaSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: async (_girdi, _istek, _yanit, { hesapKimligi }) => {
    await logoyuKaldir(siteninVeritabani(), { tur: "yonetici", kimlik: hesapKimligi });
    return logoDurumu();
  },
});
