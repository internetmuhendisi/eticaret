# 0142 · Panelin vitrin bölümleri ekranı

## Amaç

Mağaza sahibi üst kısmın, ana sayfanın ve alt kısmın bölümlerini panelden ekler, sıralar, gizler ve düzenler. Düzen servisi ve tariften çıkan bölüm formu var (kart 0106), uçları ve ekranı yok. Mağaza sahibi en çok kayan afişi değiştireceği için ana menüde onu doğrudan açan bir kısayol olur (kullanıcı isteği).

Bölüm: Vitrin. Önce 0141, 0122, 0125 ve 0123 bitmiş olmalı.

## Olmazsa olmazlar

- Düzen uçları: okuma, bölüm ekleme, değiştirme, gizleme, silme, sıralama; izinler `duzen.gor` ve `duzen.degistir`, uç belgesi ve erişim testi.
- Ekran üç alanı (üst kısım, ana sayfa, alt kısım) gösterir. Bölüm eklerken yalnız o alana konabilen türler listelenir.
- Sıralama sürükleyerek ve klavyeyle yapılır.
- Bölüm formu tariften çıkar (`bolum-formu`); görsel, kategori, ürün ve menü seçimi alanları gerçek kayıtlarla çalışır.
- Çizilmeyen bölümün nedeni ekranda yazar (`cizilmemeNedeniMetni`).
- Her değişiklik bir sürümdür. Değişiklik doğrudan yayınlanır, önceki sürüme tek adımda dönülür (karar 0080).
- Ana menüde "Slider" kısayolu ana sayfadaki kayan afişin formunu açar. Panelde bu bölümün adı her yerde "Slider"dır (kullanıcı kararı, 2026-11-11). Ad terim sözlüğünden gelir. Kısayolun davranışı (karar 0101):
  - Ana sayfada slider yoksa yeni slider formu açılır; kaydedilince slider ana sayfanın en üstüne eklenir.
  - Birden çok slider varsa sıradaki ilki açılır; formun üstünde kaç slider olduğu ve ötekilerin bölümler ekranından düzenlendiği yazar.
  - Açılan slider gizliyse formun üstünde bu yazar ve görünür yapma düğmesi durur.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Tema seçme ve tema ayarları ekranı bu kartta yazılmaz.
- Bölüm türleri ve görünümleri değişmez.

## Bitti sayılır

- Mağaza sahibi tarayıcıda bölüm ekliyor, sıralıyor, gizliyor, düzenliyor ve geri dönüyor; değişiklik vitrinde görünüyor (tarayıcı testi).
- Kısayol üç durumda da (slider yok, birden çok, gizli) karardaki gibi davranıyor (tarayıcı testi).
- Görevli ve yetkisiz yönetici uçlarda reddediliyor (erişim testi).
- Ekran klavyeyle kullanılıyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
