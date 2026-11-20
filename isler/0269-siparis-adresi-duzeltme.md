# 0269 · Siparişin adresini düzeltme

## Amaç

Panelden sipariş sonradan düzeltilemiyor (karar 0148). Müşteri yanlış adres yazınca mağaza sahibi kargodan önce düzeltebilmeli.

Bölüm: Yönetim paneli. Önce 0268 bitmiş olmalı.

## Olmazsa olmazlar

- Teslimat ve fatura adresinin, taslakta kararlaştırılan durumlara kadar düzeltilmesi; görülen durum değiştiyse çakışma.
- Adres ortak adres şemasıyla doğrulanır (il ve ilçe tutarlı, telefon biçimi).
- Vergi, adresin bölgesine bağlıysa (`vergiAdresi` ayarı) siparişin tutarı değişmez; değişecekse düzeltme reddedilir ve nedeni söylenir.
- Eski ve yeni adres sipariş geçmişine ve değişiklik kaydına girer; müşteriye bildirim karara göre.
- Kişisel bilgisi silinmiş siparişte düzeltme yoktur.

## Sınırlar

- Ürün ve adet düzeltme taslakta karar verilirse ayrı karta yazılır.

## Bitti sayılır

- Gerçek veritabanıyla izinli ve izinsiz durum, çakışma, bölge değişikliği, kayıt; tarayıcıda klavyeyle, iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
