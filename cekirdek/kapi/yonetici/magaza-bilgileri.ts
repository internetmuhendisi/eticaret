// Mağaza bilgileri ucu (kart 0278, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: alanların kuralları ve
// yazım mağaza bilgileri servisindedir (cekirdek/moduller/magaza-ayarlari/bilgiler.ts).
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { magazaBilgileriniDegistir } from "../../moduller/magaza-ayarlari/bilgiler.ts";
import { magazaBilgileriSemasi } from "../../moduller/magaza-ayarlari/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

// POST /kapi/yonetici/magaza-bilgileri: mağaza adı, iletişim bilgileri, adres, sosyal hesaplar ve satıcı bilgileri.
export const magazaBilgileriUcu = ucTanimla({
  giris: "yonetici",
  sema: magazaBilgileriSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    await magazaBilgileriniDegistir(
      siteninVeritabani(),
      calisanSite(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    );
    return {};
  },
});
