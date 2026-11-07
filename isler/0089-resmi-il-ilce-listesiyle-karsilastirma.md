# 0089 · İl ve ilçe listesini resmî listeyle karşılaştırma

## Amaç

Kart 0070'teki il ve ilçe listesi resmî değil: il kodları ISO 3166-2:TR'den, ilçeler açık bir derlemeden ve Vikipedi'den alındı (karar 0056, `cekirdek/bolgeler/README.md`). Gerçek mağaza açılmadan önce liste İçişleri Bakanlığı'nın resmî listesiyle karşılaştırılmalı.

Resmî liste e-icisleri.gov.tr'den (Mülki İdare Bölümleri) indirilir. Site yurt dışından açılmadığı için listeyi kullanıcı Türkiye'deki bilgisayarından indirip verir.

## Olmazsa olmazlar

- Resmî listedeki her il ve ilçe bizim listemizde, bizim listemizdeki her il ve ilçe resmî listede. Farklar tek tek kullanıcıya gösterilir.
- Adların yazılışı resmî listeyle aynı olur.
- Resmî listede ilçe kodu varsa projenin ilçe kodlarıyla nasıl eşleşeceği karar kaydına yazılır. Kayıtlarda tutulan ilçe kodu değişmez.
- Liste resmî listeden yeniden üretilir. Üreten betik projeye girer ve testi olur.
- Veri dosyalarındaki ve belgedeki "resmî değil" notu, karşılaştırmanın sonucuna göre güncellenir. Kaynak ve indirme tarihi yazılır.

## Sınırlar

- Mahalle, köy ve sokak listesi bu karta girmez.

## Bitti sayılır

- Karşılaştırmanın sonucu kartın kapanışında yazılı: eklenen, çıkarılan ve yazılışı değişen her il ve ilçe.
- `cekirdek/bolgeler/` dosyaları resmî listeden üretiliyor, `kaynak.resmi` doğru değeri taşıyor.
- Testler yeni sayılarla geçiyor.

## Durum

yapılacak
