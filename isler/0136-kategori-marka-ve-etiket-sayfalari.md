# 0136 · Kategori, marka ve etiket sayfaları: filtre ve sıralama

## Amaç

Menüdeki kategori, marka ve etiket bağlantıları bugün boş sayfaya düşüyor. Müşteri bir kategorinin ürünlerini görmeli, fiyat, marka, özellik ve stoğa göre süzebilmeli ve sıralayabilmeli.

Bölüm: Vitrin. Önce 0134, 0135, 0120 ve 0127 bitmiş olmalı.

## Olmazsa olmazlar

- Kategori sayfası alt kategorilerin ürünlerini de gösterir (kategori servisinin alt ağaç seçeneği). Marka ve etiket sayfası aynı liste parçasını kullanır.
- Ürünler yalnız ürün kartıyla ve vitrinde görünen ürünlerden gelir. Tükenen ürün ayarı (`tukenenUrun`) uygulanır.
- Filtreler: fiyat aralığı, marka, filtrede kullanılan ürün özellikleri, stoktakiler. Hangi filtrelerin görüneceği taslakta kullanıcıya sorulur (kart 0134).
- Fiyat aralığı sitenin para biçimiyle yazılır ve okunur: "1.000", "1.000,50", "1000" aynı tutardır. Okuma ortak biçimleyiciden geçer, sayfada ayrıca yazılmaz.
- Sıralama seçenekleri: önerilen (mağaza sahibinin elle sırası), en yeni, fiyat artan ve azalan. Varsayılan sıralama site ayarı olarak önerilir (Örnek Mağaza'da "önerilen").
- Filtre ve sıralama adreste durur: sayfa yenilenince ve paylaşılınca aynı sonuç gelir. Filtreli sayfalar arama motorlarında dizine girmez.
- Telefonda filtre yan pencerede açılır, sonuç sayısı görünür.
- Sorgu sayısı ürün sayısıyla artmaz.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- "Çok satanlar" ve "en çok puan alan" sıralaması sipariş ve yorum gelince eklenir.
- Panelde ürünlerin elle sıralanma ekranı bu kartta yazılmaz; sıra servisten okunur.

## Bitti sayılır

- Her filtre ve sıralama gerçek veritabanıyla testte; görünmeyen ürün hiçbir filtrede gelmiyor.
- "1.000" ve "1000" aynı sonucu veriyor, bozuk tutar anlaşılır hatayla reddediliyor (test).
- Tarayıcıda filtre klavyeyle kullanılıyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
