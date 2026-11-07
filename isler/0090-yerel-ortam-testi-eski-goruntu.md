# 0090 · Yerel ortam denemesi eski görüntüyü sessizce kullanıyor

## Amaç

`pnpm yerel-ortam-testi`, çekirdek sürümüyle aynı etiketli bir görüntü varsa onu yeniden kullanıyor. Görüntü daha eski bir kayıttan üretilmişse deneme eski kodu ölçüp yeşil dönüyor. Ekrana "şu anki kodla: --goruntuyu-yenile" yazıyor, ama bu bayrağı yalnız `pnpm yerel-ortam-ac` kabul ediyor; `pnpm yerel-ortam-testi --goruntuyu-yenile` bayrağı yok sayıyor.

Kart 0070 sırasında görüldü (2026-11-07): sürüm 0.13.1'de kalırken kod değişti, deneme iki kez eski görüntüyle yeşil döndü. Görüntü `pnpm cekirdek-goruntusu` ile üretilince de çalışma klasörü değil son kayıt kullanılıyor. Kontrol hattı her seferinde temiz makinede görüntü ürettiği için hattı etkilemiyor, yerel doğrulamayı etkiliyor.

## Olmazsa olmazlar

- Deneme, kullandığı görüntünün hangi kayıttan üretildiğini o anki kayıtla karşılaştırır. Farklıysa ya yeniden üretir ya da açıkça durur.
- Ekrandaki öneri gerçekten çalışan bir komutu gösterir.
- Kaydedilmemiş değişiklik varken deneme, ölçtüğü kodun bu değişiklikleri içermediğini söyler.

## Sınırlar

- Kontrol hattının görüntü üretimi değişmez.

## Bitti sayılır

- Eski kayıttan üretilmiş görüntüyle deneme yeşil dönmüyor; bu bir testle ya da bilerek eski görüntüyle bir kez çalıştırılarak gösteriliyor.

## Durum

yapılacak
