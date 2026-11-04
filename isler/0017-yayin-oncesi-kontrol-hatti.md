# 0017 · Yayın öncesi kontrol hattı

## Amaç

GitHub'a her gönderimde bütün kontroller kendiliğinden çalışır. Kırmızı bir kontrol yayını durdurur (`.claude/rules/kurallari-koruyan-kontroller.md`).

Önce 0016 bitmiş olmalı.

## Olmazsa olmazlar

- Her gönderimde sırayla: tür kontrolü, biçim ve denetim, testler (gerçek veritabanıyla veri ayrımı testi dahil), site klasörlerinin şema doğrulaması, dış paketlerin bilinen güvenlik açığı taraması, Docker görüntüsünün üretilmesi.
- Yayın komutu bu kontrollerin son sonucu yeşil değilse çalışmaz.

## Sınırlar

- Ekran ölçümü, hız ölçümü ve güvenlik başlıkları kontrolü sayfalar olunca eklenir.

## Bitti sayılır

- Temiz bir gönderimde hat yeşil bitiyor.
- Bilerek bozulmuş bir test içeren gönderimde hat kırmızıya düşüyor.
- Kontrol tablosunda kurulan kontroller işaretlendi.

## Durum

bitti
