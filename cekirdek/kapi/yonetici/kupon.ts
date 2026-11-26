// Kupon uçları (kart 0313, karar 0188; uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: formun metinlerini
// panelKuponGirdisi çevirir, kuralların hepsi (kod, indirim, kapsam, süre, sınırlar, kullanılmış kupon, çakışma) kupon
// servisindedir (cekirdek/moduller/kampanya/servis.ts). Hata alanın adıyla ve koduyla döner.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { panelKuponGirdisi } from "../../moduller/kampanya/panel.ts";
import { kuponDegisikligiSemasi, kuponEklemeSemasi } from "../../moduller/kampanya/semalar.ts";
import { type KuponEklemeGirdisi, kuponServisi } from "../../moduller/kampanya/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { kuponListesiTanimi } from "../../yonetim-paneli/kuponlar/liste-tanimi.ts";
import { kuponListesiVerisi } from "../../yonetim-paneli/kuponlar/veri.ts";
import { listeUcuSemasi } from "../../yonetim-paneli/liste/tanim.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

// GET /kapi/yonetici/kuponlar?durum=&ara=&sirala=&sayfa=: panelin kupon listesinin bir sayfası.
export const kuponListesiUcu = ucTanimla({
  giris: "yonetici",
  sema: listeUcuSemasi(kuponListesiTanimi),
  izin: "kupon.gor",
  sinir: "genel",
  isle: (durum) => kuponListesiVerisi(durum),
});

// POST /kapi/yonetici/kupon-ekle: yeni kupon. Yanıt kuponun kimliğidir.
export const kuponEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: kuponEklemeSemasi,
  izin: "kupon.degistir",
  sinir: "genel",
  isle: async ({ kupon }, _istek, _yanit, { hesapKimligi }) => {
    const site = calisanSite();
    const girdi = panelKuponGirdisi(site, kupon) as KuponEklemeGirdisi;
    const kimlik = await siteninVeritabani().transaction((islem) =>
      kuponServisi(site).ekle(islem, yonetici(hesapKimligi), girdi),
    );
    return { kimlik };
  },
});

// POST /kapi/yonetici/kupon-degistir: yalnız verilen alanlar değişir (kapatma ve açma da). Ekranın gördüğü değişme
// anı arada değiştiyse çakışma (kupon-degisti). Yanıt kuponun yeni değişme anıdır.
export const kuponDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: kuponDegisikligiSemasi,
  izin: "kupon.degistir",
  sinir: "genel",
  isle: async ({ kimlik, gorulen, kupon }, _istek, _yanit, { hesapKimligi }) => {
    const site = calisanSite();
    const girdi = panelKuponGirdisi(site, kupon);
    const { degismeZamani } = await siteninVeritabani().transaction((islem) =>
      kuponServisi(site).degistir(islem, yonetici(hesapKimligi), kimlik, girdi, new Date(gorulen)),
    );
    return { gorulen: degismeZamani.toISOString() };
  },
});
