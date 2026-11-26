// Vergi uçları (kart 0322; uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: sınıfların ve oranların kuralları
// vergi servisinde (cekirdek/moduller/vergi/servis.ts), genel ayarların yazımı vergi ayarlarındadır (ayarlar.ts). Sınıfın
// ve oranın alanları uçta nesne olarak alınır, servisin şemasıyla doğrulanır (hata alanın adıyla ve koduyla döner).
// Görmek vergi.gor, bütün değişiklikler (silme dahil) vergi.degistir ister.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { vergiAyarlariniDegistir } from "../../moduller/vergi/ayarlar.ts";
import type { OranDegisikligi, OranGirdisi, SinifGirdisi } from "../../moduller/vergi/semalar.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import {
  vergiAyarlariSemasi,
  vergiKimlikSemasi,
  vergiOraniDegisikligiSemasi,
  vergiOraniEklemeSemasi,
  vergiSinifiDegisikligiSemasi,
  vergiSinifiEklemeSemasi,
  vergiSinifSiralamaSemasi,
} from "../../moduller/vergi/uc-semalari.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });
const servis = () => siteninVergiServisi(calisanSite());

// POST /kapi/yonetici/vergi-ayarlari: genel ayarlar ve kargonun sınıfı birlikte.
export const vergiAyarlariUcu = ucTanimla({
  giris: "yonetici",
  sema: vergiAyarlariSemasi,
  izin: "vergi.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    vergiAyarlariniDegistir(siteninVeritabani(), calisanSite(), yonetici(hesapKimligi), girdi),
});

// POST /kapi/yonetici/vergi-sinifi-ekle: ad; sınıf listenin sonuna gelir.
export const vergiSinifiEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: vergiSinifiEklemeSemasi,
  izin: "vergi.degistir",
  sinir: "genel",
  isle: async ({ sinif }, _istek, _yanit, { hesapKimligi }) => ({
    kimlik: await servis().sinifEkle(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      sinif as SinifGirdisi,
    ),
  }),
});

// POST /kapi/yonetici/vergi-sinifi-degistir: ad.
export const vergiSinifiDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: vergiSinifiDegisikligiSemasi,
  izin: "vergi.degistir",
  sinir: "genel",
  isle: async ({ kimlik, sinif }, _istek, _yanit, { hesapKimligi }) => {
    await servis().sinifDegistir(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      kimlik,
      sinif as Partial<SinifGirdisi>,
    );
    return {};
  },
});

// POST /kapi/yonetici/vergi-sinifi-sil: silinmiş işaretiyle; bağlı ürünler sınıfın oranlarıyla vergilenmeye devam eder
// (karar 0060).
export const vergiSinifiSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: vergiKimlikSemasi,
  izin: "vergi.degistir",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await servis().sinifSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});

// POST /kapi/yonetici/vergi-siniflari-sirala: silinmemiş bütün sınıfların yeni sırası.
export const vergiSinifSiralamaUcu = ucTanimla({
  giris: "yonetici",
  sema: vergiSinifSiralamaSemasi,
  izin: "vergi.degistir",
  sinir: "genel",
  isle: async ({ kimlikler }, _istek, _yanit, { hesapKimligi }) => {
    await servis().siniflariSirala(siteninVeritabani(), yonetici(hesapKimligi), kimlikler);
    return {};
  },
});

// POST /kapi/yonetici/vergi-orani-ekle: sınıfa oran (ülke, il, posta kodu, yüzde, ad).
export const vergiOraniEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: vergiOraniEklemeSemasi,
  izin: "vergi.degistir",
  sinir: "genel",
  isle: async ({ sinif, oran }, _istek, _yanit, { hesapKimligi }) => ({
    kimlik: await servis().oranEkle(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      sinif,
      oran as OranGirdisi,
    ),
  }),
});

// POST /kapi/yonetici/vergi-orani-degistir: yalnız verilen alan değişir, null isteğe bağlı alanı boşaltır.
export const vergiOraniDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: vergiOraniDegisikligiSemasi,
  izin: "vergi.degistir",
  sinir: "genel",
  isle: async ({ kimlik, oran }, _istek, _yanit, { hesapKimligi }) => {
    await servis().oranDegistir(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      kimlik,
      oran as OranDegisikligi,
    );
    return {};
  },
});

// POST /kapi/yonetici/vergi-orani-sil
export const vergiOraniSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: vergiKimlikSemasi,
  izin: "vergi.degistir",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await servis().oranSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});
