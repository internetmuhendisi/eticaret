// Sitenin dilinde metin okuyucu ve sitenin biçimleyicisi. Ekranlar metni ve biçimi buradan okur.
// Dil, saat dilimi ve para biçimi çalışan sitenin ayarlarından gelir. Site bu dosya yüklenirken
// değil, ilk çağrıda okunur; böylece uygulama site olmadan derlenir (kart 0035, karar 0026).
import { calisanSite } from "../ayar-semasi/calisan-site";
import { type Bicimleyici, bicimleyiciOlustur } from "./bicimleyici";
import { type Dil, type MetinAnahtari, metinOkuyucu } from "./metin";

export const siteDili = (): Dil => calisanSite().ayarlar.dil;

export const metin = (anahtar: MetinAnahtari): string => metinOkuyucu(siteDili())(anahtar);

let bicimleyici: Bicimleyici | undefined;

export const bicim = (): Bicimleyici => {
  if (bicimleyici === undefined) {
    const { ayarlar } = calisanSite();
    bicimleyici = bicimleyiciOlustur({
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
  }
  return bicimleyici;
};
