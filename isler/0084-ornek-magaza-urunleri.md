# 0084 · Örnek Mağaza'nın örnek ürünleri

## Amaç

Örnek Mağaza, Katalog 1'in her parçasını kullanan basit ürünlerle açılır. Sonraki bölümler (vitrin, sepet, sipariş) bu ürünlerle denenir (karar 0007).

Önce 0069–0083 bitmiş olmalı.

## Olmazsa olmazlar

- Ürünler site klasörünün `baslangic/` altında veri olarak durur, kurulumda bir kez yüklenir. Yükleme servisleri kullanır, veritabanına doğrudan yazmaz.
- Kategoriler `planlar/site-ayarlari.md`'deki gibidir: Giyim, Ev ve Yaşam, Elektronik Aksesuar. Ürünler %20 KDV sınıfıyla girilir.
- Hepsi basit üründür. En az şu durumlar bulunur: indirimli ürün (tarihli), stok takibi kapalı ürün, tükenmiş ürün, düşük stoklu ürün, kargo gerektirmeyen ürün, taslak, zamanlanmış ve gizli ürün, en az ve en çok alım adedi olan ürün, birden çok kategoride olan ürün, markası ve etiketleri olan ürün, elle seçilmiş ilgili ürünü olan ürün.
- Hangi ürünün hangi durumu denemek için olduğu sitenin `KURALLAR.md` dosyasında bir tabloyla yazılır.
- Gerçek marka adı ve gerçek ürün kullanılmaz.

## Sınırlar

- Varyantlı ürünler (beden ve renk seçenekli tişört ve sweatshirt), özellik değerleri ve görseller Katalog 2'de eklenir (0085, 0086, 0087).
- Vitrin sayfaları yazılmaz.
- Örnek ürünler yalnız Örnek Mağaza'nın klasöründedir, çekirdeğe girmez.
- Sunucudaki Örnek Mağaza'ya yükleme kullanıcının onayıyla yapılır.

## Bitti sayılır

- Boş veritabanında kurulum ürünleri yüklüyor, ikinci çalıştırma bir şey değiştirmiyor.
- Tablodaki her durum bir testle gerçekten o durumda görünüyor (örneğin tükenmiş ürün satılamaz, taslak ürün vitrinde görünmez).
- `pnpm site-dogrula` başlangıç verisini geçiriyor, bozuk bir örnek kırmızıya düşüyor.
- Çekirdekte Örnek Mağaza'nın ürün adları geçmiyor (`cekirdek/testler/site-adi-yok.test.ts` kapsamı).

## Durum

yapılacak
