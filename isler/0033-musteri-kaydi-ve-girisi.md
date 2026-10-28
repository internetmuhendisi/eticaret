# 0033 · Müşteri kaydı ve girişi

## Amaç

Müşteri vitrinde hesap açar, giriş yapar ve çıkar (temel paket: Müşteri hesabı).

Önce 0025, 0026 ve 0032 bitmiş olmalı.

## Olmazsa olmazlar

- Vitrinde kayıt ve giriş sayfaları. Metinler metin dosyasında.
- Kayıtta zorunlu sözleşme ve KVKK aydınlatma onayı, işaretsiz pazarlama izni kutusu. Verilen izin kaydedilir (`.claude/rules/guvenlik.md`).
- Robot koruması. Hizmetin verisi Avrupa Birliği'nde durur, seçim karar kaydına yazılır.
- Giriş deneme sınırı.
- Kayıttan sonra hoş geldin e-postası.
- Kayıtta e-posta doğrulamasının istenip istenmeyeceği site ayarı olarak önerilir. Varsayılan ve Örnek Mağaza için önerilen değer kullanıcıya söylenir, `planlar/site-ayarlari.md` dosyasına yazılır.

## Sınırlar

- Hesabım sayfaları (siparişlerim, adreslerim, favorilerim) bu işe girmez.
- Ödeme sırasında hesap açma sepet ve ödemeyle gelir.
- Vitrin tasarımı yapılmaz, sayfalar ortak form parçalarıyla sade kurulur.

## Bitti sayılır

- Tarayıcı testi kayıt, çıkış ve yeniden girişi baştan sona deniyor.
- Hoş geldin e-postası deneme sitesinde ulaşıyor.
- Pazarlama izni kutusu işaretsiz geliyor, verilen izin kaydediliyor.
- Robot koruması ve deneme sınırı testle gösteriliyor.
- Sayfalar telefonda, tablette ve bilgisayarda kullanılabiliyor, klavyeyle doldurulabiliyor.

## Durum

yapılacak
