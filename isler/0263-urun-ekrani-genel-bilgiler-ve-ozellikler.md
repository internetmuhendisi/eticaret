# 0263 · Ürün ekranı: genel bilgiler ve özellikler

## Amaç

Mağaza sahibi ürün ekleyip düzenleyebilmeli. Ürün, kategori, marka, etiket, özellik ve ilgili ürün servisleri var (kartlar 0076–0079, 0086), ekranı yok.

Bölüm: Yönetim paneli. Önce 0259 (form), 0261 (kategori ve özellik ekranları) ve 0262 (liste) bitmiş olmalı.

Not (kart 0262, kullanıcı kararı): ürün listesinde "Ürün ekle" düğmesi ve satırdan ürün ekranına geçiş bu kartla eklenir; ürün ekranı yokken bağlantı verilmedi.

## Olmazsa olmazlar

- Ad, adres adı (değişince eski adres yönlenir, kart 0135), açıklama (biçimli metin; vitrindeki temizlik kuralıyla aynı izinli etiketler, kart 0138), kısa açıklama, barkod, stok kodu, ağırlık, kargo gerekir mi, vergi sınıfı, alım adedi sınırları.
- Yayın durumu ve zamanlanmış yayın (sitenin saat dilimiyle, yaz saati kuralı kart 0076).
- Kategori, marka, etiket seçimi kayıt arayarak; ilgili ürünler (en çok 4, kendisi seçilemez).
- Özellik değerleri dört türde, türüne uymayan değer alanın hatasıyla.
- Ürünü silme (işaretle) ve onay.
- Uçlar izinleriyle, uç belgesi ve rol erişim testi.

## Sınırlar

- Varyant, fiyat, stok ve galeri kendi kartlarındadır (0264–0266).

## Bitti sayılır

- Gerçek istekle ekleme, değiştirme, ret ve silme; tarayıcıda klavyeyle yeni ürün açılıp vitrinde görülür; iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

bitti
