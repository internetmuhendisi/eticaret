// Ürün ekranının uçları (kart 0263, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: ürünün kuralları
// (adres adı, yayın zamanı, alım adedi, kategori, marka, etiket, ilgili ürünler, özellik değerleri) ürün servisindedir
// (cekirdek/moduller/urun/servis.ts). Ağırlık ve sayı türündeki özellik değerleri sitenin sayı biçimiyle yazılmış
// metindir; servisten önce panel-girdisi.ts çevirir. Değişikliği yapan yönetici kapıdan gelir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { panelGirdisiniCevir } from "../../moduller/urun/panel-girdisi.ts";
import {
  type UrunDegisikligi,
  type UrunGirdisi,
  urunDegisikligiSemasi,
  urunEklemeSemasi,
  urunSilmeSemasi,
} from "../../moduller/urun/semalar.ts";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

const cevir = (ham: Readonly<Record<string, unknown>>) => {
  const { ayarlar } = calisanSite();
  return panelGirdisiniCevir(siteninVeritabani(), ham, {
    bicimleyici: siteninBicimleyicisi(ayarlar),
    agirlikBirimi: ayarlar.agirlikBirimi,
  });
};

// POST /kapi/yonetici/urun-ekle: yeni ürün; durum verilmezse taslaktır.
export const urunEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: urunEklemeSemasi,
  izin: "urun.degistir",
  sinir: "genel",
  isle: async ({ urun }, _istek, _yanit, { hesapKimligi }) => ({
    kimlik: await calisanSiteninUrunServisi().urunEkle(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      (await cevir(urun)) as UrunGirdisi,
    ),
  }),
});

// POST /kapi/yonetici/urun-degistir: yalnız verilen alan değişir.
export const urunDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: urunDegisikligiSemasi,
  izin: "urun.degistir",
  sinir: "genel",
  isle: async ({ kimlik, urun }, _istek, _yanit, { hesapKimligi }) => {
    await calisanSiteninUrunServisi().urunDegistir(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      kimlik,
      (await cevir(urun)) as UrunDegisikligi,
    );
    return {};
  },
});

// POST /kapi/yonetici/urun-sil: ürün silinmiş işaretlenir (birleşimleriyle); siparişlerde adıyla kalır.
export const urunSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: urunSilmeSemasi,
  izin: "urun.sil",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await calisanSiteninUrunServisi().urunSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});
