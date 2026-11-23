// Panelin müşteri uçları (kart 0271, karar 0173; uç belgesi cekirdek/kapi/uclar.md). Liste ve ayrıntı kişisel veridir
// (musteri.gor); not eklemek ve silmek musteri.not, şifre sıfırlama bağlantısı göndermek musteri.sifre-sifirlama ister.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import {
  musteriKimligiSemasi,
  musteriNotuSemasi,
  musteriNotuSilSemasi,
} from "../../moduller/musteri/panel-semalari.ts";
import { musteriYonetimi } from "../../moduller/musteri/yonetim.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { listeUcuSemasi } from "../../yonetim-paneli/liste/tanim.ts";
import { musteriListesiTanimi } from "../../yonetim-paneli/musteriler/liste-tanimi.ts";
import { musteriListesiVerisi } from "../../yonetim-paneli/musteriler/veri.ts";
import { ucTanimla } from "../uc.ts";

// GET /kapi/yonetici/musteriler: listenin bir sayfası; ekran aranan metni buraya gönderir, adrese yazmaz.
export const musteriListesiUcu = ucTanimla({
  giris: "yonetici",
  sema: listeUcuSemasi(musteriListesiTanimi),
  izin: "musteri.gor",
  sinir: "genel",
  isle: (durum) => musteriListesiVerisi(durum),
});

// POST /kapi/yonetici/musteri-notu: mağazanın müşteri hakkındaki notu (müşteriye gitmez).
export const musteriNotuUcu = ucTanimla({
  giris: "yonetici",
  sema: musteriNotuSemasi,
  izin: "musteri.not",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    musteriYonetimi(calisanSite()).notEkle(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});

// POST /kapi/yonetici/musteri-notu-sil: notu kalıcı siler.
export const musteriNotuSilUcu = ucTanimla({
  giris: "yonetici",
  sema: musteriNotuSilSemasi,
  izin: "musteri.not",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    await musteriYonetimi(calisanSite()).notSil(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    );
    return { silindi: true };
  },
});

// POST /kapi/yonetici/musteri-sifre-sifirlama: bağlantı müşterinin kendi e-postasına gider.
export const musteriSifreSifirlamaUcu = ucTanimla({
  giris: "yonetici",
  sema: musteriKimligiSemasi,
  izin: "musteri.sifre-sifirlama",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    musteriYonetimi(calisanSite()).sifreSifirlamaGonder(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi.musteri,
    ),
});
