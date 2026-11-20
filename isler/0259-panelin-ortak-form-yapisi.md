# 0259 · Panelin ortak form yapısı

## Amaç

Panelin formları bugün her ekranda biraz farklı davranıyor: hata bazen pencerenin üstünde, bazen alanın altında; odak hatalı alana her yerde gitmiyor (kartlar 0142, 0143, 0236'nın bulguları). Bu bölümde çok sayıda form gelecek; hepsi aynı yapıdan çıkmalı.

Bölüm: Yönetim paneli. Önce 0257 (taslak) bitmiş olmalı. Kart 0188 (alt çubuğun arkasında odak) bu kartla birlikte yapılır.

## Olmazsa olmazlar

- Tek form yapısı: sunucunun alan hatası alanın altında yazar ve alana bağlıdır; alanı formda olmayan hata özette yazar; gönderilince odak ilk hatalı alana gider, birden çok hata varsa özete.
- Kaydedilmemiş değişiklikte sayfadan ve pencereden çıkarken sorulur (panel menüsüyle geçiş dahil; kart 0142'de yalnız disiplin kaldı).
- Kayıt sürerken düğmeler kapalı, kayıttan sonra geç gelen yenileme yazılanı ezmez (kart 0223'ün kancası); kart 0227'nin durumu (yeni kaydın anahtarı değişince form baştan kurulması) bu yapıda olmaz.
- Panelin var olan formları (vitrin bölümleri, menüler, ödeme yöntemleri, kargo, sipariş ayarları, elle sipariş, iade) bu yapıya taşınır.

## Sınırlar

- Yeni form alanı türü eklenmez; var olan alan parçaları kullanılır.
- Vitrin formları bu kartın işi değil.

## Bitti sayılır

- Var olan panel formları yeni yapıda; her birinde alan hatası, özet ve odak tarayıcı testinde ölçülüyor.
- Kart 0188'in odak gizlenmesi ölçülüp düzeldi.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
