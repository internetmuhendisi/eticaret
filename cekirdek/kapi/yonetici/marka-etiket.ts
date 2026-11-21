// Marka ve etiket uçları (kart 0261, uç belgesi: cekirdek/kapi/uclar.md). İki grup aynı kalıpla ve kendi
// izinleriyle tanımlanır. Uç yalnız yönlendirir: kurallar grup servisindedir (cekirdek/moduller/urun/grup-servisi.ts).
import type { GirisIzni } from "../../kayitlar/izinler.ts";
import { etiketServisi } from "../../moduller/etiket/servis.ts";
import { markaServisi } from "../../moduller/marka/servis.ts";
import {
  type GrupDegisikligi,
  type GrupGirdisi,
  grupDegisikligiSemasi,
  grupEklemeSemasi,
  grupSilmeSemasi,
} from "../../moduller/urun/grup-semalari.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

const grupUclari = (
  servis: typeof markaServisi,
  izinler: { degistir: GirisIzni<"yonetici">; sil: GirisIzni<"yonetici"> },
) => ({
  ekle: ucTanimla({
    giris: "yonetici",
    sema: grupEklemeSemasi,
    izin: izinler.degistir,
    sinir: "genel",
    isle: async ({ grup }, _istek, _yanit, { hesapKimligi }) => ({
      kimlik: await servis.ekle(siteninVeritabani(), yonetici(hesapKimligi), grup as GrupGirdisi),
    }),
  }),
  // Yalnız verilen alan değişir; açıklamayı ya da logoyu kaldırmak için null.
  degistir: ucTanimla({
    giris: "yonetici",
    sema: grupDegisikligiSemasi,
    izin: izinler.degistir,
    sinir: "genel",
    isle: async ({ kimlik, grup }, _istek, _yanit, { hesapKimligi }) => {
      await servis.degistir(
        siteninVeritabani(),
        yonetici(hesapKimligi),
        kimlik,
        grup as GrupDegisikligi,
      );
      return {};
    },
  }),
  // Grup silinmiş işaretlenir, ürün bağlantıları kalkar; ürünler silinmez.
  sil: ucTanimla({
    giris: "yonetici",
    sema: grupSilmeSemasi,
    izin: izinler.sil,
    sinir: "genel",
    isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
      await servis.sil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
      return {};
    },
  }),
});

// POST /kapi/yonetici/marka-ekle, marka-degistir, marka-sil
export const markaUclari = grupUclari(markaServisi, {
  degistir: "marka.degistir",
  sil: "marka.sil",
});
// POST /kapi/yonetici/etiket-ekle, etiket-degistir, etiket-sil
export const etiketUclari = grupUclari(etiketServisi, {
  degistir: "etiket.degistir",
  sil: "etiket.sil",
});
