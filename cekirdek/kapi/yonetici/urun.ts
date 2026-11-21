// Ürün ekranının uçları (kart 0263, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: ürünün kuralları
// (adres adı, yayın zamanı, alım adedi, kategori, marka, etiket, ilgili ürünler, özellik değerleri) ürün servisindedir
// (cekirdek/moduller/urun/servis.ts). Ağırlık ve sayı türündeki özellik değerleri sitenin sayı biçimiyle yazılmış
// metindir; servisten önce panel-girdisi.ts çevirir. Değişikliği yapan yönetici kapıdan gelir. Seçenekler bölümü
// (kart 0264, karar 0163) verilirse ürünle aynı işlemde yazılır: biri düşerse hiçbiri kalmaz. Kayıtlı seçenek ya da
// değer silmek birleşim silmektir, urun.sil ister.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { yoneticininIzniVarMi } from "../../moduller/ekip/servis.ts";
import { panelGirdisiniCevir, panelVaryantiniCevir } from "../../moduller/urun/panel-girdisi.ts";
import {
  type UrunDegisikligi,
  type UrunGirdisi,
  urunDegisikligiSemasi,
  urunEklemeSemasi,
  urunSilmeSemasi,
  type VaryantKaydi,
} from "../../moduller/urun/semalar.ts";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis.ts";
import { siteninVeritabani, type VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

const panelAyarlari = () => {
  const { ayarlar } = calisanSite();
  return { bicimleyici: siteninBicimleyicisi(ayarlar), agirlikBirimi: ayarlar.agirlikBirimi };
};
const cevir = (ham: Readonly<Record<string, unknown>>) =>
  panelGirdisiniCevir(siteninVeritabani(), ham, panelAyarlari());

// Seçenekler bölümünü ürünle aynı işlemde yazar (verilmediyse hiçbir şey yapmaz).
const varyantlariYaz = async (
  islem: VeritabaniIslemi,
  hesapKimligi: string,
  urun: string,
  varyant: Readonly<Record<string, unknown>> | undefined,
) => {
  if (varyant === undefined) return;
  await calisanSiteninUrunServisi().varyantlariKaydet(
    islem,
    yonetici(hesapKimligi),
    urun,
    panelVaryantiniCevir(varyant, panelAyarlari()) as VaryantKaydi,
    { silebilir: await yoneticininIzniVarMi(siteninVeritabani(), hesapKimligi, "urun.sil") },
  );
};

// POST /kapi/yonetici/urun-ekle: yeni ürün; durum verilmezse taslaktır.
export const urunEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: urunEklemeSemasi,
  izin: "urun.degistir",
  sinir: "genel",
  isle: async ({ urun, varyant }, _istek, _yanit, { hesapKimligi }) => {
    const girdi = (await cevir(urun)) as UrunGirdisi;
    return {
      kimlik: await siteninVeritabani().transaction(async (islem) => {
        const kimlik = await calisanSiteninUrunServisi().urunEkle(
          islem,
          yonetici(hesapKimligi),
          girdi,
        );
        await varyantlariYaz(islem, hesapKimligi, kimlik, varyant);
        return kimlik;
      }),
    };
  },
});

// POST /kapi/yonetici/urun-degistir: yalnız verilen alan değişir.
export const urunDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: urunDegisikligiSemasi,
  izin: "urun.degistir",
  sinir: "genel",
  isle: async ({ kimlik, urun, varyant }, _istek, _yanit, { hesapKimligi }) => {
    const girdi = (await cevir(urun)) as UrunDegisikligi;
    // Seçenekler önce: son seçenek kaldırılıp ürün basit olunca ürünün birim alanları (stok kodu, barkod, ağırlık) aynı
    // kayıtta yeni basit birime yazılır (bağımsız kontrolün bulgusu); seçenek eklenince ekran bu alanları göndermez.
    await siteninVeritabani().transaction(async (islem) => {
      await varyantlariYaz(islem, hesapKimligi, kimlik, varyant);
      await calisanSiteninUrunServisi().urunDegistir(islem, yonetici(hesapKimligi), kimlik, girdi);
    });
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
