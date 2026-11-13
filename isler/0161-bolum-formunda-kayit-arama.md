# 0161 · Bölüm formunda kayıtları arayarak seçmek

## Amaç

Kart 0142'de bölüm formunun kategori, marka, etiket, ürün ve menü seçenekleri ada göre sıralı listelerdir. Her liste en çok 500 kayıt taşır (`panelSecenekSinirlari`, karar 0115). Daha çok ürünü olan mağazada sonraki ürünler formda seçilemez, uzun liste de seçim kutusunda zor gezilir.

Kart 0143 (menüler ekranı) kayıt arayarak seçen parçayı yazacak. Bu iş o parçayı bölüm formuna bağlar. Önce 0143 bitmiş olmalı.

## Olmazsa olmazlar

- Ürün (elle seçilen ürünler) ve gerektiğinde kategori, marka, etiket alanları yazdıkça arayan seçimle çalışır. Arama sunucuda, sayfa sayfa yapılır.
- Seçili kaydın adı formda görünür, liste sınırı seçimi engellemez.
- Silinmiş kayıt seçenek olarak gelmez. Seçimden sonra silinen kayıt yine kayıtta reddedilir (`baglariDenetle`).

## Sınırlar

- Görsel seçimi bu işe girmez.

## Bitti sayılır

- 500'den çok ürünü olan deneme sitesinde 501. ürün formdan aranıp seçiliyor (gerçek veritabanıyla).
- Seçim klavyeyle yapılabiliyor ve taramadan geçiyor.

## Durum

yapılacak
