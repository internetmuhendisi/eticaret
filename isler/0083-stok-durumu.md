# 0083 · Stok durumu ve stok ayarları

## Amaç

Bir ürünün satılabilir olup olmadığı, tükenince ne olacağı, düşük stokta olup olmadığı ve müşteriye ne yazılacağı tek işlevle bulunur (temel paket: Stok).

Önce 0069 ve 0082 bitmiş olmalı.

## Olmazsa olmazlar

- Tükenen ürünün davranışı mağaza sahibinin ayarıdır: göster ama satma (varsayılan) ya da gizle. Gizlenen ürün vitrin listelerine girmez; görünürlük işlevi (0076) bunu hesaba katar.
- Düşük stok eşiği: genel ayar (varsayılan 5) ve ürün bazında eşik. Ürünün eşiği varsa o geçerlidir.
- "Son 3 ürün" gibi gösterim: eşiği mağaza sahibinin ayarıdır (varsayılan 5 ve altı). Metin metin dosyasındadır.
- Ayarlar `planlar/site-ayarlari.md` ile aynı varsayılanlarla şemaya girer.

## Sınırlar

- Düşük stok bildirimi e-postalar bölümüyle gelir.
- Vitrindeki gösterim vitrin bölümüyle gelir.
- Varyantlı ürünün genel stok durumu 0085'tedir (Katalog 2).

## Bitti sayılır

- İki ayar değerinde tükenmiş ürünün davranışı, ürün eşiği olan ve olmayan üründe düşük stok durumu testte doğru.
- Takibi kapalı ürün her zaman satılabilir.
- 0079'daki ilgili ürünler gizlenen tükenmiş ürünü getirmiyor.

## Durum

bitti
