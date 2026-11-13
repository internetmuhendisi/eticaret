# 0173 · Telefonda adresle seçili gelen birleşimin görseli ilk anda görünsün

## Amaç

Müşteri gezisinde (2026-11-13) ölçüldü: telefonda `?secenek-renk=beyaz` adresiyle açılan ürün sayfasında seçim Beyaz görünürken galeri ilk 0,5–1 saniye siyah tişörtü gösteriyor, sonra beyaza geçiyor (geliştirme sunucusunda üç ölçümün ikisinde). Bilgisayarda ve tablette görüntü baştan doğru.

## Olmazsa olmazlar

- Telefonun kaydırmalı galerisi sunucudan gelen HTML'de seçili birleşimin görseliyle açılır; sayfanın kodu yüklenmeden de doğru görsel görünür.
- Tarayıcı testi: JavaScript yüklenmeden (ya da bekletilerek) telefonda görünen ilk görsel seçili birleşiminki; eski hâlde kırmızı.

## Sınırlar

- Galerinin sırası ve bilgisayardaki görünüşü değişmez.

## Bitti sayılır

- Telefonda ilk karede seçili birleşimin görseli görünüyor (tarayıcı testi).
- Önce ve sonra ekran görüntüsü karşılaştırıldı.

## Notlar (2026-11-14)

- Önce ve sonra ölçümü (taze Örnek Mağaza, Basic Tişört, `?secenek-beden=m&secenek-renk=beyaz`, sayfanın kodu engellenerek): önce telefonda ve bilgisayarda şerit 0'da, görünen "Siyah tişört, önden"; sonra telefonda 358, bilgisayarda 520 px kaydırılmış, görünen "Beyaz tişört, önden". Kod yüklüyken ısınmış sunucuda önce de doğru görsel görünüyordu (kod görselden önce bağlanıyor); sorun yavaş bağlantıda ve soğuk açılışta çıkar.
- Sayfa akışla geldiği için şerit önce gizli kapta çizilir; ilk tek seferlik betik bu yüzden çalışmadı (ölçüldü), betik genişlik oluşana kadar yeniden dener. Karar 0122.
- Bilgisayarda da aynı betik çalışır (kart yalnız telefonu istiyordu; bilgisayarda kod engellenince de doğru görsel görünür).

## Durum

yapılacak
