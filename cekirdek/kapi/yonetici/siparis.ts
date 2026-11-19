// Panelin sipariş uçları (kart 0234, karar 0145; uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kurallar
// sipariş yönetimi (cekirdek/moduller/siparis/yonetim.ts) ve sipariş ayarları (ayarlar.ts) servisindedir. Havale onayı
// kendi izniyle ayrı uçtur (yalnız mağaza sahibi, kullanıcı kararı); öteki durum işlemleri yönetim iznini ister.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siparisAyarlari } from "../../moduller/siparis/ayarlar.ts";
import { iadeServisi } from "../../moduller/siparis/iade.ts";
import {
  havaleOnayiSemasi,
  iadeYenidenDenemeSemasi,
  kargoFirmalariDurumuSemasi,
  kargoFirmalariSemasi,
  siparisAyrintisiSemasi,
  siparisIadesiSemasi,
  siparisIslemiSemasi,
  siparisListesiSemasi,
  siparisNotuSemasi,
} from "../../moduller/siparis/semalar.ts";
import { siparisYonetimi } from "../../moduller/siparis/yonetim.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

// GET /kapi/yonetici/siparisler?durum=&ara=&sayfa=: siparişler, en yeni önce, durum sayılarıyla.
export const siparisListesiUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisListesiSemasi,
  izin: "siparis.gor",
  sinir: "genel",
  isle: (girdi) => siparisYonetimi(calisanSite()).liste(siteninVeritabani(), girdi),
});

// GET /kapi/yonetici/siparis?numara=: siparişin ayrıntısı, geçmişi, notları ve havale bildirimleri.
export const siparisAyrintisiUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisAyrintisiSemasi,
  izin: "siparis.gor",
  sinir: "genel",
  isle: async ({ numara }) => {
    const ayrinti = await siparisYonetimi(calisanSite()).ayrinti(siteninVeritabani(), numara);
    if (ayrinti === null) throw new BilinenHata("bulunamadi");
    return ayrinti;
  },
});

// POST /kapi/yonetici/siparis-islemi: hazırlamaya al, kargoya ver, kargoyu düzelt, teslim edildi.
export const siparisIslemiUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisIslemiSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    siparisYonetimi(calisanSite()).islemYap(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});

// POST /kapi/yonetici/siparis-havale-onayi: havalenin ödemesi alındı, sipariş hazırlanıyor olur.
export const siparisHavaleOnayiUcu = ucTanimla({
  giris: "yonetici",
  sema: havaleOnayiSemasi,
  izin: "siparis.havale-onayla",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    siparisYonetimi(calisanSite()).islemYap(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      { ...girdi, islem: "havale-onayla" },
    ),
});

// POST /kapi/yonetici/siparis-notu: iç not ya da müşteriye not.
export const siparisNotuUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisNotuSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    siparisYonetimi(calisanSite()).notEkle(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});

// GET /kapi/yonetici/siparis-ayarlari: kargo firmaları.
export const siparisAyarlariDurumuUcu = ucTanimla({
  giris: "yonetici",
  sema: kargoFirmalariDurumuSemasi,
  izin: "magaza-ayarlari.gor",
  sinir: "genel",
  isle: () => siparisAyarlari(calisanSite()).oku(siteninVeritabani()),
});

// POST /kapi/yonetici/siparis-ayarlari: kargo firmaları listesini gördüğü hâliyle değiştirir.
export const siparisAyarlariUcu = ucTanimla({
  giris: "yonetici",
  sema: kargoFirmalariSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    siparisAyarlari(calisanSite()).kargoFirmalariniKaydet(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});

// POST /kapi/yonetici/siparis-iadesi: iptal ya da iade (kart 0235, karar 0147). Tutar ve vergiyi servis hesaplar;
// kartla ödemede para ödeme kuruluşundan döner (yanıt gelmezse iade bekler).
export const siparisIadesiUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisIadesiSemasi,
  izin: "siparis.iade",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    iadeServisi(calisanSite()).iadeYap(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});

// POST /kapi/yonetici/siparis-iadesi-yeniden: kuruluşun yanıtını bekleyen iadeyi yeniden dener.
export const siparisIadesiYenidenUcu = ucTanimla({
  giris: "yonetici",
  sema: iadeYenidenDenemeSemasi,
  izin: "siparis.iade",
  sinir: "genel",
  isle: ({ numara }, _istek, _yanit, { hesapKimligi }) =>
    iadeServisi(calisanSite()).yenidenDene(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      numara,
    ),
});
