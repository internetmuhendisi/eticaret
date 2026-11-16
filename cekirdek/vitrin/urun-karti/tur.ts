// Ürün kartının verisi (kart 0109, karar 0085). Kartı çizen her yer (bölüm, liste, arama, öneriler) veriyi
// yalnız urunKartlari'ndan (veri.ts) alır; katalog örnekle doldurur.
//
// Bu dosya yalnız türdür ve sunucu kodu almaz: kartın görünüşü tarayıcıda da çalışır.
import type { FiyatAraligi } from "../../moduller/fiyat/gosterim.ts";

// Görselin adresleri, boyutun genişliğiyle (srcset). Genişlik ve yükseklik orta boyutundandır: tarayıcı
// görsel gelmeden yerini ayırır.
export type UrunKartiGorseli = {
  alternatifMetin: string;
  kaynaklar: readonly { adres: string; genislik: number }[];
  genislik: number;
  yukseklik: number;
};

export type UrunKartiVerisi = {
  kimlik: string;
  ad: string;
  // Ürün sayfasının adresi.
  adres: string;
  marka?: string;
  // Görseli olmayan üründe yoktur; kart yer tutucu gösterir.
  gorsel?: UrunKartiGorseli;
  // Fiyatı olmayan üründe yoktur (satın alınamaz); kart fiyat göstermez.
  fiyat?: FiyatAraligi;
  // Ürünün genel stok durumu (urunStokDurumu): satılabilir birimi kalmadı.
  tukendi: boolean;
  // Basit ürünün tek birimi, satılabilir ve fiyatlıysa: kartın sepet düğmesi onu bir adet ekler (kart 0212). Seçenekli
  // üründe yoktur, düğme ürün sayfasını açar (karar 0132).
  sepetBirimi?: string;
  // Yayındaki yorumların ortalaması ve sayısı (kart 0139); yorumu olmayan üründe yoktur.
  puan?: { ortalama: number; sayi: number };
};
