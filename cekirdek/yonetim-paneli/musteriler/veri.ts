// Müşteriler ekranlarının verisi (kart 0271, karar 0173): servisin sonucu sitenin biçimiyle (tarih, para) yazılır;
// tarayıcı biçimlemez. Liste ucu ve sayfa aynı işlevi çağırır.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { musteriPanelSinirlari } from "../../kayitlar/musteri-paneli";
import type { SiparisDurumu } from "../../kayitlar/siparis";
import { gununBasi, takvimGunu } from "../../metinler/bicimleyici";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { musteriYonetimi } from "../../moduller/musteri/yonetim";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { type ListeDurumu, type ListeVerisi, tarihSuzgecininAyrikGunleri } from "../liste/tanim";
import { yazanYazisi } from "../siparisler/metinler";
import { adresSatirlari } from "../siparisler/veri";
import { musteriListesiGirdisi } from "./liste-tanimi";

const bicim = () => siteninBicimleyicisi(calisanSite().ayarlar);

export type MusteriSatiri = {
  kimlik: string;
  // Son siparişin ya da varsayılan adresin adı; yoksa boş (ekran e-postayı yazar).
  ad: string;
  eposta: string;
  kayit: string;
  siparisSayisi: number;
  toplam: string;
  kampanyaIzni: boolean;
};

export const musteriListesiVerisi = async (
  durum: ListeDurumu,
): Promise<ListeVerisi<MusteriSatiri>> => {
  const site = calisanSite();
  const b = bicim();
  const vt = siteninVeritabani();
  const { panelSayfaBoyu } = await siteninMagazaAyarlari(vt, site);
  const bugun = takvimGunu(new Date(), site.ayarlar.saatDilimi);
  const liste = await musteriYonetimi(site).liste(
    vt,
    musteriListesiGirdisi(durum, panelSayfaBoyu, bugun),
  );
  return {
    satirlar: liste.satirlar.map((satir) => ({
      kimlik: satir.kimlik,
      ad: satir.ad ?? "",
      eposta: satir.eposta,
      kayit: b.tarih(satir.kayit),
      siparisSayisi: satir.siparisSayisi,
      toplam: b.para(satir.toplam),
      kampanyaIzni: satir.kampanyaIzni,
    })),
    toplam: liste.toplam,
    sayfa: liste.sayfa,
    sayfaSayisi: liste.sayfaSayisi,
    sayfaBoyu: liste.sayfaBoyu,
    sekmeSayilari: {},
  };
};

// Kayıt tarihi süzgecindeki günlerin sitenin biçimiyle yazılışı (şerit; tarayıcı biçimlemez).
export const musteriListesiGunYazilari = (durum: ListeDurumu): Record<string, string> => {
  const site = calisanSite();
  const b = bicim();
  return Object.fromEntries(
    tarihSuzgecininAyrikGunleri(durum, "kayit").map((gun) => [
      gun,
      b.tarih(gununBasi(gun, site.ayarlar.saatDilimi)),
    ]),
  );
};

export type MusteriAyrintisiVerisi = {
  kimlik: string;
  ad: string;
  eposta: string;
  kayit: string;
  siparisSayisi: number;
  toplam: string;
  ortalama: string;
  kampanya: { var: boolean; zaman: string | null };
  uyelikSurumu: string | null;
  siparisler: { numara: string; zaman: string; durum: SiparisDurumu; toplam: string }[];
  // Gösterilen siparişler sınırda kesildiyse true (daha eskileri siparişler listesinde aranır).
  siparisKesildi: boolean;
  adresler: {
    kimlik: string;
    baslik: string;
    ad: string;
    telefon: string | null;
    satirlar: string[];
    varsayilanTeslimat: boolean;
    varsayilanFatura: boolean;
  }[];
  notlar: { kimlik: string; zaman: string; metin: string; yazan: string }[];
};

// Ayrıntı: olmayan ya da silinmiş hesapta null. Notun yazanı panelin ortak yazılışıyla (siparişlerle aynı).
export const musteriAyrintisiVerisi = async (
  kimlik: string,
): Promise<MusteriAyrintisiVerisi | null> => {
  const site = calisanSite();
  const b = bicim();
  const ayrinti = await musteriYonetimi(site).ayrinti(siteninVeritabani(), kimlik);
  if (ayrinti === null) return null;
  return {
    kimlik: ayrinti.kimlik,
    ad: ayrinti.ad ?? "",
    eposta: ayrinti.eposta,
    kayit: b.tarih(ayrinti.kayit),
    siparisSayisi: ayrinti.siparisSayisi,
    toplam: b.para(ayrinti.toplam),
    ortalama: b.para(
      ayrinti.siparisSayisi === 0 ? 0 : Math.round(ayrinti.toplam / ayrinti.siparisSayisi),
    ),
    kampanya: {
      var: ayrinti.kampanyaIzni,
      zaman: ayrinti.kampanyaZamani === null ? null : b.tarih(ayrinti.kampanyaZamani),
    },
    uyelikSurumu: ayrinti.uyelikSurumu,
    siparisler: ayrinti.siparisler.map((siparis) => ({
      numara: siparis.numara,
      zaman: b.tarih(siparis.zaman),
      durum: siparis.durum,
      toplam: b.para(siparis.toplam),
    })),
    siparisKesildi: ayrinti.siparisler.length >= musteriPanelSinirlari.ayrintiSiparis,
    adresler: ayrinti.adresler.map((adres) => ({
      kimlik: adres.kimlik,
      baslik: adres.baslik,
      ad: `${adres.teslimat.ad} ${adres.teslimat.soyad}`.trim(),
      telefon: adres.teslimat.telefon ?? null,
      satirlar: adresSatirlari(adres.teslimat.adres),
      varsayilanTeslimat: adres.varsayilanTeslimat,
      varsayilanFatura: adres.varsayilanFatura,
    })),
    notlar: ayrinti.notlar.map((not) => ({
      kimlik: not.kimlik,
      zaman: b.tarihSaat(not.zaman),
      metin: not.metin,
      yazan: yazanYazisi(metin, not.yazan),
    })),
  };
};
