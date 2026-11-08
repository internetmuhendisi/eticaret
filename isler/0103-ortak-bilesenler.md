# 0103 · Ortak bileşenler (shadcn/ui)

## Amaç

Vitrinin ve panelin bütün ekran parçaları tek ortak kütüphaneden gelir. Parçalar shadcn/ui'dan başlar ve sitenin tasarım değerleriyle giyinir.

Bölüm: Tasarım. Önce 0102 bitmiş olmalı.

## Olmazsa olmazlar

- shadcn/ui parçaları ortak bileşen kütüphanesine alınır: düğme, giriş alanı, seçim kutusu, onay kutusu, açılır menü, pencere, yan pencere, sekme, kart, rozet, uyarı, bildirim, ipucu, iskelet görünüm, yükleniyor göstergesi, kaydırmalı şerit, akordeon.
- Parçalar yalnız tasarım değerlerini kullanır. İçlerinde metin yoktur, metni kullanan sayfa verir.
- İkonlar tek setten ve tek ikon sözlüğünden gelir. Bir kavramın ikonu her yerde aynıdır.
- Klavye, odak ve ekran okuyucu kuralları her parçada sağlanır, yalnız ikonu olan düğmenin adı vardır.
- Mevcut form bileşenleri yeni parçalara taşınır, eski kopya kalmaz.
- Ham HTML öğesi denetimi (düğme, giriş alanı, seçim kutusu, pencere) açılır, kütüphane muaftır. Bozuk örneği eklenir.
- Karar kaydı yazılır (shadcn/ui'ın nasıl alındığı, güncellemesinin nasıl yapılacağı).

## Sınırlar

- Ürün kartı ve fiyat gösterimi bu kartta değil (0109).
- Liste motoru ve tablo bu kartta değil.
- Panel ve vitrin sayfası yazılmaz.

## Bitti sayılır

- Listelenen her parça kütüphanede, açık ve koyu temada çalışıyor.
- Her parça klavyeyle kullanılıyor, erişilebilirlik taraması temiz.
- Sayfada ham düğme yazan örnek denetimde kırmızı.
- Eski form bileşenlerinin bütün kullanımları yeni parçalarda, testler yeşil.

## Durum

yapılacak
