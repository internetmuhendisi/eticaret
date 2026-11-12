// Testlerin sayfa ağacı (kart 0141): bugün panelin ağacında izin isteyen sayfa yoktur (ekranları sonraki
// kartlarda gelir). Menünün izinle süzülmesi bu ağaçla, gerçek izin adlarıyla denenir. Adlar testte
// görünmez, karşılamanın metinleri kullanılır.
import { panelAdresi } from "../adresler.ts";
import type { PanelSayfaTanimi } from "../sayfa-agaci.ts";

const metinler = {
  ad: "yonetim.sayfa.karsilama.ad",
  aciklama: "yonetim.sayfa.karsilama.aciklama",
} as const;

export const denemeAgaci = [
  {
    kod: "karsilama",
    adres: panelAdresi,
    ...metinler,
    ikon: "ev",
    izin: null,
    grup: null,
  },
  {
    kod: "urunler",
    adres: `${panelAdresi}/urunler`,
    ...metinler,
    ikon: "paket",
    izin: "urun.gor",
    grup: null,
  },
  {
    kod: "bolumler",
    adres: `${panelAdresi}/vitrin-bolumleri`,
    ...metinler,
    ikon: "gorsel",
    izin: "duzen.gor",
    grup: "vitrin",
  },
  {
    kod: "menuler",
    adres: `${panelAdresi}/menuler`,
    ...metinler,
    ikon: "menu",
    izin: "menu.gor",
    grup: "vitrin",
  },
  {
    kod: "menu-ogesi",
    adres: `${panelAdresi}/menuler/oge`,
    ...metinler,
    ikon: "menu",
    izin: "menu.degistir",
    grup: "vitrin",
    ust: "menuler",
  },
  {
    kod: "tema",
    adres: `${panelAdresi}/tema`,
    ...metinler,
    ikon: "gorsel",
    izin: "tema.gor",
    grup: "vitrin",
  },
] as const satisfies readonly PanelSayfaTanimi[];
