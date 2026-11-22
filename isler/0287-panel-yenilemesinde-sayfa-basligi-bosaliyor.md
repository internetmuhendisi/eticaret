# 0287 · Panelde yenileme sırasında sayfa başlığı bir an boşalıyor

## Amaç

Hattın 44956487389 numaralı çalışmasında (kart 0264) ürün seçenekleri tarayıcı testi erişilebilirlik taramasında "document-title" hatası verdi. İzde şu görüldü: ürün ekranında tekrarlı değerle Kaydet 409 (çakışma) aldı, panel sayfayı sunucudan yeniledi (`router.refresh`, `cekirdek/yonetim-paneli/panel-islemi.ts`). Yenileme yanıtı geldikten sonra sayfanın `<title>` öğesi yaklaşık 1,3 saniye yoktu, tarama da bu araya denk geldi.

Test, yenilemenin bitmesini ve başlığın dolu olmasını bekleyecek biçimde düzeltildi (hat düzeltmesi, 2026-11-22). Başlığın boşalmasının kendisi ölçülmedi. Bu boşalma yalnız geliştirme sunucusunda mı oluyor, canlı derlemede (`next start`) de oluyor mu, bilinmiyor. Yerelde 4 denemede üretilemedi.

## Olmazsa olmazlar

- Önce ölçülür: panelde bir işlemden sonraki yenilemede, canlı derlemede ve geliştirme sunucusunda, `<title>` öğesinin kaybolup kaybolmadığı ve ne kadar süre yok kaldığı (örneğin `MutationObserver` ile) ölçülür.
- Canlı derlemede de boşalıyorsa sebebi bulunur ve düzeltilir. Sebep Next.js ya da React'taysa karar kaydıyla yazılır.
- Yalnız geliştirme sunucusunda boşalıyorsa bu not edilir, tarama yardımcısının beklemesi (kart 0288) yeterli sayılır.

## Sınırlar

- Panelin çakışmadan sonra sayfayı yenilemesi değiştirilmez: o davranış bilerek yazılmıştır (kart 0143).

## Bitti sayılır

- İki derlemede de ölçüm yapıldı, sonuç kartın notlarına yazıldı.
- Düzeltme gerektiyse düzeltme geri alınınca kırmızıya düşen bir test var.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
