// Yöneticinin yorum uçları (kart 0139, uç belgesi: cekirdek/kapi/uclar.md). Panelin Yorumlar ekranı (kart 0277)
// listeyi liste tanımıyla okur, kararı ve ana sayfa işaretini tek tek ya da toplu verir. Kurallar yorum
// servisindedir; toplu karar her yorumu tekil kararla aynı yoldan geçirir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { yorumTopluKarar } from "../../moduller/yorum/panel-listesi.ts";
import {
  yorumAnaSayfaSemasi,
  yorumKarariSemasi,
  yorumTopluIslemiSemasi,
} from "../../moduller/yorum/semalar.ts";
import { yorumServisi } from "../../moduller/yorum/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { listeUcuSemasi } from "../../yonetim-paneli/liste/tanim.ts";
import { yorumListesiTanimi } from "../../yonetim-paneli/yorumlar/liste-tanimi.ts";
import { yorumListesiVerisi } from "../../yonetim-paneli/yorumlar/veri.ts";
import { ucTanimla } from "../uc.ts";

// GET /kapi/yonetici/yorumlar?durum=&puan=&ara=&sirala=&sayfa=: panelin yorum listesinin bir sayfası. Girdi ve yanıt
// panel sayfasınınkiyle aynıdır (liste tanımı ve yorumListesiVerisi); durum verilmezse onay bekleyenler.
export const yorumListesiUcu = ucTanimla({
  giris: "yonetici",
  sema: listeUcuSemasi(yorumListesiTanimi),
  izin: "yorum.gor",
  sinir: "genel",
  isle: (durum) => yorumListesiVerisi(durum),
});

// POST /kapi/yonetici/yorumlar-toplu: seçilen yorumları yayınlar ya da reddeder.
export const yorumTopluKarariUcu = ucTanimla({
  giris: "yonetici",
  sema: yorumTopluIslemiSemasi,
  izin: "yorum.onayla",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    yorumTopluKarar(
      siteninVeritabani(),
      calisanSite(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
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
