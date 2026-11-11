# 0153 · Seçenek seçiliyken fiyat filtresi seçili birleşimin fiyatına baksın

## Amaç

Ürün listesinde fiyat filtresi ve fiyat sıralaması bugün ürünün kartta görünen en düşük fiyatına bakıyor (kart 0136, karar 0105). Müşteri bir beden seçmiş ve fiyat aralığı girmişse bu ters sonuç verir: Beden S seçili ve en az 500 yazılıyken, S'si 1.000, M'si 300 olan tişört listede çıkmaz. Kullanıcı kararı (karar 0106): seçenek seçiliyken fiyat, seçili seçeneklere uyan birleşimlerin fiyatıdır.

Bölüm: Vitrin. Kart 0136'nın bağımsız kontrolünde görüldü.

## Olmazsa olmazlar

- Seçenek seçiliyken bir ürün, seçili seçeneklere uyan (ve "stoktakiler" seçiliyse stoktaki) birleşimlerinden birinin fiyatı aralıktaysa gelir. Fiyat sıralaması da bu birleşimlerin en düşüğüne bakar.
- Seçenek seçilmemişse kural değişmez: kartta görünen en düşük fiyat.
- Birleşimin fiyatı kartın fiyat işleviyle (`fiyat/gosterim.ts`: vergi gösterimi, indirim) hesaplanır; SQL'de yeniden yazılmaz.
- Sorgu sayısı ürün sayısıyla artmaz.
- Seçeneğin yanındaki sayılar aynı kuralla hesaplanır.

## Sınırlar

- Kartın kendisinde gösterilen fiyat aralığı değişmez.

## Bitti sayılır

- Beden S ve fiyat aralığı seçiliyken S birleşiminin fiyatı aralıktaki ürün geliyor, yalnız başka bedeninin fiyatı aralıktaki ürün gelmiyor (gerçek veritabanıyla test).
- "Stoktakiler" ile tükenmiş birleşimin fiyatı sayılmıyor (test).
- Seçenek yokken eski sonuç değişmiyor (test).

## Durum

yapılacak
