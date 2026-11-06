# 0045 · İstek sınırı IPv6'da bağlantı ağına göre saysın

## Amaç

İstek sınırı istemciyi tam adresiyle sayıyor (`cekirdek/kapi/istek-siniri.ts`). IPv6'da bir bağlantının elinde milyarlarca adres vardır (/64), adres değiştiren biri sınırı aşar. Kart 0027'nin giriş deneme sınırı bu sayaca dayanacak.

## Olmazsa olmazlar

- IPv6 adresleri ilk 64 bitiyle sayılır, IPv4 adresleri tam adresle.
- Kodlanmış yol (`/kapi/.../sa%67lik` gibi) aynı uçla aynı sayaca düşer mi ölçülür, düşmüyorsa düzeltilir.

## Sınırlar

- Hesap başına deneme sınırı 0027'dir.

## Bitti sayılır

- Test aynı /64'ten farklı adreslerin aynı sayaca düştüğünü, farklı /64'lerin ayrıldığını gösteriyor.

## Durum

yapılacak
