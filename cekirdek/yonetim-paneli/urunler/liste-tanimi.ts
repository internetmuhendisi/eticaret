// Ürünler listesinin tanımı (kart 0262, karar 0161). Sayfa, liste ekranı ve liste ucu (GET /kapi/yonetici/urunler)
// buradan okur. Sunucuda ve tarayıcıda çalışır.
// - Süzgeçler: yayın durumu, kategori (alt kategorileriyle), stok durumu, marka (taslağın sırası). Kategori ve marka
//   sitenin kayıtlarıdır (kayıt süzgeci): seçenekleri sayfa verir.
// - Arama: ad ya da stok kodu; ürün bilgisi kişisel değildir, adreste durur.
// - Toplu işlemler: fiyat, stok, kategoriye ekle ve çıkar (kart 0314, pencerede önizlenir), yayınla, taslağa al,
//   arşive al, sil (karar 0157), her biri kendi izniyle.
import type { PanelSayfaBoyu } from "../../kayitlar/liste";
import {
  type UrunDurumu,
  type UrunPanelSiralamasi,
  type UrunPanelStokDurumu,
  urunDurumlari,
  urunPanelAramaSiniri,
  urunPanelSiralamalari,
  urunPanelStokDurumlari,
  urunTopluDuzenlemeKodlari,
  urunTopluDuzenlemeleri,
  urunTopluIslemKodlari,
  urunTopluIslemleri,
} from "../../kayitlar/urun";
import { urunlerAdresi } from "../adresler";
import type { ListeDurumu, ListeTanimi } from "../liste/tanim";

export const urunListesiTanimi = {
  kod: "urunler",
  adres: urunlerAdresi,
  suzgecler: [
    { kod: "durum", tur: "secenekler", secenekler: urunDurumlari },
    { kod: "kategori", tur: "kayit", secenekler: [] },
    { kod: "stok", tur: "secenekler", secenekler: urunPanelStokDurumlari },
    { kod: "marka", tur: "kayit", secenekler: [] },
  ],
  arama: { enCok: urunPanelAramaSiniri, adreste: true },
  siralamalar: urunPanelSiralamalari,
  sayfali: true,
  siralanabilirSutunlar: {
    urun: { azalan: "ad-azalan", artan: "ad-artan" },
    stok: { azalan: "stok-azalan", artan: "stok-artan" },
    fiyat: { azalan: "fiyat-azalan", artan: "fiyat-artan" },
  },
  // Her toplu işlemin izni kayıttaki işleminkidir (urunTopluDuzenlemeleri, urunTopluIslemleri); uç da aynısını
  // denetler. Toplu düzenlemeler (kart 0314) durum işlemlerinden öncedir (taslak).
  topluIslemler: [
    ...urunTopluDuzenlemeKodlari.map((kod) => ({ kod, izin: urunTopluDuzenlemeleri[kod].izin })),
    ...urunTopluIslemKodlari.map((kod) => ({ kod, izin: urunTopluIslemleri[kod].izin })),
  ],
} as const satisfies ListeTanimi;

// Listenin durumundan servisin girdisi (urunPanelListesi, cekirdek/moduller/urun/panel-listesi.ts).
export const urunListesiGirdisi = (durum: ListeDurumu, sayfaBoyu: PanelSayfaBoyu) => {
  const secilen = (kod: string) => durum.suzgecler[kod] ?? [];
  return {
    ara: durum.ara,
    durum: secilen("durum") as UrunDurumu[],
    kategori: secilen("kategori"),
    marka: secilen("marka"),
    stok: secilen("stok") as UrunPanelStokDurumu[],
    siralama: durum.siralama as UrunPanelSiralamasi,
    sayfa: durum.sayfa,
    sayfaBoyu,
  };
};
