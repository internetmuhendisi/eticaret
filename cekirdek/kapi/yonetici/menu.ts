// Menü uçları (kart 0143, uç belgesi: cekirdek/kapi/uclar.md, karar 0082 ve 0116). Uç yalnız yönlendirir: kuralların
// hepsi (derinlik, hedef türleri, sınırlar, kilitler) menü servisindedir (cekirdek/moduller/menu/servis.ts).
// Değişikliği yapan yönetici kapıdan gelir.

import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import {
  menuDegisikligiSemasi,
  menuEklemeSemasi,
  menulerSemasi,
  menuOkumaSemasi,
  menuSilmeSemasi,
  type OgeDegisikligi,
  type OgeGirdisi,
  ogeDegisikligiSemasi,
  ogeEklemeSemasi,
  ogeSilmeSemasi,
  ogeSiralamaSemasi,
} from "../../moduller/menu/semalar.ts";
import {
  menuDegistir,
  menuEkle,
  menuleriOku,
  menuSil,
  ogeDegistir,
  ogeEkle,
  ogeleriSirala,
  ogeSil,
  panelMenusu,
} from "../../moduller/menu/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

// GET /kapi/yonetici/menuler: silinmemiş menüler.
export const menulerUcu = ucTanimla({
  giris: "yonetici",
  sema: menulerSemasi,
  izin: "menu.gor",
  sinir: "genel",
  isle: async () => ({ menuler: await menuleriOku(siteninVeritabani()) }),
});

// GET /kapi/yonetici/menu: bir menü öğeleriyle ve durumlarıyla; kategori menüsünde kategori ağacı.
export const menuOkumaUcu = ucTanimla({
  giris: "yonetici",
  sema: menuOkumaSemasi,
  izin: "menu.gor",
  sinir: "genel",
  // Blog yazısına bağlı öğe blog kapalıyken "görünmüyor" işaretlidir (kart 0273).
  isle: async ({ kimlik }) => {
    const vt = siteninVeritabani();
    const blogAcik = await siteninServisi(calisanSite()).tekOku(vt, "blogAcik");
    return panelMenusu(vt, kimlik, { blogAcik });
  },
});

// POST /kapi/yonetici/menu-ekle
export const menuEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: menuEklemeSemasi,
  izin: "menu.degistir",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => ({
    kimlik: await menuEkle(siteninVeritabani(), yonetici(hesapKimligi), girdi),
  }),
});

// POST /kapi/yonetici/menu-degistir: menünün adı (kod ve tür değişmez).
export const menuDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: menuDegisikligiSemasi,
  izin: "menu.degistir",
  sinir: "genel",
  isle: async ({ kimlik, ad }, _istek, _yanit, { hesapKimligi }) => {
    await menuDegistir(siteninVeritabani(), yonetici(hesapKimligi), kimlik, { ad });
    return {};
  },
});

// POST /kapi/yonetici/menu-sil: menü ve öğeleri.
export const menuSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: menuSilmeSemasi,
  izin: "menu.degistir",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await menuSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});

// POST /kapi/yonetici/menu-ogesi-ekle
export const ogeEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: ogeEklemeSemasi,
  izin: "menu.degistir",
  sinir: "genel",
  isle: async ({ menu, oge }, _istek, _yanit, { hesapKimligi }) => ({
    kimlik: await ogeEkle(siteninVeritabani(), yonetici(hesapKimligi), menu, oge as OgeGirdisi),
  }),
});

// POST /kapi/yonetici/menu-ogesi-degistir: yalnız verilen alan değişir; üstün değişmesi taşımadır.
export const ogeDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: ogeDegisikligiSemasi,
  izin: "menu.degistir",
  sinir: "genel",
  isle: async ({ kimlik, oge }, _istek, _yanit, { hesapKimligi }) => {
    await ogeDegistir(siteninVeritabani(), yonetici(hesapKimligi), kimlik, oge as OgeDegisikligi);
    return {};
  },
});

// POST /kapi/yonetici/menu-ogesi-sil: öğe ve altları.
export const ogeSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: ogeSilmeSemasi,
  izin: "menu.degistir",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await ogeSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});

// POST /kapi/yonetici/menu-sirala: aynı üstün altındaki bütün öğelerin yeni sırası.
export const ogeSiralamaUcu = ucTanimla({
  giris: "yonetici",
  sema: ogeSiralamaSemasi,
  izin: "menu.degistir",
  sinir: "genel",
  isle: async ({ menu, ust, kimlikler }, _istek, _yanit, { hesapKimligi }) => {
    await ogeleriSirala(siteninVeritabani(), yonetici(hesapKimligi), menu, ust, kimlikler);
    return {};
  },
});
