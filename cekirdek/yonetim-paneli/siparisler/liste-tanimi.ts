// Siparişler listesinin tanımı (kart 0258; kart 0234'ün listesi liste motoruna taşındı). Sayfa, liste ekranı ve
// liste ucu (GET /kapi/yonetici/siparisler) buradan okur. Sunucuda ve tarayıcıda çalışır.
// - Durum sekmesi: siparişin durumları ve "bakilacak" (kart 0267: bildirilmiş havale, bekleyen iade talebi, sonucu
//   beklenen iade). Kart 0239'un "iade-talebi" sekmesi ona katıldı; eski adres yeni sekmeyi açar.
// - Tarih süzgeci (kart 0267): siparişin oluşturulduğu gün, hazır aralıklar ya da iki gün, sitenin saat dilimiyle.
// - Ödeme yöntemi süzgeci: siparişin yöntemi (panelden "elden" dahil).
// - Kargo firması süzgeci (kart 0267): siparişlerdeki firma adları, sayfa seçenekleri sunucudan verir.
// - Arama adrese yazılmaz (kişisel bilgi, karar 0145): ekran aranan metni liste ucuna gönderir.
// - Toplu işlem: hazırlamaya al (kart 0258, karar 0157). Fiş yazdırma kart 0270'tedir.
import type { PanelSayfaBoyu } from "../../kayitlar/liste";
import { type SiparisOdemeYontemi, siparisOdemeYontemleri } from "../../kayitlar/odeme";
import {
  type SiparisDurumu,
  type SiparisListesiSiralamasi,
  siparisDurumlari,
  siparisIslemleri,
  siparisListesiSiralamalari,
  siparisSinirlari,
  siparisTopluIslemleri,
} from "../../kayitlar/siparis";
import { siparislerAdresi } from "../adresler";
import {
  type ListeDurumu,
  type ListeTanimi,
  tarihDegeriniCoz,
  tarihSuzgecininGunleri,
} from "../liste/tanim";

export const bakilacakSekmesi = "bakilacak";

export const siparisListesiTanimi = {
  kod: "siparisler",
  adres: siparislerAdresi,
  suzgecler: [
    {
      kod: "durum",
      tur: "sekme",
      secenekler: [...siparisDurumlari, bakilacakSekmesi],
      eskiDegerler: { "iade-talebi": bakilacakSekmesi },
    },
    { kod: "tarih", tur: "tarih", secenekler: ["bugun", "son-7-gun", "son-30-gun"] },
    { kod: "odeme", tur: "secenekler", secenekler: siparisOdemeYontemleri },
    {
      kod: "kargo",
      tur: "deger",
      secenekler: [],
      degerEnCok: siparisSinirlari.kargoFirmasiAdEnCok,
    },
  ],
  arama: { enCok: siparisSinirlari.aramaEnCok, adreste: false },
  siralamalar: siparisListesiSiralamalari,
  sayfali: true,
  siralanabilirSutunlar: {
    tarih: { azalan: "en-yeni", artan: "en-eski" },
    tutar: { azalan: "tutar-azalan", artan: "tutar-artan" },
  },
  // Her toplu işlemin izni kayıttaki işleminkidir (siparisIslemleri); uç da aynısını denetler.
  topluIslemler: siparisTopluIslemleri.map((kod) => ({ kod, izin: siparisIslemleri[kod].izin })),
} as const satisfies ListeTanimi;

// Listenin durumundan servisin girdisi (siparisListesiSemasi, cekirdek/moduller/siparis/semalar.ts). Tarih süzgecinin
// hazır aralığı bugüne göre çözülür: bugün sitenin saat dilimindeki takvim günüdür (çağıran verir).
export const siparisListesiGirdisi = (
  durum: ListeDurumu,
  sayfaBoyu: PanelSayfaBoyu,
  bugun: string,
) => {
  const sekme = durum.suzgecler["durum"]?.[0];
  const odeme = durum.suzgecler["odeme"] as SiparisOdemeYontemi[] | undefined;
  const kargo = durum.suzgecler["kargo"];
  const tarihDegeri = durum.suzgecler["tarih"]?.[0];
  const tarih = tarihDegeri === undefined ? undefined : tarihDegeriniCoz(tarihDegeri);
  return {
    ...(sekme === bakilacakSekmesi
      ? { bakilacak: true as const }
      : sekme === undefined
        ? {}
        : { durum: sekme as SiparisDurumu }),
    ...(tarih === undefined ? {} : { tarih: tarihSuzgecininGunleri(tarih, bugun) }),
    ...(odeme === undefined ? {} : { odeme }),
    ...(kargo === undefined ? {} : { kargo }),
    ...(durum.ara === "" ? {} : { ara: durum.ara }),
    siralama: durum.siralama as SiparisListesiSiralamasi,
    sayfa: durum.sayfa,
    sayfaBoyu,
  };
};
