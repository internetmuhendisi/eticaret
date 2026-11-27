// Panonun "Bakılması gerekenler" satırları (kart 0186, karar 0199): eklentilerin panoya bağlandığı tek nokta. Her satır
// eklentinin panel sayfasına bağlıdır (sayfa ağacındaki kod): sayfanın izni ve eklentisi satırın da iznidir, eklenti
// kapalıyken ya da izin yokken satır okunmaz. Eklenti yalnız sayıyı ve ilk birkaç örneği verir; satırın yazısı
// panonun metinlerindedir (yonetim.pano.satir.<sayfa kodu>), vitrinin metin dosyasına gitmez.
//
// Yeni eklentinin satırı bu listeye eklenir; pano değişmez.
import type { Site } from "../ayar-semasi/site-klasoru.ts";
import type { Veritabani } from "../veritabani/baglanti.ts";
import { stokBildirimiServisi } from "./stoga-gelince-haber-ver/servis.ts";

// ornekToplami: örneklerin kaç kayıttan seçildiği (fazlası "ve N tane daha" yazılır).
export type PanoSatiriOkumasi = { adet: number; ornekler: string[]; ornekToplami: number };

export type PanoSatirTanimi = {
  // Panel sayfasının kodu (sayfa-agaci.ts): bağlantı, izin ve eklenti oradan.
  sayfa: "stok-bildirimleri";
  oku: (vt: Veritabani, site: Site, ornek: number) => Promise<PanoSatiriOkumasi>;
};

export const eklentiPanoSatirlari: readonly PanoSatirTanimi[] = [
  // Stoğa gelince haber ver: bekleyen talep sayısı ve talebi en çok olan ürünler (panel listesinin sırası).
  {
    sayfa: "stok-bildirimleri",
    oku: async (vt, site, ornek) => {
      const satirlar = await stokBildirimiServisi(site).panelListesi(vt);
      // Liste birim başınadır: bedenli ürünün adı bir kez yazılır.
      const urunler = [...new Set(satirlar.map((satir) => satir.urunAdi))];
      return {
        adet: satirlar.reduce((toplam, satir) => toplam + satir.bekleyen, 0),
        ornekler: urunler.slice(0, ornek),
        ornekToplami: urunler.length,
      };
    },
  },
];
