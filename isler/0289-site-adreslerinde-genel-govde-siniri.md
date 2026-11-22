# 0289 · Site adreslerinde genel gövde sınırı

## Amaç

Kart 0094'te bulundu. Sunucudaki ön kapı yalnız hata izleme adresinin (1 MB) ve dosya yükleme adreslerinin (10 MB ve pay, karar 0165) gövdesini sınırlıyor. Site adreslerindeki öteki istekler (JSON uçları, panel ve vitrin) sınırsız gövdeyle kutuya ulaşıyor. Kapı da JSON gövdeyi sınırsız okuyor (`istek.text()`, `cekirdek/kapi/uc.ts`). Büyük bir gövde, istek sınırı dolmadan kutunun belleğini doldurabilir.

## Olmazsa olmazlar

- Önce ölçülür: panelin ve vitrinin gönderdiği en büyük gerçek gövde (ürün açıklaması, vitrin bölümü, elle sipariş) ölçülür.
- Ön kapıya yükleme yolları dışında genel bir gövde sınırı konur, değeri ölçümle seçilir ve karar kaydına yazılır.
- Kapı JSON gövdeyi aynı sınırla okur. Bildirilen uzunluk sınırı aşarsa gövdeyi okumaz, okurken aşılırsa keser (dosya gövdesinin yolu, karar 0165).
- Sınırı aşan istek kodla döner, ekran anlaşılır metin gösterir.

## Sınırlar

- Dosya yükleme sınırı değişmez.

## Bitti sayılır

- En büyük gerçek gövde ölçüldü, sınır onun üstünde.
- Sınırı aşan JSON gövdesi kapıda ve ön kapıda reddediliyor; testte ve gerçek Caddy ile ölçüldü.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
