// Yorumlar listesinin tanımı (kart 0277, karar 0174). Sayfa, liste ekranı ve liste ucu (GET /kapi/yonetici/yorumlar)
// buradan okur. Sunucuda ve tarayıcıda çalışır.
// - Sekme: yorumun durumu; liste Onay bekleyen ile açılır ("Tümü" yoktur, varsayılan sekme adrese yazılmaz).
// - Süzgeç: puan (birden çok). Arama: ürünün adı ya da yorumun kısaltılmış adı; vitrinde de görünen bilgidir,
//   adreste durur.
// - Toplu işlemler: yayınla ve reddet (karar 0157), izinleri kayıttaki işleminkidir; uç da aynısını denetler.
import type { PanelSayfaBoyu } from "../../kayitlar/liste";
import {
  type YorumDurumu,
  type YorumPanelSiralamasi,
  yorumDurumlari,
  yorumPanelSiralamalari,
  yorumPuanlari,
  yorumSinirlari,
  yorumTopluIslemKodlari,
  yorumTopluIslemleri,
} from "../../kayitlar/yorum";
import { yorumlarAdresi } from "../adresler";
import type { ListeDurumu, ListeTanimi } from "../liste/tanim";

export const yorumListesiTanimi = {
  kod: "yorumlar",
  adres: yorumlarAdresi,
  suzgecler: [
    { kod: "durum", tur: "sekme", secenekler: yorumDurumlari, varsayilan: "onay-bekliyor" },
    { kod: "puan", tur: "secenekler", secenekler: yorumPuanlari },
  ],
  arama: { enCok: yorumSinirlari.panelArama, adreste: true },
  siralamalar: yorumPanelSiralamalari,
  sayfali: true,
  siralanabilirSutunlar: {},
  topluIslemler: yorumTopluIslemKodlari.map((kod) => ({
    kod,
    izin: yorumTopluIslemleri[kod].izin,
  })),
} as const satisfies ListeTanimi;

// Listenin durumundan servisin girdisi (yorumPanelListesi, cekirdek/moduller/yorum/panel-listesi.ts).
export const yorumListesiGirdisi = (durum: ListeDurumu, sayfaBoyu: PanelSayfaBoyu) => ({
  ara: durum.ara,
  durum: durum.suzgecler["durum"]?.[0] as YorumDurumu | undefined,
  puan: (durum.suzgecler["puan"] ?? []).map(Number),
  siralama: durum.siralama as YorumPanelSiralamasi,
  sayfa: durum.sayfa,
  sayfaBoyu,
});
