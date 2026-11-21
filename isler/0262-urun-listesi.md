# 0262 · Ürün listesi

## Amaç

Mağaza sahibi ürünlerini panelde göremiyor; ürün servisi var (kart 0076), ekranı yok. Ürün yönetiminin girişi ürün listesidir.

Bölüm: Yönetim paneli. Önce 0258 (liste) bitmiş olmalı.

## Olmazsa olmazlar

- Ortak liste parçasıyla: ad ve stok koduyla arama (aramanın harf kuralı, kart 0137), yayın durumu, kategori, marka ve stok durumu süzgeci, sıralama.
- Satırda ana görsel, ad, durum, fiyat ya da fiyat aralığı, stok durumu (vitrinle aynı kurallardan, kartlar 0083, 0155).
- Taslakta kararlaştırılan toplu işlemler (0257), sunucuda tek tek yetkiyle.
- Ürün ekleme ve ürün ekranına geçiş; "vitrinde gör" bağlantısı.
- Ürün listesi ucu izniyle (`urun.gor`), uç belgesi ve rol erişim testi.

## Sınırlar

- Ürün ekranının kendisi 0263–0266'dadır.
- Excel ve on beşinci bölümün toplu işlemleri yoktur.

## Bitti sayılır

- Gerçek veritabanıyla arama, süzgeç, sıralama, fiyat ve stok durumunun vitrinle aynı olması; tarayıcıda klavyeyle, iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

bitti
