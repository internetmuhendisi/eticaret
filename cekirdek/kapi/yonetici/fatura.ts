// Siparişin faturası panelde (kart 0268, karar 0170; uç belgesi: cekirdek/kapi/uclar.md). Uçlar yalnız yönlendirir:
// kurallar fatura servisindedir (cekirdek/moduller/siparis/fatura.ts). Dosyanın reddi alanın koduyla döner
// (dosyaHatalari); metni ekran çözer.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { dosyaGovdesiSemasi } from "../../moduller/dosya/semalar.ts";
import { belgeKaydet } from "../../moduller/dosya/servis.ts";
import { siparisFaturaServisi } from "../../moduller/siparis/fatura.ts";
import {
  siparisAyrintisiSemasi,
  siparisFaturasiKaldirSemasi,
  siparisFaturasiSemasi,
} from "../../moduller/siparis/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata, DosyaYaniti } from "../zarf.ts";

const servis = () => siparisFaturaServisi(calisanSite());
const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

// POST /kapi/yonetici/fatura-yukle: gövdedeki PDF'i belge olarak kaydeder; kimliğini ve boyutunu döner. Siparişe
// bağlanması siparis-fatura ucuyla yapılır (dosya kaydı bir veritabanı işleminin içinde çağrılamaz).
export const faturaYuklemeUcu = ucTanimla({
  giris: "yonetici",
  govde: "dosya",
  sema: dosyaGovdesiSemasi,
  izin: "siparis.yonet",
  sinir: "yukleme",
  isle: async ({ dosya }) => {
    const sonuc = await belgeKaydet(siteninVeritabani(), dosya);
    if (!sonuc.tamam) throw new BilinenHata("dogrulama", [{ alan: "dosya", kod: sonuc.hata }]);
    return { dosya: sonuc.dosya.kimlik, boyut: sonuc.dosya.boyut };
  },
});

// POST /kapi/yonetici/siparis-fatura: faturayı yazar (ekler ya da değiştirir).
export const siparisFaturaUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisFaturasiSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    servis().yaz(siteninVeritabani(), yonetici(hesapKimligi), girdi),
});

// POST /kapi/yonetici/siparis-fatura-kaldir: faturayı kaldırır (yanlış siparişe eklenen fatura).
export const siparisFaturaKaldirUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisFaturasiKaldirSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    servis().kaldir(siteninVeritabani(), yonetici(hesapKimligi), girdi),
});

// GET /kapi/yonetici/siparis-faturasi?numara=: faturanın PDF'i, indirilecek dosya olarak. Dosyasız ya da olmayan
// siparişte bulunamadı.
export const panelFaturaDosyasiUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisAyrintisiSemasi,
  izin: "siparis.gor",
  sinir: "genel",
  isle: async ({ numara }) => {
    const belge = await servis().dosyaOku(siteninVeritabani(), { numara });
    if (belge === undefined) throw new BilinenHata("bulunamadi");
    return new DosyaYaniti(
      belge.icerik,
      belge.mime,
      belge.ozet,
      "ozel",
      `fatura-${belge.siparis}.pdf`,
    );
  },
});
