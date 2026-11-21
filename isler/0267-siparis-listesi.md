# 0267 · Tam sipariş listesi

## Amaç

Sipariş listesinin bugünkü hâli en azdır: durum sekmeleri, numara ve müşteri araması, sayfalama (kart 0234). Tarih aralığı, ödeme yöntemi süzgeci ve toplu işlem bu bölüme bırakıldı (taslak, karar 0145).

Bölüm: Yönetim paneli. Önce 0258 (ortak liste) bitmiş olmalı.

Kart 0258'de yazılanlar (liste motorunun canlı örneği olarak): liste motoruna taşınma, ödeme yöntemi süzgeci, dört sıralama (en yeni, en eski, tutar) ve "Hazırlamaya al" toplu işlemi, testleriyle. Bu kartta kalanlar: tarih aralığı, "bakılması gereken" süzgeci, fiş yazdırma (0270 ile).

## Olmazsa olmazlar

- Ortak liste parçasıyla: durum, tarih aralığı (sitenin saat dilimiyle), ödeme yöntemi ve "bakılması gereken" (havale bildirildi, iade talebi, bekleyen iade) süzgeçleri; sıralama.
- Taslakta kararlaştırılan toplu işlemler (0257), her sipariş için geçiş kuralı ve görülen durum sunucuda denetlenir; işlenemeyen siparişlerin nedeni.
- Uç izinleriyle, rol erişim testi.

## Sınırlar

- CSV ve Excel on beşinci bölümdedir.

## Bitti sayılır

- Gerçek veritabanıyla süzgeçler, tarih sınırı (gece yarısı, saat dilimi), toplu işlemde geçişi olmayan siparişin atlanması; tarayıcıda klavyeyle, iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
