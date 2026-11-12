# 0138 · Ürün sayfası

## Amaç

Ürün kartından ve menüden gelinen ürün sayfası bugün yok. Müşteri ürünün görsellerini ve videosunu görmeli, beden ve renk seçmeli; seçtiği birleşimin fiyatını, stoğunu ve görselini görmeli, özellik tablosunu okumalı.

Bölüm: Vitrin. Önce 0134, 0135 ve 0120 bitmiş olmalı.

## Olmazsa olmazlar

- Galeri: ana görsel, küçük görseller, büyütme, telefonda kaydırma; video çerezsiz oynatıcıyla ve yalnız tıklanınca yüklenir (karar 0073). Görseller ürün görseli ucundan, boyuta göre gelir.
- Beden ve renk seçimi: seçenekler ürünün seçenek sırasıyla; tükenen birleşim görünür ama seçilemez ya da "Tükendi" yazar (taslakta kullanıcıya sorulur). Seçilen birleşim adreste durur.
- Seçim değişince fiyat, eski fiyat, stok yazısı ("Son 3 ürün"), stok kodu ve birleşimin görseli değişir. Hepsi çekirdeğin tek işlevlerinden gelir, sayfada hesaplanmaz.
- Özellik tablosu ürünün özelliklerinden, özellik sırasıyla gelir.
- Kısa ve uzun açıklama; uzun açıklama güvenli biçimde temizlenerek çizilir.
- Kargoya verme süresi "1 iş gününde kargoda" gibi ayardan gelir; vergi ek metni fiyat bileşeninden.
- İlgili ürünler ürün kartıyla (kart 0079'un kuralı).
- Gizli ürün yalnız bağlantıyla açılır; taslak, arşiv, silinmiş ve zamanı gelmemiş ürün bulunamadı sayfasına düşer.
- Sepete ekle düğmesi sepet işlevine bağlıdır, sepet yazılana kadar görünmez. Adet seçimi de onunla gelir.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Yorumlar ve puan kart 0139'da yazılır; bu kartta yalnız yeri ayrılır.
- Sepet, sepete ekleme ve adet kuralları Sepet bölümünün işidir.
- Ürünün yapılandırılmış verisi Görünürlük işidir.

## Bitti sayılır

- Her birleşimde fiyat, stok ve görsel doğru (gerçek veritabanıyla test); tükenen birleşim satılabilir görünmüyor.
- Görünmeyen ürün durumları testte.
- Tarayıcıda seçim klavyeyle yapılıyor, galeri klavyeyle geziliyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
