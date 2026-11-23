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

## Notlar

- Kart 0293 (2026-11-23): aynı belirti vitrinde de görüldü. Hat 45045593092'de `iade-talebi.test.ts` takip sayfasında siparişi iptal ettikten sonraki taramada `document-title` buldu. İzin ağ zamanlarına göre iptal isteği 441,88. saniyede gitti, yenileme (`router.refresh`, `cekirdek/vitrin/siparis/siparis-iptali.tsx`) 442,02'de başlayıp 132 ms'de bitti; tarama 442,43'te, yani yenileme bittikten sonra başladı ve başlık yine yoktu. Panelde ölçülenle aynı: başlık yenileme yanıtından sonra yok kalıyor.
- Yerelde geliştirme sunucusunda, normal ve 4 kat yavaş işlemciyle, `<title>`'ı izleyen bir `MutationObserver` ile iki kez ölçüldü: başlık hiç kaybolmadı. Hatta görülüp yerelde üretilemiyor.
- Kart 0293'te iade talebi testinin taraması başlığın dolmasını bekler (ürün seçenekleri testindeki gibi). Başlığın neden kaybolduğu ve canlı derlemede de olup olmadığı bu kartın ölçümüdür; tarama beklemeleri kart 0288 ile tek yere toplanır.

## Durum

yapılacak
