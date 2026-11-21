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
    ],
  },
} as const satisfies Record<
  string,
  { tamYetki: boolean; izinler: readonly GirisIzni<"yonetici">[] }
>;
