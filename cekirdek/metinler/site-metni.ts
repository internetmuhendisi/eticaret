// Sitenin dilinde metin okuyucu ve sitenin biçimleyicisi. Ekranlar metni ve biçimi buradan okur.
// Dil, saat dilimi ve para biçimi çalışan sitenin ayarlarından gelir. Site bu dosya yüklenirken
// değil, ilk çağrıda okunur; böylece uygulama site olmadan derlenir (kart 0035, karar 0026).
import type { SiteAyarlari } from "../ayar-semasi/ayarlar";
import { calisanSite } from "../ayar-semasi/calisan-site";
import { type Bicimleyici, bicimleyiciOlustur } from "./bicimleyici";
import { type Dil, type MetinAnahtari, metinOkuyucu } from "./metin";

export const siteDili = (): Dil => calisanSite().ayarlar.dil;

export const metin = (anahtar: MetinAnahtari): string => metinOkuyucu(siteDili())(anahtar);

let bicimleyici: Bicimleyici | undefined;

// Bir sitenin ayarlarından biçimleyicisi. Çalışan site dışındaki bir site için de kullanılır (testler).
export const siteninBicimleyicisi = (ayarlar: SiteAyarlari): Bicimleyici =>
  bicimleyiciOlustur({
    dil: ayarlar.dil,
    saatDilimi: ayarlar.saatDilimi,
    sayi: {
      binlikAyirici: ayarlar.paraBicimi.binlikAyirici,
      ondalikAyirici: ayarlar.paraBicimi.ondalikAyirici,
    },
    para: {
      paraBirimi: ayarlar.paraBirimi,
      simge: ayarlar.paraBicimi.simge,
      simgeYeri: ayarlar.paraBicimi.simgeYeri,
      simgeBoslugu: ayarlar.paraBicimi.simgeBoslugu,
      ondalikSayisi: ayarlar.paraBicimi.ondalikSayisi,
    },
  });

export const bicim = (): Bicimleyici => {
  if (bicimleyici === undefined) bicimleyici = siteninBicimleyicisi(calisanSite().ayarlar);
  return bicimleyici;
};
