// Ürün özelliği uçları (kart 0261, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kuralların hepsi
// (tür, birim, seçenekler, sınırlar, silmede değerlerin kalkması) özellik servisindedir
// (cekirdek/moduller/ozellik/servis.ts). Panelin formu özelliği seçenekleriyle tek kayıtta yazar (kaydet).

import { yoneticininIzniVarMi } from "../../moduller/ekip/servis.ts";
import {
  type OzellikGirdisi,
  type OzellikKaydiGirdisi,
  ozellikEklemeSemasi,
  ozellikKaydiSemasi,
  ozellikSilmeSemasi,
  ozellikSiralamaSemasi,
} from "../../moduller/ozellik/semalar.ts";
import { ozellikServisi } from "../../moduller/ozellik/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

// POST /kapi/yonetici/ozellik-ekle: liste türünde seçenekleri birlikte.
export const ozellikEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: ozellikEklemeSemasi,
  izin: "ozellik.degistir",
  sinir: "genel",
  isle: async ({ ozellik }, _istek, _yanit, { hesapKimligi }) => ({
    kimlik: await ozellikServisi.ekle(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      ozellik as OzellikGirdisi,
    ),
  }),
});

// POST /kapi/yonetici/ozellik-kaydet: alanlar ve seçeneklerin son hâli tek işlemde. Listeden çıkan seçenek
// silinir, değeri ürünlerden kalkar: bu silmedir, ayrıca ozellik.sil ister (görevli silemez, karar 0072; bağımsız
// kontrolün bulgusu).
export const ozellikKaydiUcu = ucTanimla({
  giris: "yonetici",
  sema: ozellikKaydiSemasi,
  izin: "ozellik.degistir",
  sinir: "genel",
  isle: async ({ kimlik, ozellik }, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    await ozellikServisi.kaydet(
      vt,
      yonetici(hesapKimligi),
      kimlik,
      ozellik as OzellikKaydiGirdisi,
      {
        secenekSilinebilir: await yoneticininIzniVarMi(vt, hesapKimligi, "ozellik.sil"),
      },
    );
    return {};
  },
});

// POST /kapi/yonetici/ozellik-sil: özellik silinmiş işaretlenir, değerleri ürünlerden kalkar.
export const ozellikSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: ozellikSilmeSemasi,
  izin: "ozellik.sil",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await ozellikServisi.sil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});

// POST /kapi/yonetici/ozellik-sirala: silinmemiş bütün özelliklerin yeni sırası.
export const ozellikSiralamaUcu = ucTanimla({
  giris: "yonetici",
  sema: ozellikSiralamaSemasi,
  izin: "ozellik.degistir",
  sinir: "genel",
  isle: async ({ kimlikler }, _istek, _yanit, { hesapKimligi }) => {
    await ozellikServisi.sirala(siteninVeritabani(), yonetici(hesapKimligi), kimlikler);
    return {};
  },
});
