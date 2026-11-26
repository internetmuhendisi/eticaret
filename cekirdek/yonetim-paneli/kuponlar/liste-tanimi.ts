// Kupon listesinin tanımı (kart 0313, karar 0188). Sayfa, liste ekranı ve liste ucu (GET /kapi/yonetici/kuponlar)
// buradan okur. Sunucuda ve tarayıcıda çalışır.
// - Sekme: kuponun bugünkü durumu (Tümü, etkin, zamanlanmış, süresi dolmuş, kapalı).
// - Arama: kod ve ad; adreste durur (kişisel bilgi değildir). Toplu işlem yoktur.
import {
  type KuponDurumu,
  type KuponPanelSiralamasi,
  kuponDurumlari,
  kuponPanelSiralamalari,
  kuponSinirlari,
} from "../../kayitlar/kampanya";
import type { PanelSayfaBoyu } from "../../kayitlar/liste";
import { kuponlarAdresi } from "../adresler";
import type { ListeDurumu, ListeTanimi } from "../liste/tanim";

export const kuponListesiTanimi = {
  kod: "kuponlar",
  adres: kuponlarAdresi,
  suzgecler: [{ kod: "durum", tur: "sekme", secenekler: kuponDurumlari }],
  arama: { enCok: kuponSinirlari.aramaEnCok, adreste: true },
  siralamalar: kuponPanelSiralamalari,
  sayfali: true,
  siralanabilirSutunlar: {},
  topluIslemler: [],
} as const satisfies ListeTanimi;

// Listenin durumundan servisin girdisi (kuponPanelListesi, cekirdek/moduller/kampanya/panel.ts).
export const kuponListesiGirdisi = (durum: ListeDurumu, sayfaBoyu: PanelSayfaBoyu) => ({
  ara: durum.ara,
  durum: durum.suzgecler["durum"]?.[0] as KuponDurumu | undefined,
  siralama: durum.siralama as KuponPanelSiralamasi,
  sayfa: durum.sayfa,
  sayfaBoyu,
});
