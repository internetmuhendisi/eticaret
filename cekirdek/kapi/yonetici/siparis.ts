// Panelin sipariş uçları (kart 0234, karar 0145; uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kurallar
// sipariş yönetimi (cekirdek/moduller/siparis/yonetim.ts) ve sipariş ayarları (ayarlar.ts) servisindedir. Havale onayı
// kendi izniyle ayrı uçtur (yalnız mağaza sahibi, kullanıcı kararı); öteki durum işlemleri yönetim iznini ister.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siparisIslemleri } from "../../kayitlar/siparis.ts";
import { yoneticininIzniVarMi } from "../../moduller/ekip/servis.ts";
import { odemeServisi } from "../../moduller/odeme/servis.ts";
import { sepetSemasi } from "../../moduller/sepet/semalar.ts";
import { siparisAyarlari } from "../../moduller/siparis/ayarlar.ts";
import { elleSiparisMusterileri, elleSiparisUrunleri } from "../../moduller/siparis/elle.ts";
import { iadeServisi } from "../../moduller/siparis/iade.ts";
import { iadeTalebiServisi } from "../../moduller/siparis/iade-talebi.ts";
import {
  elleSiparisAramaSemasi,
  elleSiparisMusteriAramasiSemasi,
  elleSiparisSemasi,
  fisAyarlariSemasi,
  havaleOnayiSemasi,
  iadeTalebiKarariSemasi,
  iadeYenidenDenemeSemasi,
  iptalVeIadeAyarlariSemasi,
  kargoFirmalariDurumuSemasi,
  kargoFirmalariSemasi,
  siparisAyrintisiSemasi,
  siparisIadesiSemasi,
  siparisIslemiSemasi,
  siparisNotuSemasi,
  siparisTopluIslemiSemasi,
  yoneticiBildirimAyarlariSemasi,
} from "../../moduller/siparis/semalar.ts";
import { siparisYonetimi } from "../../moduller/siparis/yonetim.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { sepetGorunumu } from "../../vitrin/sepet/veri.ts";
import { listeUcuSemasi } from "../../yonetim-paneli/liste/tanim.ts";
import { siparisListesiTanimi } from "../../yonetim-paneli/siparisler/liste-tanimi.ts";
import { siparisListesiVerisi } from "../../yonetim-paneli/siparisler/veri.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

// GET /kapi/yonetici/siparisler?durum=&odeme=&ara=&sirala=&sayfa=: panelin sipariş listesinin bir sayfası (kart 0258).
// Girdi ve yanıt panel sayfasınınkiyle aynıdır (liste tanımı ve siparisListesiVerisi); ekran aranan metni buraya
// gönderir (adrese yazmaz).
export const siparisListesiUcu = ucTanimla({
  giris: "yonetici",
  sema: listeUcuSemasi(siparisListesiTanimi),
  izin: "siparis.gor",
  sinir: "genel",
  isle: (durum) => siparisListesiVerisi(durum),
});

// POST /kapi/yonetici/siparisler-toplu: seçilen siparişlere toplu işlem (kart 0258). Her sipariş tekil işlemle aynı
// denetimden geçer; işlenemeyenler nedeniyle döner.
export const siparisTopluIslemiUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisTopluIslemiSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  // Uç toplu işlemlerin ortak iznini ister; işlemin kendi izni (siparisIslemleri) ayrıca denetlenir: kayda başka izinli
  // bir işlem toplu olarak eklenirse (havale onayı) o izni olmayan yönetici yapamaz (bağımsız kontrolün bulgusu).
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    if (!(await yoneticininIzniVarMi(vt, hesapKimligi, siparisIslemleri[girdi.islem].izin))) {
      throw new BilinenHata("yetki");
    }
    return siparisYonetimi(calisanSite()).topluIslem(
      vt,
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    );
  },
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

// POST /kapi/yonetici/iptal-ve-iade-ayarlari: müşterinin kendi iptali, iade talebi süresi, iade kargosu (kart 0239).
export const iptalVeIadeAyarlariUcu = ucTanimla({
  giris: "yonetici",
  sema: iptalVeIadeAyarlariSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    siparisAyarlari(calisanSite()).iptalVeIadeAyarlariniKaydet(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});

// POST /kapi/yonetici/fis-ayarlari: sipariş fişinde fiyatlar (kart 0270).
export const fisAyarlariUcu = ucTanimla({
  giris: "yonetici",
  sema: fisAyarlariSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    siparisAyarlari(calisanSite()).fisAyarlariniKaydet(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});

// POST /kapi/yonetici/yonetici-bildirim-ayarlari: yönetici bildirimlerinin alıcıları ve kapalı bildirimler (kart 0241).
export const yoneticiBildirimAyarlariUcu = ucTanimla({
  giris: "yonetici",
  sema: yoneticiBildirimAyarlariSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    siparisAyarlari(calisanSite()).yoneticiBildirimleriniKaydet(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});

// POST /kapi/yonetici/iade-talebi-karari: müşterinin iade talebini onaylar ya da açıklamayla reddeder (kart 0239,
// karar 0151). Onay parayı geri ödemez: iade "İade yap" ile, talebe bağlanarak yapılır.
export const iadeTalebiKarariUcu = ucTanimla({
  giris: "yonetici",
  sema: iadeTalebiKarariSemasi,
  izin: "siparis.iade",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    iadeTalebiServisi(calisanSite()).kararVer(
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

// Elle sipariş (kart 0236, karar 0148). Sipariş vitrin siparişiyle aynı yoldan kurulur (odemeServisi.elleSiparisVer);
// tutarı sunucu hesaplar. "Ödeme alındı" (elden) ayrı izin ister (siparis.elden-tahsil, görevlide yok).

// GET /kapi/yonetici/elle-siparis-urunleri?ara=: eklenebilecek birimler, fiyat ve satılabilirlikle.
export const elleSiparisUrunleriUcu = ucTanimla({
  giris: "yonetici",
  sema: elleSiparisAramaSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  isle: async ({ ara }) => ({
    birimler: await elleSiparisUrunleri(siteninVeritabani(), calisanSite(), ara),
  }),
});

// GET /kapi/yonetici/elle-siparis-musterileri?ara=: e-postasında aranan üye müşteriler, son teslimat adresiyle.
export const elleSiparisMusterileriUcu = ucTanimla({
  giris: "yonetici",
  sema: elleSiparisMusteriAramasiSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  isle: async ({ ara }) => ({ musteriler: await elleSiparisMusterileri(siteninVeritabani(), ara) }),
});

// POST /kapi/yonetici/elle-siparis-hesabi: ekranın özeti, sepetin hesabıyla (vitrinin sepetiyle aynı görünüm).
export const elleSiparisHesabiUcu = ucTanimla({
  giris: "yonetici",
  sema: sepetSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  isle: ({ kalemler, vergiBolgeleri }) =>
    sepetGorunumu(siteninVeritabani(), calisanSite(), kalemler, {
      ...(vergiBolgeleri === undefined ? {} : { adresler: vergiBolgeleri }),
    }),
});

// POST /kapi/yonetici/elle-siparis: siparişi kurar.
export const elleSiparisUcu = ucTanimla({
  giris: "yonetici",
  sema: elleSiparisSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    if (
      girdi.bilgiler.odemeYontemi.yontem === "elden" &&
      !(await yoneticininIzniVarMi(vt, hesapKimligi, "siparis.elden-tahsil"))
    ) {
      throw new BilinenHata("yetki");
    }
    return odemeServisi(calisanSite()).elleSiparisVer(vt, hesapKimligi, girdi);
  },
});
