// Blog listesinin tanımı (kart 0272, karar 0176). Sayfa, liste ekranı ve liste ucu (GET /kapi/yonetici/blog-yazilari)
// buradan okur. Sunucuda ve tarayıcıda çalışır.
// - Sekme: yazının vitrindeki durumu (Tümü, yayında, zamanlanmış, taslak).
// - Süzgeç: blog kategorisi (kayıt süzgeci, seçenekleri sayfa verir). Arama: başlık; adreste durur.
// - Toplu işlem yoktur.
import {
  type BlogPanelSiralamasi,
  type BlogYaziDurumu,
  blogPanelSiralamalari,
  blogSinirlari,
} from "../../kayitlar/blog";
import type { PanelSayfaBoyu } from "../../kayitlar/liste";
import { blogAdresi } from "../adresler";
import type { ListeDurumu, ListeTanimi } from "../liste/tanim";

// Sekmenin sırası: yayında önce (taslağın "Durum" süzgeci).
export const blogListeDurumlari = [
  "yayinda",
  "zamanlanmis",
  "taslak",
] as const satisfies readonly BlogYaziDurumu[];

export const blogListesiTanimi = {
  kod: "blog",
  adres: blogAdresi,
  suzgecler: [
    { kod: "durum", tur: "sekme", secenekler: blogListeDurumlari },
    { kod: "kategori", tur: "kayit", secenekler: [] },
  ],
  arama: { enCok: blogSinirlari.panelArama, adreste: true },
  siralamalar: blogPanelSiralamalari,
  sayfali: true,
  siralanabilirSutunlar: {
    yayin: { azalan: "yayin-azalan", artan: "yayin-artan" },
  },
  topluIslemler: [],
} as const satisfies ListeTanimi;

// Listenin durumundan servisin girdisi (blogPanelListesi, cekirdek/moduller/icerik/panel-listesi.ts).
export const blogListesiGirdisi = (durum: ListeDurumu, sayfaBoyu: PanelSayfaBoyu) => ({
  ara: durum.ara,
  durum: durum.suzgecler["durum"]?.[0] as BlogYaziDurumu | undefined,
  kategori: durum.suzgecler["kategori"] ?? [],
  siralama: durum.siralama as BlogPanelSiralamasi,
  sayfa: durum.sayfa,
  sayfaBoyu,
});
