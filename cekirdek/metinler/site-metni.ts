// Sitenin dilinde metin okuyucu ve sitenin biçimleyicisi. Ekranlar metni ve biçimi buradan okur.
// Dil, saat dilimi ve para biçimi çalışan sitenin ayarlarından gelir.
import { calisanSite } from "../ayar-semasi/calisan-site";
import { bicimleyiciOlustur } from "./bicimleyici";
import { type Dil, metinOkuyucu } from "./metin";

const { ayarlar } = calisanSite();

export const siteDili: Dil = ayarlar.dil;

export const metin = metinOkuyucu(siteDili);

export const bicim = bicimleyiciOlustur({
  dil: ayarlar.dil,
  saatDilimi: ayarlar.saatDilimi,
  sayi: {
    binlikAyirici: ayarlar.paraBicimi.binlikAyirici,
    ondalikAyirici: ayarlar.paraBicimi.ondalikAyirici,
  },
  para: {
    simge: ayarlar.paraBicimi.simge,
    simgeYeri: ayarlar.paraBicimi.simgeYeri,
    simgeBoslugu: ayarlar.paraBicimi.simgeBoslugu,
    ondalikSayisi: ayarlar.paraBicimi.ondalikSayisi,
  },
});
