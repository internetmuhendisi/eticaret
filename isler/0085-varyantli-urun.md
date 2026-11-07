# 0085 · Varyantlı ürün

## Amaç

Beden ve renk gibi seçenekleri olan ürünlerin her birleşimi ayrı satılır (temel paket: Ürün).

Bölüm: Katalog 2. Önce 0084 bitmiş olmalı.

## Olmazsa olmazlar

- Ürüne seçenekler (beden, renk gibi) ve değerleri tanımlanır. Seçenek adları sitenin kendi verisidir, kodda yazmaz.
- Her birleşim bir satılabilir birimdir: kendi stok kodu, barkodu ve ağırlığı olur. Fiyat (0080) ve stok (0082) basit üründeki gibi birime bağlanır.
- Aynı birleşim iki kez tanımlanamaz.
- Değeri silinen birleşim silinmiş olarak işaretlenir, geçmiş siparişleri bozmaz.
- Gösterilecek fiyat (0081) varyantlı üründe en düşük ve en yüksek fiyat aralığını verir.
- Stok durumu (0083) her birimde ayrı bulunur, ürünün genel durumu birimlerden çıkar.
- Örnek Mağaza'ya beden ve renk seçenekli örnek ürünler eklenir (Giyim: tişört, sweatshirt), `KURALLAR.md` tablosu güncellenir.
- Varyant değişiklikleri değişiklik kaydına yazılır.

## Sınırlar

- Varyant görseli 0087'dedir; bu kart görsele yalnız bağlantı yerini açar.
- Vitrinde seçenek seçimi vitrin bölümüyle gelir.

## Bitti sayılır

- İki seçenekli bir üründe her birleşim kendi stok koduyla kaydediliyor.
- Aynı birleşim ve aynı stok kodu reddediliyor.
- Basit ürün ile varyantlı ürün aynı satılabilir birim yapısını kullanıyor, fiyat ve stok işlevleri değişmeden çalışıyor.
- Fiyat aralığı ve genel stok durumu testte doğru.

## Durum

yapılacak
