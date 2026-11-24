// Her sitede hazır gelen roller (karar 0040). Veritabanına değişiklik dosyasıyla girer; dosya ile
// bu tanımın aynı kaldığını cekirdek/moduller/ekip/testler/servis.test.ts denetler.
// Rol kodları yalnız burada, metinlerde ve belgede geçer: kodda rol adına göre kontrol yazılmaz,
// izne bakılır (cekirdek/testler/rol-adi-yok.test.ts).
import type { GirisIzni } from "../../kayitlar/izinler.ts";

export const baslangicRolleri = {
  // Tam yetki: bütün yönetici izinleri, ileride eklenecekler de.
  "magaza-sahibi": { tamYetki: true, izinler: [] },
  // Ürünü görür ve değiştirir, silemez (kart 0076, kullanıcı kararı).
  gorevli: {
    tamYetki: false,
    // Kategoriyi görür, değiştirir ve taşır, silemez (kart 0077, kullanıcı kararı).
    izinler: [
      "ekip.kendi-hesabi.gor",
      "urun.gor",
      "urun.degistir",
      "kategori.gor",
      "kategori.degistir",
      // Marka ve etiketi görür ve değiştirir, silemez (kart 0078, kullanıcı kararı).
      "marka.gor",
      "marka.degistir",
      "etiket.gor",
      "etiket.degistir",
      // Fiyatı görür, değiştiremez (kart 0080, kullanıcı kararı).
      "fiyat.gor",
      // Stoğu görür ve elle düzeltir (kart 0082, kullanıcı kararı).
      "stok.gor",
      "stok.duzelt",
      // Ürün özelliğini görür, ekler ve değiştirir, silemez (kart 0086, kullanıcı kararı).
      "ozellik.gor",
      "ozellik.degistir",
      // Yorumları görür, onaylar ya da reddeder ve ana sayfa için işaretler (kart 0139, kullanıcı kararı).
      "yorum.gor",
      "yorum.onayla",
      // Ödeme yöntemlerini ve banka hesaplarını görür, değiştiremez (kart 0214, kullanıcı kararı).
      "odeme-yontemi.gor",
      // Siparişleri görür, hazırlamaya alır, kargoya verir, teslim işaretler ve not ekler; havaleyi onaylayamaz
      // (kart 0234, kullanıcı kararı).
      "siparis.gor",
      "siparis.yonet",
      // Sitedeki görselleri görür: kategori görselini ve marka logosunu seçer (kart 0261).
      "dosya.gor",
      // Kendi yedek kodlarını yeniler (kart 0274).
      "ekip.kendi-hesabi.degistir",
    ],
  },
  // Kart 0274 (karar 0157, 0178): siparişleri görür ve yönetir, havaleyi onaylar, müşterileri görür; iade yapamaz,
  // kataloğa ve içeriğe dokunmaz.
  "siparis-gorevlisi": {
    tamYetki: false,
    izinler: [
      "ekip.kendi-hesabi.gor",
      "ekip.kendi-hesabi.degistir",
      "siparis.gor",
      "siparis.yonet",
      "siparis.havale-onayla",
      "musteri.gor",
      "odeme-yontemi.gor",
      "dosya.gor",
    ],
  },
  // Kart 0274 (karar 0157, 0178): blog, sabit sayfalar, vitrin bölümleri ve menüler. Ürünleri yalnız görür: menüye ve
  // bölümlere kategori, marka ya da ürün arayarak bağlar (kayit-ara, urun.gor); değiştiremez.
  "icerik-editoru": {
    tamYetki: false,
    izinler: [
      "ekip.kendi-hesabi.gor",
      "ekip.kendi-hesabi.degistir",
      "icerik.gor",
      "icerik.degistir",
      "icerik.sil",
      "duzen.gor",
      "duzen.degistir",
      "menu.gor",
      "menu.degistir",
      "dosya.gor",
      "urun.gor",
    ],
  },
} as const satisfies Record<
  string,
  { tamYetki: boolean; izinler: readonly GirisIzni<"yonetici">[] }
>;
