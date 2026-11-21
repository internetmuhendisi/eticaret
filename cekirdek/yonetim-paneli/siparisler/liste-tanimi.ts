// Siparişler listesinin tanımı (kart 0258; kart 0234'ün listesi liste motoruna taşındı). Sayfa, liste ekranı ve
// liste ucu (GET /kapi/yonetici/siparisler) buradan okur. Sunucuda ve tarayıcıda çalışır.
// - Durum sekmesi: siparişin durumları ve "iade-talebi" (bekleyen iade talebi olanlar, kart 0239).
// - Ödeme yöntemi süzgeci: siparişin yöntemi (panelden "elden" dahil).
// - Arama adrese yazılmaz (kişisel bilgi, karar 0145): ekran aranan metni liste ucuna gönderir.
// - Toplu işlem: hazırlamaya al (kart 0258, karar 0157).
import type { PanelSayfaBoyu } from "../../kayitlar/liste";
import { type SiparisOdemeYontemi, siparisOdemeYontemleri } from "../../kayitlar/odeme";
import {
  type SiparisDurumu,
  type SiparisListesiSiralamasi,
  siparisDurumlari,
  siparisListesiSiralamalari,
  siparisSinirlari,
  siparisTopluIslemleri,
} from "../../kayitlar/siparis";
import { siparislerAdresi } from "../adresler";
import type { ListeDurumu, ListeTanimi } from "../liste/tanim";

export const iadeTalebiSekmesi = "iade-talebi";

export const siparisListesiTanimi = {
  kod: "siparisler",
  adres: siparislerAdresi,
  suzgecler: [
    { kod: "durum", tur: "sekme", secenekler: [...siparisDurumlari, iadeTalebiSekmesi] },
    { kod: "odeme", tur: "secenekler", secenekler: siparisOdemeYontemleri },
  ],
  arama: { enCok: siparisSinirlari.aramaEnCok, adreste: false },
  siralamalar: siparisListesiSiralamalari,
  sayfali: true,
  siralanabilirSutunlar: {
    tarih: { azalan: "en-yeni", artan: "en-eski" },
    tutar: { azalan: "tutar-azalan", artan: "tutar-artan" },
  },
  topluIslemler: siparisTopluIslemleri.map((kod) => ({ kod, izin: "siparis.yonet" as const })),
} as const satisfies ListeTanimi;

// Listenin durumundan servisin girdisi (siparisListesiSemasi, cekirdek/moduller/siparis/semalar.ts).
export const siparisListesiGirdisi = (durum: ListeDurumu, sayfaBoyu: PanelSayfaBoyu) => {
  const sekme = durum.suzgecler["durum"]?.[0];
  const odeme = durum.suzgecler["odeme"] as SiparisOdemeYontemi[] | undefined;
  return {
    ...(sekme === iadeTalebiSekmesi
      ? { talep: true as const }
      : sekme === undefined
        ? {}
        : { durum: sekme as SiparisDurumu }),
    ...(odeme === undefined ? {} : { odeme }),
    ...(durum.ara === "" ? {} : { ara: durum.ara }),
    siralama: durum.siralama as SiparisListesiSiralamasi,
    sayfa: durum.sayfa,
    sayfaBoyu,
  };
};
