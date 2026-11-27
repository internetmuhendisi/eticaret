// Panonun tanımı (kart 0186, karar 0199; taslak: panel.html ve panel-2.html "Pano"): kısayollar, yeni mağazanın açılış
// adımları ve sınırlar. Her kısayol ve adım bir panel sayfasına bağlıdır (sayfa-agaci.ts): bağlantı, izin ve eklenti
// oradan gelir; izni olmayana kısayol görünmez, adımın bağlantısı yoktur. Yeni ekran kısayol olacaksa buraya kodu
// yazılır.
import type { MetinAnahtari } from "../../metinler/metin";
import type { PanelEylemi } from "../eylemler";
import type { PanelSayfaKodu } from "../sayfa-agaci";

// Kısayolların sırası (taslak: Ürün ekle, Elle sipariş, Kupon; kart: vitrin bölümleri ve menüler). Eylem kaydında
// karşılığı olan kısayol oradaki ad ve ikonla çizilir (eylemler.ts); öteki menüdeki adı ve ikonuyla.
export const panoKisayollari = [
  { sayfa: "yeni-urun", eylem: "urun-ekle" },
  { sayfa: "elle-siparis", eylem: "elle-siparis" },
  { sayfa: "yeni-kupon", eylem: "kupon-ekle" },
  { sayfa: "vitrin-bolumleri" },
  { sayfa: "menuler" },
] as const satisfies readonly { sayfa: PanelSayfaKodu; eylem?: PanelEylemi }[];

// Yeni mağazanın açılış adımları (kullanıcı kararı: adımlardan biri eksikken görünür, hepsi tamamlanınca kalkar). Her
// adımın tamamlanıp tamamlanmadığı sunucuda ölçülür (pano/veri.ts):
// - urun: silinmemiş bir ürün var.
// - magaza: iletişim telefonu, mağaza adresi ve satıcı bilgileri dolu (vitrinin alt kısmı ve e-postalar).
// - odeme: müşterinin seçebileceği en az bir ödeme yöntemi var (kullanilabilirYontemler).
// - logo: mağazanın logosu var (yüklenen ya da sitenin ilk logosu).
export const panoAdimlari = [
  { kod: "urun", sayfa: "yeni-urun" },
  { kod: "magaza", sayfa: "magaza-bilgileri" },
  { kod: "odeme", sayfa: "odeme-yontemleri" },
  { kod: "logo", sayfa: "tema-ayarlari" },
] as const satisfies readonly { kod: string; sayfa: PanelSayfaKodu }[];
export type PanoAdimi = (typeof panoAdimlari)[number]["kod"];

export const panoSinirlari = {
  // Bir satırın alt yazısında sayılan en çok örnek (sipariş numarası, ürün adı).
  ornek: 3,
  // Satış grafiğinin gün sayısı (bugün dahil).
  satisGunu: 14,
} as const;

// Panonun başlığı günün selamıdır (karar 0199): metinleri yonetim.pano.selam.<kod>. Hangisinin seçildiği saate bağlıdır
// (veri.ts, selam); sayfanın başlığını ölçen denetimler (tarayıcı testleri, sunucudaki panel denemesi, kart 0336) bu
// listeyle ve panoBasligiMi ile ölçer, "Karşılama" gibi tek bir adı beklemez.
export const panoSelamlari = ["gunaydin", "iyiGunler", "iyiAksamlar"] as const;
export type PanoSelami = (typeof panoSelamlari)[number];
export const panoSelamAnahtari = (kod: PanoSelami): MetinAnahtari =>
  `yonetim.pano.selam.${kod}` as MetinAnahtari;
export const panoBasligiMi = (baslik: string, metin: (anahtar: MetinAnahtari) => string): boolean =>
  panoSelamlari.some((kod) => metin(panoSelamAnahtari(kod)) === baslik);
