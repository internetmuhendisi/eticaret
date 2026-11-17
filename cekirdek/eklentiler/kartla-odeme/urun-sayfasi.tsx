// Kartla ödeme eklentisinin ürün sayfası yuvası (kart 0215, karar 0132): "Kartla N taksite kadar" satırı. Yalnız
// müşteri ödeme adımında kartla ödeyebiliyorsa (eklenti açık ve hazır, yöntem açık), mağaza sahibi satırı
// gösteriyorsa ve en çok taksit birden büyükse çizilir. Tablo pencere açılınca istenir.
import type { Site } from "../../ayar-semasi/site-klasoru";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { kullanilabilirYontemler } from "../../moduller/odeme/yontemler";
import type { Veritabani } from "../../veritabani/baglanti";
import type { UrunSayfasiYuvasi } from "../urun-sayfasi-yuvalari";
import { TaksitSatiri } from "./taksit-satiri";

export const kartlaOdemeYuvasi: UrunSayfasiYuvasi = async (vt: Veritabani, site: Site) => {
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  if (
    !ayarlar.kartlaOdemeUrunSayfasindaTaksit ||
    ayarlar.kartlaOdemeEnCokTaksit < 2 ||
    !kullanilabilirYontemler(site, ayarlar).some((yontem) => yontem.yontem === "kart")
  ) {
    return null;
  }
  return <TaksitSatiri enCok={ayarlar.kartlaOdemeEnCokTaksit} />;
};

// Kartla ödeme tükenmiş birim için iş görmez.
export const kartlaOdemeTukenmisBirimIster = (): boolean => false;
