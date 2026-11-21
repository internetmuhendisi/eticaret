// Ürün ekranının uçları (kart 0263, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: ürünün kuralları
// (adres adı, yayın zamanı, alım adedi, kategori, marka, etiket, ilgili ürünler, özellik değerleri) ürün servisindedir
// (cekirdek/moduller/urun/servis.ts). Ağırlık ve sayı türündeki özellik değerleri sitenin sayı biçimiyle yazılmış
// metindir; servisten önce panel-girdisi.ts çevirir. Değişikliği yapan yönetici kapıdan gelir. Seçenekler bölümü
// (kart 0264, karar 0163) verilirse ürünle aynı işlemde yazılır: biri düşerse hiçbiri kalmaz. Kayıtlı seçenek ya da
// değer silmek birleşim silmektir, urun.sil ister. Fiyat ve stok bölümleri (kart 0265) `fiyatStok` ile en son,
// aynı işlemde yazılır (panel-fiyat-stok.ts): fiyat fiyat.degistir, stok stok.duzelt ister.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { yoneticininIzniVarMi } from "../../moduller/ekip/servis.ts";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import type { ElleDuzeltme } from "../../moduller/stok/semalar.ts";
import { calisanSiteninStokServisi } from "../../moduller/stok/servis.ts";
import { type PanelFiyatStok, panelFiyatStokYaz } from "../../moduller/urun/panel-fiyat-stok.ts";
import { panelGirdisiniCevir, panelVaryantiniCevir } from "../../moduller/urun/panel-girdisi.ts";
import {
  type UrunDegisikligi,
  type UrunGirdisi,
  urunDegisikligiSemasi,
  urunEklemeSemasi,
  urunGecmisiSemasi,
  urunSilmeSemasi,
  urunStokDuzeltmeSemasi,
  type VaryantKaydi,
} from "../../moduller/urun/semalar.ts";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis.ts";
import { siteninVeritabani, type VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { urununGecmisSayfasi } from "../../yonetim-paneli/urunler/fiyat-stok-verisi.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

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

// Fiyat ve stok bölümlerini en son, aynı işlemde yazar (verilmediyse hiçbir şey yapmaz). İzin yalnız gerekince okunur.
const fiyatStokYaz = async (
  islem: VeritabaniIslemi,
  hesapKimligi: string,
  urun: string,
  fiyatStok: Readonly<Record<string, unknown>> | undefined,
) => {
  if (fiyatStok === undefined) return;
  const vt = siteninVeritabani();
  await panelFiyatStokYaz(
    islem,
    yonetici(hesapKimligi),
    urun,
    fiyatStok as PanelFiyatStok,
    {
      fiyat: calisanSiteninFiyatServisi(),
      stok: calisanSiteninStokServisi(),
      bicimleyici: panelAyarlari().bicimleyici,
      saatDilimi: calisanSite().ayarlar.saatDilimi,
    },
    {
      fiyat: await yoneticininIzniVarMi(vt, hesapKimligi, "fiyat.degistir"),
      stok: await yoneticininIzniVarMi(vt, hesapKimligi, "stok.duzelt"),
    },
  );
};

// POST /kapi/yonetici/urun-ekle: yeni ürün; durum verilmezse taslaktır.
export const urunEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: urunEklemeSemasi,
  izin: "urun.degistir",
  sinir: "genel",
  isle: async ({ urun, varyant, fiyatStok }, _istek, _yanit, { hesapKimligi }) => {
    const girdi = (await cevir(urun)) as UrunGirdisi;
    return {
      kimlik: await siteninVeritabani().transaction(async (islem) => {
        const kimlik = await calisanSiteninUrunServisi().urunEkle(
          islem,
          yonetici(hesapKimligi),
          girdi,
        );
        await varyantlariYaz(islem, hesapKimligi, kimlik, varyant);
        await fiyatStokYaz(islem, hesapKimligi, kimlik, fiyatStok);
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
  isle: async ({ kimlik, urun, varyant, fiyatStok }, _istek, _yanit, { hesapKimligi }) => {
    const girdi = (await cevir(urun)) as UrunDegisikligi;
    // Seçenekler önce: son seçenek kaldırılıp ürün basit olunca ürünün birim alanları (stok kodu, barkod, ağırlık) aynı
    // kayıtta yeni basit birime yazılır (bağımsız kontrolün bulgusu); seçenek eklenince ekran bu alanları göndermez.
    await siteninVeritabani().transaction(async (islem) => {
      await varyantlariYaz(islem, hesapKimligi, kimlik, varyant);
      await calisanSiteninUrunServisi().urunDegistir(islem, yonetici(hesapKimligi), kimlik, girdi);
      await fiyatStokYaz(islem, hesapKimligi, kimlik, fiyatStok);
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

// POST /kapi/yonetici/urun-stok-duzelt: basit ürünün "Stoğu düzelt" penceresi (kart 0265); hemen kaydeder. Ekranın
// gördüğü miktar artık doğru değilse çakışma (stok-degisti), hiçbir şey yazılmaz.
export const urunStokDuzeltmeUcu = ucTanimla({
  giris: "yonetici",
  sema: urunStokDuzeltmeSemasi,
  izin: "stok.duzelt",
  sinir: "genel",
  isle: async ({ birim, duzeltme }, _istek, _yanit, { hesapKimligi }) => {
    await calisanSiteninStokServisi().stokDuzelt(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      birim,
      // Stok servisi kendi şemasıyla (elleDuzeltme) doğrular: hata alanın adı ve koduyla döner.
      duzeltme as ElleDuzeltme,
    );
    return {};
  },
});

// Ürün ekranının fiyat ve stok geçmişinin sonraki sayfası (kart 0265, "Daha fazla"): ekranın ilk sayfasıyla aynı işlev.
// `sonra` bir önceki sayfanın son satırıdır.
const gecmisUcu = (tur: "fiyat" | "stok") =>
  ucTanimla({
    giris: "yonetici",
    sema: urunGecmisiSemasi,
    izin: tur === "fiyat" ? "fiyat.gor" : "stok.gor",
    sinir: "genel",
    isle: async ({ kimlik, sonra }) => {
      const sayfa = await urununGecmisSayfasi(tur, kimlik, sonra);
      if (sayfa === undefined) throw new BilinenHata("bulunamadi");
      return sayfa;
    },
  });

// POST /kapi/yonetici/urun-fiyat-gecmisi
export const urunFiyatGecmisiUcu = gecmisUcu("fiyat");
// POST /kapi/yonetici/urun-stok-gecmisi
export const urunStokGecmisiUcu = gecmisUcu("stok");
