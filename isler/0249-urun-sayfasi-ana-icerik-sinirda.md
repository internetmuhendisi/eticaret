# 0249 · Ürün sayfasının ana içeriği hız sınırında

## Amaç

Hız ölçümünde ürün sayfasının ana içeriği 2,5 saniyelik sınırın hemen altında ve üstünde gidip geliyor. Hatta 2492 ms (44312616772) ve 2484 ms (44528927734) ile geçti. Kart 0248'in yerel ölçümünde (hattın koşulu, iki işlemci, temiz veritabanı) dört ölçümde 2516, 2516, 2480, 2480 ms çıktı. 2516 ms iki kez de işlemci yavaşlatması 2,3 kat ayarlandığında görüldü. Sayfanın kodu bu arada değişmedi (318 KB). Hat ara sıra bu yüzden kırmızıya düşebilir.

## Olmazsa olmazlar

- Ana içeriğin hangi öğe olduğu ve süresinin nereye gittiği (sunucu yanıtı, görsel, kod) ölçülür.
- Sayfa sınırın altına makul bir payla iner ya da ölçümün kararsızlığı (işlemci ayarı) ölçülerek düzeltilir.

## Sınırlar

- Sınır yükseltilmez, sayfa bilinen aşım listesine eklenmez (kullanıcı kararı olmadan).

## Bitti sayılır

- Ürün sayfası hattın koşulunda art arda beş ölçümde sınırın altında, ölçümler kartta yazılı.

## Durum

yapılacak
