// Yöneticinin yorum uçları (kart 0139, uç belgesi: cekirdek/kapi/uclar.md). Panel ekranı on dördüncü bölümde
// gelir; uçlar onay, red ve ana sayfa işaretini bugünden verir. Kurallar yorum servisindedir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import {
  yorumAnaSayfaSemasi,
  yorumKarariSemasi,
  yorumListesiSemasi,
} from "../../moduller/yorum/semalar.ts";
import { yoneticiYorumlari, yorumServisi } from "../../moduller/yorum/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

// GET /kapi/yonetici/yorumlar?durum=onay-bekliyor&sayfa=1: yorumlar, en yeni önce.
export const yorumListesiUcu = ucTanimla({
  giris: "yonetici",
  sema: yorumListesiSemasi,
  izin: "yorum.gor",
  sinir: "genel",
  isle: (girdi) => yoneticiYorumlari(siteninVeritabani(), girdi),
});

// POST /kapi/yonetici/yorum-karari: yorumu yayınlar ya da reddeder.
export const yorumKarariUcu = ucTanimla({
  giris: "yonetici",
  sema: yorumKarariSemasi,
  izin: "yorum.onayla",
  sinir: "genel",
  isle: async ({ yorum, durum }, _istek, _yanit, { hesapKimligi }) => {
    await yorumServisi(calisanSite()).karar(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      yorum,
      durum,
    );
    return {};
  },
});

// POST /kapi/yonetici/yorum-ana-sayfa: yorumun ana sayfada gösterilmesini işaretler ya da kaldırır.
export const yorumAnaSayfaUcu = ucTanimla({
  giris: "yonetici",
  sema: yorumAnaSayfaSemasi,
  izin: "yorum.onayla",
  sinir: "genel",
  isle: async ({ yorum, anaSayfada }, _istek, _yanit, { hesapKimligi }) => {
    await yorumServisi(calisanSite()).anaSayfaIsareti(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      yorum,
      anaSayfada,
    );
    return {};
  },
});
