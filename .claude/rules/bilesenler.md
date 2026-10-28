---
paths:
  - "bilesenler/**"
  - "cekirdek/vitrin/**"
  - "cekirdek/yonetim-paneli/**"
  - "cekirdek/uygulama/app/**"
  - "sahip-paneli/**"
  - "siteler/*/vitrin/**"
  - "**/*.tsx"
---

# Bileşen kütüphanesi

Bileşen, düğme, giriş alanı, pencere gibi tekrar kullanılan arayüz parçasıdır.

- Düğme, giriş alanı, seçim kutusu, pencere, kart, sekme, tablo, rozet, bildirim gibi bütün arayüz parçalarını tek ortak kütüphaneden kullan.
- Yeni bir parça yazmadan önce kütüphanede karşılığını ara. Yoksa ve birden çok yerde kullanılacaksa önce kütüphaneye ekle, sonra kullan.
- Sayfalarda tarayıcının ham düğme, giriş alanı, seçim kutusu ve pencere öğelerini kullanma. Kütüphanenin kendisi bu kuraldan muaftır.
- Sayfa ve bölüm başlıklarını başlık bileşenleriyle yaz.
- Kenarlıklı, köşeli kutuyu elle örme, kart bileşenini kullan.
- Yükleniyor göstergesi, iskelet görünüm ve ilerleme çubuğunu kütüphaneden al.
- "Kaydedildi", "Hata oluştu" gibi anlık bildirimleri tek bildirim bileşeninden göster.
- Sayfa içi bilgi, uyarı ve hata kutularını tek uyarı bileşeninden göster.
- Silme ve iptal gibi geri dönüşsüz eylemleri tek onay bileşeniyle sor. Mümkünse geri alma sun.
- Yalnız ikonu olan düğmeye ekran okuyucu için ad ver. Üzerine gelince ipucu kendiliğinden çıksın.
- Kütüphane bileşeninin içine metin yazma. Gösterilecek metni kullanıldığı sayfadan al.
- Bileşenin içine onu kullananın değiştiremeyeceği sabit genişlik ya da stil gömme.
- Bir kalıp ikinci bir yerde gerektiği anda onu kütüphaneye taşı ve ilk kullanımı da ona çevir.
- Her bileşenin canlı örneğini, seçeneklerini ve kullanıldığı yerleri bileşen kataloğunda göster.
- Bir bileşeni değiştirdiğinde onu kullanan sayfaları listele ve bileşenin her site temasındaki görüntüsünü bir önceki sürümle karşılaştır.
- Yeni bir bileşen kuralını önce uyarı olarak başlat. Eski ihlalleri ihlal listesinde tut, liste sıfırlanınca kuralı hataya çek. İhlal listesi yalnız küçülebilir.
