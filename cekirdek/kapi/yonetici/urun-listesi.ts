// Panelin ürün listesi uçları (kart 0262, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: liste ürün
// listesinin servisinden (cekirdek/moduller/urun/panel-listesi.ts), toplu işlem her ürünü ürün servisinin tekil
// işlemiyle (urunDegistir, urunSil) yapar.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { urunTopluIslemleri } from "../../kayitlar/urun.ts";
import { yoneticininIzniVarMi } from "../../moduller/ekip/servis.ts";
import { urunTopluIslem } from "../../moduller/urun/panel-listesi.ts";
import { urunTopluIslemiSemasi } from "../../moduller/urun/semalar.ts";
import { siteninUrunServisi } from "../../moduller/urun/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { listeUcuSemasi } from "../../yonetim-paneli/liste/tanim.ts";
import { urunListesiTanimi } from "../../yonetim-paneli/urunler/liste-tanimi.ts";
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
