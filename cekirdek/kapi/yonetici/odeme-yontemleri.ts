// Ödeme yöntemleri ve banka hesapları uçları (kart 0214, uç belgesi: cekirdek/kapi/uclar.md, karar 0141). Uç yalnız
// yönlendirir: kurallar (en az bir açık yöntem, gün sınırı, IBAN, hesap sınırı, sıralamanın listesi) ödeme yöntemi
// servisindedir (cekirdek/moduller/odeme/yontemler.ts). Görmek ve değiştirmek ayrı izindir: görevli görür, yalnız
// mağaza sahibi değiştirir (kullanıcı kararı).
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import {
  bankaHesabiDegisikligiSemasi,
  bankaHesabiSemasi,
  bankaHesabiSilmeSemasi,
  bankaHesaplariSiralamaSemasi,
  odemeYontemleriDurumuSemasi,
  odemeYontemleriSemasi,
  odemeYontemleriSiralamaSemasi,
} from "../../moduller/odeme/yontem-semalari.ts";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });
const servis = () => odemeYontemiServisi(calisanSite());

// GET /kapi/yonetici/odeme-yontemleri: yöntemler sırasıyla, kapıda ödemenin seçenekleri, iptal süresi, hesaplar.
export const odemeYontemleriDurumuUcu = ucTanimla({
  giris: "yonetici",
  sema: odemeYontemleriDurumuSemasi,
  izin: "odeme-yontemi.gor",
  sinir: "genel",
  isle: () => servis().oku(siteninVeritabani()),
});

// POST /kapi/yonetici/odeme-yontemleri: yöntemleri, sırayı, seçenekleri ve iptal süresini birlikte kaydeder.
export const odemeYontemleriUcu = ucTanimla({
  giris: "yonetici",
  sema: odemeYontemleriSemasi,
  izin: "odeme-yontemi.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    servis().yontemleriDegistir(siteninVeritabani(), yonetici(hesapKimligi), girdi),
});

// POST /kapi/yonetici/odeme-yontemleri-sirala: yalnız yöntemlerin sırası, hemen (kart 0224, karar 0144).
export const odemeYontemleriSiralamaUcu = ucTanimla({
  giris: "yonetici",
  sema: odemeYontemleriSiralamaSemasi,
  izin: "odeme-yontemi.degistir",
  sinir: "genel",
  isle: ({ sira }, _istek, _yanit, { hesapKimligi }) =>
    servis().yontemleriSirala(siteninVeritabani(), yonetici(hesapKimligi), sira),
});

// POST /kapi/yonetici/banka-hesabi-ekle
export const bankaHesabiEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: bankaHesabiSemasi,
  izin: "odeme-yontemi.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    servis().hesapEkle(siteninVeritabani(), yonetici(hesapKimligi), girdi),
});

// POST /kapi/yonetici/banka-hesabi-degistir
export const bankaHesabiDegistirmeUcu = ucTanimla({
  giris: "yonetici",
  sema: bankaHesabiDegisikligiSemasi,
  izin: "odeme-yontemi.degistir",
  sinir: "genel",
  isle: ({ kimlik, ...girdi }, _istek, _yanit, { hesapKimligi }) =>
    servis().hesapDegistir(siteninVeritabani(), yonetici(hesapKimligi), kimlik, girdi),
});

// POST /kapi/yonetici/banka-hesabi-sil
export const bankaHesabiSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: bankaHesabiSilmeSemasi,
  izin: "odeme-yontemi.degistir",
  sinir: "genel",
  isle: ({ kimlik }, _istek, _yanit, { hesapKimligi }) =>
    servis().hesapSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik),
});

// POST /kapi/yonetici/banka-hesaplari-sirala: ekranın gördüğü bütün hesaplar yeni sırasıyla.
export const bankaHesaplariSiralamaUcu = ucTanimla({
  giris: "yonetici",
  sema: bankaHesaplariSiralamaSemasi,
  izin: "odeme-yontemi.degistir",
  sinir: "genel",
  isle: ({ sira }, _istek, _yanit, { hesapKimligi }) =>
    servis().hesaplariSirala(siteninVeritabani(), yonetici(hesapKimligi), sira),
});
