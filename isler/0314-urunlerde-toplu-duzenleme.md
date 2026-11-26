# 0314 · Ürünlerde toplu düzenleme

## Amaç

Temel paketin Yönetim paneli satırındaki toplu düzenleme (durum, kategori, fiyat ve indirimli fiyatı oranla ya da tutarla değiştirme, stok) bugün yalnız durum işlemleriyle var (kart 0262). Mağaza sahibi seçtiği ürünlerin fiyatını ve stoğunu tek tek açmadan değiştirebilmeli.

Bölüm: Yönetim paneli 2. Önce 0311 bitmiş olmalı.

## Olmazsa olmazlar

- Ürün listesinin toplu işlem çubuğuna (kart 0258, 0262): kategori ekleme ve çıkarma, fiyat ve indirimli fiyatı oranla ya da tutarla artırma ve azaltma (indirim zamanıyla), stoğu belirli miktara çekme ya da artırma.
- Varyantlı üründe işlem her birleşime uygulanır; yuvarlama sitenin para biçimiyle, kuralı karar kaydında.
- Önizleme: kaç ürün ve birleşim değişecek, örnek satırlar; uygulamadan önce onay.
- Her ürün kendi işleminde ve fiyat servisinin kurallarıyla (indirimli fiyat satış fiyatından küçük, sıfırın altı yok) işlenir; işlenemeyen nedeniyle döner. Fiyat ve stok geçmişine ve değişiklik kaydına yazanıyla girer.
- Fiyat ve stok izni ayrı denetlenir (kart 0265'in kuralı).

## Sınırlar

- Excel ile toplu işlem kart 0315'tedir.

## Bitti sayılır

- Gerçek veritabanıyla oran ve tutar, artırma ve azaltma, yuvarlama, varyantlı ürün, kurala aykırı sonucun nedeni, geçmiş ve kayıt, izin, iki site.
- Tarayıcıda klavyeyle seçim, işlem, önizleme ve sonucun odağı; iki renkte ve üç genişlikte tarama.
- Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

bitti
