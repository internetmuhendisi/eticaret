// Müşteri ürünü satın aldı mı (kart 0139, karar 0109). "Yalnız satın alanlar yorum yapabilir" ayarı ve
// "Doğrulanmış alıcı" işareti yalnız bunu sorar. Sipariş modülü henüz yok: bugün hiçbir müşteri satın almış
// sayılmaz. Sipariş modülü bu işlevi teslim edilmiş (iade edilmemiş) siparişlerine bağlar; çağıranlar değişmez.
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";

export const satinAldiMi = async (
  _vt: Veritabani | VeritabaniIslemi,
  _musteri: string,
  _urun: string,
): Promise<boolean> => false;
