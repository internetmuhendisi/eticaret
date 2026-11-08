# 0086 · Ürün özellikleri

## Amaç

Site ürünlerine kendi ek alanlarını tanımlar (kumaş, malzeme, yazar gibi). Bu alanlar ileride filtrede ve ürün sayfasındaki özellik tablosunda kullanılır (temel paket: Ürün).

Bölüm: Katalog 2. Önce 0084 bitmiş olmalı.

## Olmazsa olmazlar

- Özellik tanımı: ad, değer türü, filtrede kullanılıp kullanılmayacağı, sıra. Değer türleri tek bir kayıt dosyasında durur.
- Ürüne her özellik için değer girilir. Değer türüne göre doğrulanır.
- Özellik adları sitenin verisidir, kodda yazmaz.
- Silinen özellik silinmiş olarak işaretlenir.
- Örnek Mağaza'nın örnek ürünlerine özellik değerleri eklenir.
- Değişiklikler değişiklik kaydına yazılır.

## Sınırlar

- Filtre ve özellik tablosu vitrin bölümüyle gelir.
- Varyant seçenekleri (beden, renk) 0085'tedir, özellik değildir.

## Bitti sayılır

- Türüne uymayan değer testte reddediliyor.
- Bir özelliğin bir değerine sahip ürünler tek sorguyla geliyor (filtrenin temeli).

## Durum

bitti
