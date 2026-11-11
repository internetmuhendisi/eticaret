# 0143 · Panelin menüler ekranı

## Amaç

Mağaza sahibi ana menüyü ve alt bilgi bağlantılarını panelden düzenler. Menü servisi var (kart 0107), uçları ve ekranı yok.

Bölüm: Vitrin. Önce 0141 ve 0142 bitmiş olmalı.

## Olmazsa olmazlar

- Menü uçları: menüleri ve öğeleri okuma, ekleme, değiştirme, taşıma, sıralama, silme; izinler `menu.gor` ve `menu.degistir`, uç belgesi ve erişim testi.
- Öğe hedefi kategori, marka, ürün, sitenin kendi adresi, dış adres ya da başlık olarak seçilir; kayıt arayarak seçilir.
- Derinlik sınırı (2) ekranda da tutar; sınırı aşan taşıma seçeneği sunulmaz.
- Hedefi silinmiş ya da görünmeyen öğe ekranda işaretli görünür (servisin bilgisi).
- Kategori menüsü ağaçtan gelir, öğe eklenemez; ekranda bu açıklanır.
- Sıralama ve taşıma sürükleyerek ve klavyeyle yapılır.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Menü kuralları (derinlik, hedef türleri, sınırlar) değişmez.

## Bitti sayılır

- Mağaza sahibi tarayıcıda öğe ekliyor, taşıyor, sıralıyor, siliyor; değişiklik vitrinin menüsünde görünüyor (tarayıcı testi).
- Görevli ve yetkisiz yönetici uçlarda reddediliyor (erişim testi).
- Ekran klavyeyle kullanılıyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
