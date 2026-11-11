# 0127 · Aynı işlemde eklenen ürünlerin "en yeni" sırası

## Amaç

"Yeni gelenler" bölümü ürünleri oluşturma zamanına göre sıralar. Başlangıç kataloğundaki bütün ürünler tek veritabanı işleminde yazıldığı için oluşturma zamanları aynıdır, sırayı rastgele kimlik belirler. Örnek Mağaza'da iki ayrı kurulumda bu bölümde farklı ürünler görüldü (kart 0115, ölçüldü), yeni eklenenler yerine eski ürünler çıkabiliyor.

Bölüm: Vitrin.

## Olmazsa olmazlar

- Aynı işlemde eklenen ürünlerde "en yeni" sırası dosyadaki sırayla tutarlı ve her kurulumda aynı olsun.
- Çözüm yalnız vitrin sırasını değil, aynı sırayı kullanan başka listeleri de hesaba katsın.

## Sınırlar

- Panelden tek tek eklenen ürünlerin sırası değişmez.

## Bitti sayılır

- Boş veritabanına iki ayrı kurulumda "yeni" kaynağı aynı ürünleri aynı sırayla veriyor, testte.

## Durum

bitti
