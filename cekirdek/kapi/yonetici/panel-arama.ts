// GET /kapi/yonetici/panel-siparis-ara, panel-urun-ara, panel-musteri-ara (kart 0321, karar 0191, uç belgesi:
// cekirdek/kapi/uclar.md): panelin üst şeridindeki arama. Her tür kendi ucunda, kendi izniyle aranır: izni olmayan
// yönetici o türün ucuna gidemez, ekran o türün isteğini hiç göndermez. Sonuçlar ekran için sunucuda biçimlenir
// (cekirdek/yonetim-paneli/arama/veri.ts).
import { panelAramaTurleri } from "../../kayitlar/panel-arama.ts";
import {
  musteriAramasi,
  panelAramaSemasi,
  siparisAramasi,
  urunAramasi,
} from "../../yonetim-paneli/arama/veri.ts";
import { ucTanimla } from "../uc.ts";

export const panelSiparisAramaUcu = ucTanimla({
  giris: "yonetici",
  sema: panelAramaSemasi,
  izin: panelAramaTurleri.siparis.izin,
  sinir: "genel",
  isle: async ({ ara }) => siparisAramasi(ara),
});

export const panelUrunAramaUcu = ucTanimla({
  giris: "yonetici",
  sema: panelAramaSemasi,
  izin: panelAramaTurleri.urun.izin,
  sinir: "genel",
  isle: async ({ ara }) => urunAramasi(ara),
});

export const panelMusteriAramaUcu = ucTanimla({
  giris: "yonetici",
  sema: panelAramaSemasi,
  izin: panelAramaTurleri.musteri.izin,
  sinir: "genel",
  isle: async ({ ara }) => musteriAramasi(ara),
});
