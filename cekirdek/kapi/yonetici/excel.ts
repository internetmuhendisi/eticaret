// Excel ile toplu ürün işlemleri eklentisinin panel uçları (kart 0315, uç belgesi: cekirdek/kapi/uclar.md). Uçlar
// yalnız yönlendirir: kurallar eklentinin servisindedir (cekirdek/eklentiler/excel-ile-toplu-urun-islemleri/servis.ts).
// Eklenti kapalıyken servis bulunamadı verir. Dışa aktarma ve içe aktarma yöneticinin kendisinindir: başka yöneticinin
// dosyası ve işi bulunamadıdır.
import { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { calisanExcelServisi } from "../../eklentiler/excel-ile-toplu-urun-islemleri/isler.ts";
import { yerelZamana } from "../../metinler/bicimleyici.ts";
import { dosyaGovdesiSemasi } from "../../moduller/dosya/semalar.ts";
import { yoneticininYetkileri } from "../../moduller/ekip/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { listeDurumunuOku } from "../../yonetim-paneli/liste/tanim.ts";
import {
  urunListesiGirdisi,
  urunListesiTanimi,
} from "../../yonetim-paneli/urunler/liste-tanimi.ts";
import { ucTanimla } from "../uc.ts";
import { DosyaYaniti } from "../zarf.ts";

const xlsxTuru = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Ürün listesinin sorgusu (adresin "?" sonrası): süzgeçler ve arama. Verilmezse bütün ürünler.
export const excelDisaAktarmaSemasi = z.strictObject({
  sorgu: z.string().max(2000).optional(),
});
export const excelKimlikSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const excelDurumSemasi = z.strictObject({ kimlik: kimlikSemasi.optional() });

// Sorgunun liste girdisi: sayfanın okuduğu biçimle (aynı adın birden çok değeri dizi olur).
const kapsamiCoz = (sorgu: string) => {
  const okunan: Record<string, string | string[]> = {};
  for (const [ad, deger] of new URLSearchParams(sorgu)) {
    const onceki = okunan[ad];
    okunan[ad] =
      onceki === undefined ? deger : [...(Array.isArray(onceki) ? onceki : [onceki]), deger];
  }
  const {
    sayfa: _sayfa,
    sayfaBoyu: _boy,
    ...kapsam
  } = urunListesiGirdisi(listeDurumunuOku(urunListesiTanimi, okunan), 25);
  return kapsam;
};

// POST /kapi/yonetici/urunler-excel-disa-aktar: dışa aktarmayı başlatır; fiyat sütunları fiyatı, stok sütunu stoğu
// görebilene yazılır.
export const excelDisaAktarUcu = ucTanimla({
  giris: "yonetici",
  sema: excelDisaAktarmaSemasi,
  izin: "urun.gor",
  sinir: "genel",
  isle: async ({ sorgu }, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    const yetkiler = await yoneticininYetkileri(vt, hesapKimligi);
    const kimlik = await calisanExcelServisi().disaAktarmaBaslat(vt, hesapKimligi, {
      kapsam: sorgu === undefined ? null : kapsamiCoz(sorgu),
      fiyat: yetkiler("fiyat.gor"),
      stok: yetkiler("stok.gor"),
    });
    return { kimlik };
  },
});

// GET /kapi/yonetici/urunler-excel-disa-aktarma?kimlik=: dışa aktarmanın durumu (kimliksiz: yöneticinin sonuncusu).
export const excelDisaAktarmaDurumuUcu = ucTanimla({
  giris: "yonetici",
  sema: excelDurumSemasi,
  izin: "urun.gor",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => ({
    disaAktarma: await calisanExcelServisi().disaAktarmaDurumu(
      siteninVeritabani(),
      hesapKimligi,
      kimlik,
    ),
  }),
});

// GET /kapi/yonetici/urunler-excel-indir?kimlik=: hazır dosya, indirilecek dosya olarak; yalnız hazırlayana.
export const excelIndirUcu = ucTanimla({
  giris: "yonetici",
  sema: excelKimlikSemasi,
  izin: "urun.gor",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    const { dosya, olusturma } = await calisanExcelServisi().disaAktarmaDosyasi(
      siteninVeritabani(),
      hesapKimligi,
      kimlik,
    );
    const gun = yerelZamana(olusturma, calisanSite().ayarlar.saatDilimi).slice(0, 10);
    return new DosyaYaniti(new Uint8Array(dosya), xlsxTuru, kimlik, "ozel", `urunler-${gun}.xlsx`);
  },
});

// POST /kapi/yonetici/urunler-excel-yukle?ad=: gövde dosyanın kendisidir (yükleme sınırı); dosyanın adı yalnız
// gösterilir. Dosya arka planda denetlenir.
export const excelYukleUcu = ucTanimla({
  giris: "yonetici",
  govde: "dosya",
  sema: dosyaGovdesiSemasi,
  izin: "urun.degistir",
  sinir: "yukleme",
  isle: async ({ dosya }, istek, _yanit, { hesapKimligi }) => {
    // Denetim karakterleri atılır (ad yalnız gösterilir).
    const ad = [...(new URL(istek.url).searchParams.get("ad") ?? "")]
      .filter((harf) => {
        const kod = harf.codePointAt(0) ?? 0;
        return kod >= 0x20 && kod !== 0x7f;
      })
      .join("")
      .slice(0, 200);
    const kimlik = await calisanExcelServisi().iceAktarmaYukle(siteninVeritabani(), hesapKimligi, {
      dosya,
      ad: ad === "" ? "urunler.xlsx" : ad,
    });
    return { kimlik };
  },
});

// GET /kapi/yonetici/urunler-excel-ice-aktarma?kimlik=: içe aktarmanın durumu ve önizlemesi (kimliksiz: sonuncusu).
export const excelIceAktarmaDurumuUcu = ucTanimla({
  giris: "yonetici",
  sema: excelDurumSemasi,
  izin: "urun.degistir",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => ({
    iceAktarma: await calisanExcelServisi().iceAktarmaDurumu(
      siteninVeritabani(),
      hesapKimligi,
      kimlik,
    ),
  }),
});

// POST /kapi/yonetici/urunler-excel-uygula: önizlemenin onayı.
export const excelUygulaUcu = ucTanimla({
  giris: "yonetici",
  sema: excelKimlikSemasi,
  izin: "urun.degistir",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await calisanExcelServisi().uygula(siteninVeritabani(), hesapKimligi, kimlik);
    return { kimlik };
  },
});

// POST /kapi/yonetici/urunler-excel-vazgec: önizlemeden vazgeçer, dosya silinir.
export const excelVazgecUcu = ucTanimla({
  giris: "yonetici",
  sema: excelKimlikSemasi,
  izin: "urun.degistir",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await calisanExcelServisi().vazgec(siteninVeritabani(), hesapKimligi, kimlik);
    return { kimlik };
  },
});
