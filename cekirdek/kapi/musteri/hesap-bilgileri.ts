// Müşterinin hesap bilgileri uçları (kart 0237; uç belgesi: cekirdek/kapi/uclar.md): kampanya izni ve şifre
// değiştirme. Uç yalnız yönlendirir: kurallar müşteri servisindedir (cekirdek/moduller/musteri/servis.ts). Müşterinin
// kimliği yalnız kapıdan gelir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import {
  hesapBilgileriSemasi,
  pazarlamaIzniSemasi,
  sifreDegistirSemasi,
} from "../../moduller/musteri/semalar.ts";
import {
  hesapBilgileri,
  musteriSifreDegistir,
  pazarlamaIzniniDegistir,
} from "../../moduller/musteri/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { istemciAdresi, sayacAdresi } from "../istek-siniri.ts";
import { oturumCerezleri, oturumSuresiSaniye } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

// GET /kapi/musteri/hesap-bilgileri: e-posta ve kampanya izninin bugünkü hâli.
export const hesapBilgileriUcu = ucTanimla({
  giris: "musteri",
  sema: hesapBilgileriSemasi,
  izin: "musteri.kendi-hesabi.gor",
  sinir: "genel",
  isle: async (_girdi, _istek, _yanit, { hesapKimligi }) => {
    const bilgiler = await hesapBilgileri(siteninVeritabani(), hesapKimligi);
    if (bilgiler === null) throw new BilinenHata("oturum-yok");
    return bilgiler;
  },
});

// POST /kapi/musteri/pazarlama-izni: kampanya iznini verir ya da geri alır.
export const pazarlamaIzniUcu = ucTanimla({
  giris: "musteri",
  sema: pazarlamaIzniSemasi,
  izin: "musteri.kendi-hesabi.degistir",
  sinir: "genel",
  isle: async ({ verildi }, _istek, _yanit, { hesapKimligi }) => {
    await pazarlamaIzniniDegistir(siteninVeritabani(), hesapKimligi, verildi);
    return { verildi };
  },
});

// POST /kapi/musteri/sifre-degistir: şu anki şifre doğrulanır (girişin deneme sınırıyla), bütün oturumlar kapanır,
// bu cihaz için yeni oturum çerezi yazılır.
export const sifreDegistirUcu = ucTanimla({
  giris: "musteri",
  sema: sifreDegistirSemasi,
  izin: "musteri.kendi-hesabi.degistir",
  sinir: "siki",
  isle: async (girdi, istek, yanit, { hesapKimligi }) => {
    const sure = oturumSuresiSaniye("musteri", calisanSite().ayarlar);
    const anahtarlar = await musteriSifreDegistir(
      siteninVeritabani(),
      hesapKimligi,
      girdi,
      sayacAdresi(istemciAdresi(istek)),
      sure,
    );
    yanit.cerezYaz(...oturumCerezleri("musteri", anahtarlar, sure));
    return {};
  },
});
