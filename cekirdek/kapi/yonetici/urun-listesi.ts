// Panelin ürün listesi uçları (kart 0262, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: liste ürün
// listesinin servisinden (cekirdek/moduller/urun/panel-listesi.ts), toplu işlem her ürünü ürün servisinin tekil
// işlemiyle (urunDegistir, urunSil) yapar.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import {
  type UrunTopluDuzenlemesi,
  urunTopluDuzenlemeleri,
  urunTopluIslemleri,
} from "../../kayitlar/urun.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { yoneticininIzniVarMi } from "../../moduller/ekip/servis.ts";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { calisanSiteninStokServisi } from "../../moduller/stok/servis.ts";
import { urunTopluIslem } from "../../moduller/urun/panel-listesi.ts";
import { urunTopluIslemiSemasi } from "../../moduller/urun/semalar.ts";
import { siteninUrunServisi } from "../../moduller/urun/servis.ts";
import {
  topluOnizle,
  topluOnizlemeSemasi,
  topluUygula,
  topluUygulamaSemasi,
} from "../../moduller/urun/toplu-duzenleme.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { listeUcuSemasi } from "../../yonetim-paneli/liste/tanim.ts";
import { urunListesiTanimi } from "../../yonetim-paneli/urunler/liste-tanimi.ts";
import { topluOnizlemeVerisi } from "../../yonetim-paneli/urunler/toplu-duzenleme-verisi.ts";
import { urunListesiVerisi } from "../../yonetim-paneli/urunler/veri.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

// GET /kapi/yonetici/urunler?durum=&kategori=&stok=&marka=&ara=&sirala=&sayfa=: panelin ürün listesinin bir sayfası.
// Girdi ve yanıt panel sayfasınınkiyle aynıdır (liste tanımı ve urunListesiVerisi). Görsel, sitedeki görselleri görme
// izni (dosya.gor) olana verilir.
export const urunListesiUcu = ucTanimla({
  giris: "yonetici",
  sema: listeUcuSemasi(urunListesiTanimi),
  izin: "urun.gor",
  sinir: "genel",
  isle: async (durum, _istek, _yanit, { hesapKimligi }) =>
    urunListesiVerisi(durum, {
      gorselGorur: await yoneticininIzniVarMi(siteninVeritabani(), hesapKimligi, "dosya.gor"),
    }),
});

// Toplu düzenlemenin servisleri sitenin ayarlarıyla (kart 0314).
const duzenlemeServisleri = () => {
  const site = calisanSite();
  return {
    fiyat: calisanSiteninFiyatServisi(),
    stok: calisanSiteninStokServisi(),
    urunDegistir: siteninUrunServisi(site).urunDegistir,
    bicimleyici: siteninBicimleyicisi(site.ayarlar),
    saatDilimi: site.ayarlar.saatDilimi,
    paraBirimi: site.ayarlar.paraBirimi,
  };
};

// İşin kendi izni (fiyat.degistir, stok.duzelt, urun.degistir): yoksa yetki.
const duzenlemeIzniniDenetle = async (hesapKimligi: string, islem: UrunTopluDuzenlemesi) => {
  const izin = urunTopluDuzenlemeleri[islem].izin;
  if (!(await yoneticininIzniVarMi(siteninVeritabani(), hesapKimligi, izin))) {
    throw new BilinenHata("yetki");
  }
};

const isinTuru = (islem: UrunTopluDuzenlemesi) =>
  islem === "fiyat" ? "fiyat" : islem === "stok" ? "stok" : "kategori";

// POST /kapi/yonetici/urunler-toplu-onizle: seçilen ürünlerin toplu düzenlemesinin önizlemesi (kart 0314). Hiçbir
// şey yazılmaz. Uç ürünü görme iznini ister; işin kendi izni ayrıca denetlenir.
export const urunTopluOnizlemeUcu = ucTanimla({
  giris: "yonetici",
  sema: topluOnizlemeSemasi,
  izin: "urun.gor",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    await duzenlemeIzniniDenetle(hesapKimligi, girdi.duzenleme.islem);
    const onizleme = await topluOnizle(siteninVeritabani(), girdi, duzenlemeServisleri());
    return topluOnizlemeVerisi(onizleme, isinTuru(girdi.duzenleme.islem));
  },
});

// POST /kapi/yonetici/urunler-toplu-duzenle: önizlenen toplu düzenlemenin uygulanması (kart 0314). Her ürün kendi
// işleminde; görülen değerler değiştiyse "degisti". Uç ürünü görme iznini ister; işin kendi izni ayrıca denetlenir.
export const urunTopluDuzenlemeUcu = ucTanimla({
  giris: "yonetici",
  sema: topluUygulamaSemasi,
  izin: "urun.gor",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    await duzenlemeIzniniDenetle(hesapKimligi, girdi.duzenleme.islem);
    return topluUygula(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
      duzenlemeServisleri(),
    );
  },
});

// POST /kapi/yonetici/urunler-toplu: seçilen ürünlere toplu işlem (yayınla, taslağa al, arşive al, sil). Uç
// değiştirme iznini ister; işlemin kendi izni (sil: urun.sil) ayrıca denetlenir.
export const urunTopluIslemiUcu = ucTanimla({
  giris: "yonetici",
  sema: urunTopluIslemiSemasi,
  izin: "urun.degistir",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    if (!(await yoneticininIzniVarMi(vt, hesapKimligi, urunTopluIslemleri[girdi.islem].izin))) {
      throw new BilinenHata("yetki");
    }
    return urunTopluIslem(
      vt,
      { tur: "yonetici", kimlik: hesapKimligi },
      siteninUrunServisi(calisanSite()),
      girdi,
    );
  },
});
