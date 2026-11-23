// Müşteriler listesinin tanımı (kart 0271, karar 0173). Sayfa, liste ekranı ve liste ucu (GET
// /kapi/yonetici/musteriler) buradan okur. Sunucuda ve tarayıcıda çalışır.
// - Yalnız üyeler (karar 0157). Kayıt tarihi (sitenin saat dilimiyle), kampanya izni ve sipariş süzgeçleri.
// - Arama ad ya da e-postada; adrese yazılmaz (kişisel bilgi, karar 0145): ekran aranan metni liste ucuna gönderir.
// - Toplu işlem yok: seçim on beşinci bölümün dışa aktarması içindir (karar 0157).
import type { PanelSayfaBoyu } from "../../kayitlar/liste";
import {
  type MusteriListesiSiralamasi,
  musteriKampanyaSecenekleri,
  musteriListesiSiralamalari,
  musteriPanelSinirlari,
  musteriSiparisSecenekleri,
} from "../../kayitlar/musteri-paneli";
import { musterilerAdresi } from "../adresler";
import {
  type ListeDurumu,
  type ListeTanimi,
  tarihDegeriniCoz,
  tarihSuzgecininGunleri,
} from "../liste/tanim";

export const musteriListesiTanimi = {
  kod: "musteriler",
  adres: musterilerAdresi,
  suzgecler: [
    { kod: "kayit", tur: "tarih", secenekler: ["bugun", "son-7-gun", "son-30-gun"] },
    { kod: "kampanya", tur: "secenekler", secenekler: musteriKampanyaSecenekleri },
    { kod: "siparis", tur: "secenekler", secenekler: musteriSiparisSecenekleri },
  ],
  arama: { enCok: musteriPanelSinirlari.aramaEnCok, adreste: false },
  siralamalar: musteriListesiSiralamalari,
  sayfali: true,
  siralanabilirSutunlar: {
    kayit: { azalan: "en-yeni", artan: "en-eski" },
    siparis: { azalan: "siparis-azalan", artan: "siparis-artan" },
    toplam: { azalan: "toplam-azalan", artan: "toplam-artan" },
  },
  topluIslemler: [],
} as const satisfies ListeTanimi;

// Listenin durumundan servisin girdisi (musteriListesiSemasi). Hazır tarih aralığı bugüne göre çözülür: bugün sitenin
// saat dilimindeki takvim günüdür (çağıran verir).
export const musteriListesiGirdisi = (
  durum: ListeDurumu,
  sayfaBoyu: PanelSayfaBoyu,
  bugun: string,
) => {
  const kayitDegeri = durum.suzgecler["kayit"]?.[0];
  const kayit = kayitDegeri === undefined ? undefined : tarihDegeriniCoz(kayitDegeri);
  const kampanya = durum.suzgecler["kampanya"] as ("var" | "yok")[] | undefined;
  const siparis = durum.suzgecler["siparis"] as ("var" | "yok")[] | undefined;
  return {
    ...(kayit === undefined ? {} : { kayit: tarihSuzgecininGunleri(kayit, bugun) }),
    ...(kampanya === undefined ? {} : { kampanya }),
    ...(siparis === undefined ? {} : { siparis }),
    ...(durum.ara === "" ? {} : { ara: durum.ara }),
    siralama: durum.siralama as MusteriListesiSiralamasi,
    sayfa: durum.sayfa,
    sayfaBoyu,
  };
};
