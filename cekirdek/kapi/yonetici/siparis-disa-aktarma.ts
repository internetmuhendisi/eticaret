// Siparişleri dışa aktarma uçları (kart 0316, karar 0185; uç belgesi: cekirdek/kapi/uclar.md). Uçlar yalnız
// yönlendirir: kurallar servistedir (cekirdek/moduller/siparis/disa-aktarma.ts). Dışa aktarma yöneticinin kendisinindir:
// başka yöneticinin dosyası bulunamadıdır.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { takvimGunu, yerelZamana } from "../../metinler/bicimleyici.ts";
import { calisanDisaAktarmaServisi } from "../../moduller/siparis/isler.ts";
import {
  siparisDisaAktarmaDurumSemasi,
  siparisDisaAktarmaKimligiSemasi,
  siparisDisaAktarmaSemasi,
} from "../../moduller/siparis/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { listeDurumunuOku, sorgudanDegerler } from "../../yonetim-paneli/liste/tanim.ts";
import {
  siparisListesiGirdisi,
  siparisListesiTanimi,
} from "../../yonetim-paneli/siparisler/liste-tanimi.ts";
import { ucTanimla } from "../uc.ts";
import { DosyaYaniti } from "../zarf.ts";

const csvTuru = "text/csv; charset=utf-8";

// Listenin sorgusundan süzgeçler: sayfanın okuduğu biçimle; tarih süzgecinin hazır aralığı bugüne göre çözülür. Arama,
// sayfa ve sayfa boyu kapsamda yoktur.
const suzgecleriCoz = (sorgu: string) => {
  const site = calisanSite();
  const durum = listeDurumunuOku(siparisListesiTanimi, sorgudanDegerler(sorgu));
  const {
    ara: _ara,
    sayfa: _sayfa,
    sayfaBoyu: _boy,
    ...suzgecler
  } = siparisListesiGirdisi(
    { ...durum, ara: "" },
    25,
    takvimGunu(new Date(), site.ayarlar.saatDilimi),
  );
  return suzgecler;
};

// POST /kapi/yonetici/siparisler-disa-aktar: dışa aktarmayı başlatır; dosya arka planda hazırlanır.
export const siparisDisaAktarUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisDisaAktarmaSemasi,
  izin: "siparis.gor",
  sinir: "genel",
  isle: async ({ kapsam, duzen }, _istek, _yanit, { hesapKimligi }) => {
    const kimlik = await calisanDisaAktarmaServisi().baslat(siteninVeritabani(), hesapKimligi, {
      kapsam:
        kapsam.tur === "liste"
          ? { tur: "liste", suzgecler: suzgecleriCoz(kapsam.sorgu) }
          : { tur: "secili", numaralar: kapsam.numaralar },
      duzen,
    });
    return { kimlik };
  },
});

// GET /kapi/yonetici/siparisler-disa-aktarma?kimlik=: dışa aktarmanın durumu (kimliksiz: yöneticinin sonuncusu).
export const siparisDisaAktarmaDurumuUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisDisaAktarmaDurumSemasi,
  izin: "siparis.gor",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => ({
    disaAktarma: await calisanDisaAktarmaServisi().durum(siteninVeritabani(), hesapKimligi, kimlik),
  }),
});

// GET /kapi/yonetici/siparisler-disa-aktarma-indir?kimlik=: hazır dosya, indirilecek dosya olarak; yalnız isteyene.
// Her indirme değişiklik kaydına girer.
export const siparisDisaAktarmaIndirUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisDisaAktarmaKimligiSemasi,
  izin: "siparis.gor",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    const { dosya, olusturma } = await calisanDisaAktarmaServisi().dosya(
      siteninVeritabani(),
      hesapKimligi,
      kimlik,
    );
    const gun = yerelZamana(olusturma, calisanSite().ayarlar.saatDilimi).slice(0, 10);
    return new DosyaYaniti(new Uint8Array(dosya), csvTuru, kimlik, "ozel", `siparisler-${gun}.csv`);
  },
});
