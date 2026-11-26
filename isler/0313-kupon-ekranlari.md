# 0313 · Panelin kupon ekranları

## Amaç

Mağaza sahibi kuponlarını panelden açar, değiştirir, kapatır ve kullanımlarını görür. Temel paketin Yönetim paneli satırında kupon yönetimi var.

Bölüm: Yönetim paneli 2. Önce 0312 bitmiş olmalı.

## Olmazsa olmazlar

- Ortak liste ekranıyla (kart 0258) kupon listesi: durum sekmeleri (etkin, zamanlanmış, süresi dolmuş, kapalı), arama, kullanım sayısı, sıralama.
- Ortak form yapısıyla (kart 0259) kupon formu: kod (benzersiz, harf kuralı site ayarıyla), tür ve değer, başlangıç ve bitiş (sitenin saat dilimiyle), toplam ve kişi başı sınır, en az sepet tutarı, ürün ve kategori seçimi (kayıt arama), indirimli ürünlerde geçmeme.
- Kullanılmış kuponun değerinin değiştirilmesi kart 0311'in kararına göre (kapatılabilir, verilen siparişleri değiştirmez).
- Kuponun kullanımları: sipariş numarasıyla liste, siparişe bağlantı.
- İzinler: kupon görme ve değiştirme ayrı izin; değişiklik kaydına girer.

## Sınırlar

- Kupon raporu kart 0318'dedir.

## Bitti sayılır

- Gerçek istekle ekleme, değiştirme, kapatma, alanın yoluyla hata; görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçinin reddi; uçlar erişim testinde beklentiden.
- Tarayıcıda menüden klavyeyle gelme, boş kodda alanın hatası ve odak, kupon açma ve vitrinde kullanılması; ekranların iki renkte ve üç genişlikte taraması, yana kayma ve konsol.
- Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

bitti
