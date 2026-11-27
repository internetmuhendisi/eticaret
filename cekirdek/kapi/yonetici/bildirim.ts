// Panelin bildirim uçları (kart 0280, karar 0198, uç belgesi: cekirdek/kapi/uclar.md). Bildirim yöneticinin kendi
// hesabınındır: liste, sayı ve okundu yalnız kendi satırlarına bakar, her biri o olayın iznini yeniden sorar
// (servis). İzin beyanı kendi hesabını görme ve değiştirmedir: bütün rollerde vardır.
import { yoneticininYetkileri } from "../../moduller/ekip/servis.ts";
import { okunduYap, okunmamisSayisi } from "../../moduller/yonetici-bildirimi/panel.ts";
import {
  panelBildirimiOkunduSemasi,
  panelBildirimleriSemasi,
} from "../../moduller/yonetici-bildirimi/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { panelBildirimListesi } from "../../yonetim-paneli/bildirimler/veri.ts";
import { ucTanimla } from "../uc.ts";

// GET /kapi/yonetici/panel-bildirimleri: en yeni bildirimler (ekran için biçimlenmiş) ve okunmamış sayısı.
export const panelBildirimleriUcu = ucTanimla({
  giris: "yonetici",
  sema: panelBildirimleriSemasi,
  izin: "ekip.kendi-hesabi.gor",
  sinir: "genel",
  isle: (_girdi, _istek, _yanit, { hesapKimligi }) =>
    panelBildirimListesi(siteninVeritabani(), hesapKimligi),
});

// GET /kapi/yonetici/panel-bildirim-sayisi: zilin okunmamış sayısı (panelde sayfa değişince sorulur).
export const panelBildirimSayisiUcu = ucTanimla({
  giris: "yonetici",
  sema: panelBildirimleriSemasi,
  izin: "ekip.kendi-hesabi.gor",
  sinir: "genel",
  isle: async (_girdi, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    const yetkili = await yoneticininYetkileri(vt, hesapKimligi);
    return { okunmamis: await okunmamisSayisi(vt, hesapKimligi, yetkili) };
  },
});

// POST /kapi/yonetici/panel-bildirimi-okundu: bir bildirimi ya da hepsini okundu yapar; yazılan sayı ve kalan
// okunmamış sayısı döner. Başkasının ya da görülemeyen bildirimin kimliği hiçbir şey değiştirmez (0).
export const panelBildirimiOkunduUcu = ucTanimla({
  giris: "yonetici",
  sema: panelBildirimiOkunduSemasi,
  izin: "ekip.kendi-hesabi.degistir",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    const yetkili = await yoneticininYetkileri(vt, hesapKimligi);
    const okundu = await okunduYap(vt, hesapKimligi, yetkili, girdi);
    return { okundu, okunmamis: await okunmamisSayisi(vt, hesapKimligi, yetkili) };
  },
});
