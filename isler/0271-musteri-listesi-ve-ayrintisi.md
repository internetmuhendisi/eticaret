# 0271 · Müşteri listesi ve ayrıntısı

## Amaç

Mağaza sahibi müşterilerini panelde göremiyor. Müşteri hesabı, adres defteri ve siparişler var (kartlar 0033, 0237, 0238), panel ekranı yok.

Bölüm: Yönetim paneli. Önce 0258 ve 0259 bitmiş olmalı.

## Olmazsa olmazlar

- Müşteri listesi: ad ve e-postayla arama, kayıt tarihi ve kampanya izni süzgeci, sipariş sayısı ve toplamı.
- Müşteri ayrıntısı: hesap bilgileri, siparişleri (sipariş ayrıntısına bağlantı), adresleri, mağazanın müşteri hakkındaki notları (yazan ve zamanla; müşteriye görünmez); taslakta karar verilen işler (hesabı kapatma, şifre sıfırlama bağlantısı).
- Kişisel veri: liste ve ayrıntı izinle; değişiklik kaydına not metni ve kişisel bilgi girmez; müşteri silinince notları da silinir.
- Üye olmadan sipariş verenler listede yer almaz (karar 0150 ile aynı ayrım), taslakta başka karar verilmezse.
- Uçlar izinleriyle (yeni izinler kayda ve belgeye), rol erişim testi.

## Sınırlar

- Müşteriye toplu e-posta ve kampanya yoktur.

## Bitti sayılır

- Gerçek veritabanıyla arama, sipariş toplamı, notun müşteriye gitmemesi, iki sitenin ayrı kalması; tarayıcıda klavyeyle, iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

bitti
