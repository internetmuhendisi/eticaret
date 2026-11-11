# 0106 · Seçenek seçiliyken fiyat filtresi seçili birleşimin fiyatına bakar

## Tarih

2026-11-12

## Karar

Ürün listesinde müşteri bir seçenek (beden, renk) seçmiş ve fiyat aralığı girmişse, fiyat filtresi ve fiyat sıralaması ürünün seçili seçeneklere uyan birleşimlerinin fiyatına bakar. "Stoktakiler" de seçiliyse yalnız stoktaki birleşimlere bakar. Seçenek seçilmemişse bugünkü gibi kartta görünen en düşük fiyat geçerlidir (karar 0105). Kullanıcı kararıdır; işi kart 0153'tür.

## Neden

Müşteri S beden arıyorsa ve en az 500 TL yazmışsa, S'si 1.000 TL olan tişörtü görmek ister; M'sinin 300 TL olması onu ilgilendirmez. Bugünkü kural (en düşük fiyat) bu ürünü listeden düşürür.

## Düşünülen diğer yollar

- **Bugünkü kural, her zaman kartın en düşük fiyatı:** Basit ve kartta yazanla aynıdır, ama seçenek seçen müşteriye ters gelir (kart 0136'nın bağımsız kontrolü).
- **Ürünün herhangi bir birleşiminin fiyatı aralıktaysa:** Seçili bedenle ilgisiz bir birleşim yüzünden ürün gelir; aynı ters sonucun öbür yüzüdür.

## Sonuçları

- Fiyat birim başına hesaplanır; kartın fiyat işleviyle (fiyat/gosterim.ts) aynı hesap birleşim birleşim yapılır.
- Kartta görünen fiyat aralığı değişmez; filtrede kullanılan fiyat seçili birleşimin fiyatı olabilir.
