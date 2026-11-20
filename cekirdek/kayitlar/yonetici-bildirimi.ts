import type { EklentiKodu } from "./eklentiler.ts";
import type { EpostaSablonu } from "./eposta.ts";

// Yönetici bildirimlerinin kaydı (kart 0241, karar 0154). Her bildirim mağaza sahibinin ayarıyla ayrı ayrı açılıp
// kapanır (kapaliYoneticiBildirimleri; varsayılan hepsi açık). Alıcılar ayardaki adreslerdir, boşsa tam yetkili rolün
// (mağaza sahibi) silinmemiş yöneticileri. Bildirim e-postası müşterinin e-postasını, telefonunu ve açık adresini
// taşımaz: ad kısaltılır, adresten yalnız il ve ilçe.
// - yeni-siparis: vitrinden ve kartla ödemeden gelen sipariş (panelden girilen sipariş bildirilmez).
// - havale-bildirimi: müşteri havaleyle ödediğini bildirdi.
// - iade-talebi: müşteri iade talebi açtı.
// - iptal: müşterinin kendi iptali ya da süresi dolan havalenin iptali (mağazanın kendi iptali bildirilmez).
// - stok: sipariş bir birimin stoğunu düşük stok eşiğinin ya da sıfırın altına indirdi; uyarılar toplanır, saatte en
//   çok bir e-posta gider (kullanıcı kararı).
// - yorum: onay bekleyen yeni yorum.
// - kartla-odeme-uyusmazligi: kartla ödemenin günlük karşılaştırması uyuşmazlık buldu (eklenti).
// - bekleyen-iade: kartla iade kuruluşta takıldı, elle bakılmalı (eklenti).
// eklenti: bildirimin anahtarı panelde yalnız eklenti sitede açıkken görünür; bildirimin kendisi eklenti kapalıyken de
// gider (karar 0155: eklentinin para işleri kapalıyken de çalışır). sablon: e-postanın şablonu.
export const yoneticiBildirimTanimlari = {
  "yeni-siparis": { eklenti: null, sablon: "yonetici-yeni-siparis" },
  "havale-bildirimi": { eklenti: null, sablon: "yonetici-havale-bildirimi" },
  "iade-talebi": { eklenti: null, sablon: "yonetici-iade-talebi" },
  iptal: { eklenti: null, sablon: "yonetici-iptal" },
  stok: { eklenti: null, sablon: "yonetici-stok" },
  yorum: { eklenti: null, sablon: "yonetici-yorum" },
  "kartla-odeme-uyusmazligi": {
    eklenti: "kartla-odeme",
    sablon: "yonetici-kartla-odeme-uyusmazligi",
  },
  "bekleyen-iade": { eklenti: "kartla-odeme", sablon: "yonetici-bekleyen-iade" },
} as const satisfies Record<string, { eklenti: EklentiKodu | null; sablon: EpostaSablonu }>;
export type YoneticiBildirimi = keyof typeof yoneticiBildirimTanimlari;
export const yoneticiBildirimleri = Object.keys(yoneticiBildirimTanimlari) as [
  YoneticiBildirimi,
  ...YoneticiBildirimi[],
];

export const yoneticiBildirimSinirlari = {
  // Alıcı adresi en çok (kart 0233 önerisi, karar 0145).
  aliciEnCok: 5,
  // Stok uyarılarının iki e-postası arasındaki en kısa süre (saniye, kullanıcı kararı: saatte en çok bir).
  stokAraligiSaniye: 60 * 60,
  // Ertelenen stok işinin payı (saniye): işin zamanı uygulamanın, kalan süre veritabanının saatiyle hesaplanır; iki saat
  // arasındaki küçük fark ertelenen işi kalan süre bitmeden çalıştırmasın (bağımsız kontrolün bulgusu).
  stokErtelemePayiSaniye: 60,
  // İşlenmiş stok uyarısı bu kadar gün sonra silinir.
  stokUyarisiSaklamaGun: 30,
} as const;

// Stok uyarısının türü: düşük stok eşiğinin altına indi ya da tükendi.
export const stokUyarisiTurleri = ["dusuk", "tukendi"] as const;
export type StokUyarisiTuru = (typeof stokUyarisiTurleri)[number];
